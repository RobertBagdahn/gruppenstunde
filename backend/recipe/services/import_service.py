"""Service to import recipes from external URLs.

Supports:
- Schema.org JSON-LD Recipe markup (generic, works on most recipe sites)
- Chefkoch.de ingredient table (preferred for ingredients) and fallback scraping
"""

import json
import logging
import re
import socket
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from core.services.url_safety import (
    hostname_is_blocked,
    is_blocked_address,
    resolve_public_addresses,
)
from recipe.data.ingredient_line_vocabulary import unit_display
from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError
from recipe.services.ingredient_line import ParsedLine, parse_cells, parse_line

logger = logging.getLogger(__name__)


@dataclass
class ImportedIngredient:
    name: str
    quantity: str = ""
    unit: str = ""
    # Structured parse of the source line; None for sources that only deliver a name.
    parsed: ParsedLine | None = None


@dataclass
class ImportedRecipe:
    title: str = ""
    description: str = ""
    servings: int | None = None
    ingredients: list[ImportedIngredient] = field(default_factory=list)
    steps: list[str] = field(default_factory=list)
    image_url: str = ""
    source_url: str = ""
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None


def import_from_url(url: str) -> ImportedRecipe:
    """Fetch and parse a recipe from a URL."""
    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise ValueError("Ungültige Rezept-URL")
    _validate_public_hostname(parsed_url.hostname)

    try:
        # Many recipe sites (e.g. chefkoch.de) block requests that look like
        # bots. Send realistic browser headers to retrieve publicly available
        # recipe pages.
        browser_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            ),
            "Accept": ("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"),
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
            "Connection": "keep-alive",
        }
        with httpx.Client(
            follow_redirects=False,
            timeout=15.0,
            headers=browser_headers,
        ) as client:
            current_url = url
            response = None
            for _ in range(4):
                _validate_public_hostname(urlparse(current_url).hostname)
                response = client.get(current_url)
                if response.status_code not in {301, 302, 303, 307, 308}:
                    break
                location = response.headers.get("location")
                if not location:
                    break
                current_url = str(response.url.join(location))
            if response is None:
                raise SourceUnreachableError("Seite konnte nicht geladen werden.")
            response.raise_for_status()
            _validate_public_hostname(urlparse(str(response.url)).hostname)
    except httpx.HTTPError as e:
        raise SourceUnreachableError(f"Seite konnte nicht geladen werden: {e}") from e

    return parse_recipe_html(response.text, url)


def parse_recipe_html(html: str, url: str) -> ImportedRecipe:
    """Parse a fetched recipe page: JSON-LD first, then site-specific and microdata fallbacks."""
    parsed_url = urlparse(url)
    soup = BeautifulSoup(html, "html.parser")
    is_chefkoch = bool(parsed_url.hostname and parsed_url.hostname.lower().endswith("chefkoch.de"))

    # Try Schema.org JSON-LD first
    recipe = _parse_json_ld(soup, url)
    if is_chefkoch:
        # The ingredient table keeps amount, name and properties in separate cells, which is
        # more reliable than re-parsing the flattened JSON-LD strings. Pages in Chefkoch's
        # newer layout ship no JSON-LD at all.
        table_ingredients = _parse_chefkoch_table(soup)
        if table_ingredients:
            if recipe is None:
                recipe = _parse_chefkoch(soup, url) or ImportedRecipe(source_url=url)
                if not recipe.title:
                    title_element = soup.find("h1")
                    recipe.title = title_element.get_text(strip=True) if title_element else ""
            recipe.ingredients = table_ingredients
    if recipe and recipe.title and (recipe.ingredients or recipe.steps):
        return recipe

    # Fallback: Chefkoch-specific
    if is_chefkoch:
        recipe = _parse_chefkoch(soup, url)
        if recipe and recipe.title and (recipe.ingredients or recipe.steps):
            return recipe

    # Last resort: try microdata
    recipe = _parse_microdata(soup, url)
    if recipe and recipe.title and (recipe.ingredients or recipe.steps):
        return recipe

    raise NoRecipeFoundError("Kein Rezept auf dieser Seite gefunden")


def _parse_json_ld(soup: BeautifulSoup, url: str) -> ImportedRecipe | None:
    """Parse Schema.org JSON-LD Recipe."""
    scripts = soup.find_all("script", {"type": "application/ld+json"})

    candidates: list[ImportedRecipe] = []
    for script in scripts:
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        for item in _iter_json_ld_nodes(data):
            if _is_recipe(item):
                candidates.append(_json_ld_to_recipe(item, url))

    return max(candidates, key=lambda candidate: (bool(candidate.ingredients), len(candidate.steps)), default=None)


def _is_recipe(data: dict) -> bool:
    if not isinstance(data, dict):
        return False
    t = data.get("@type", "")
    if isinstance(t, list):
        return any(str(value).rsplit("/", 1)[-1] == "Recipe" for value in t)
    return str(t).rsplit("/", 1)[-1] == "Recipe"


def _iter_json_ld_nodes(data: object):
    """Yield object nodes from common JSON-LD document shapes."""
    if isinstance(data, list):
        for item in data:
            yield from _iter_json_ld_nodes(item)
    elif isinstance(data, dict):
        graph = data.get("@graph")
        if graph is not None:
            yield from _iter_json_ld_nodes(graph)
        yield data


def _json_ld_to_recipe(data: dict, url: str) -> ImportedRecipe:
    """Convert JSON-LD recipe to our dataclass."""
    recipe = ImportedRecipe(source_url=url)
    recipe.title = data.get("name", "")
    recipe.description = data.get("description", "")

    # Servings
    yield_val = data.get("recipeYield", "")
    if isinstance(yield_val, list):
        yield_val = yield_val[0] if yield_val else ""
    servings_match = re.search(r"\d+", str(yield_val))
    if servings_match:
        recipe.servings = max(int(servings_match.group()), 1)

    # Image
    image = data.get("image", "")
    if isinstance(image, list):
        image = image[0] if image else ""
    if isinstance(image, dict):
        image = image.get("url") or image.get("contentUrl") or image.get("@id", "")
    recipe.image_url = image

    # Ingredients
    ingredients = data.get("recipeIngredient", [])
    if isinstance(ingredients, str):
        ingredients = [ingredients]
    if isinstance(ingredients, list):
        for ing_str in ingredients:
            if isinstance(ing_str, str) and ing_str.strip():
                recipe.ingredients.append(_parse_ingredient_string(ing_str))

    # Steps
    instructions = data.get("recipeInstructions", [])
    if isinstance(instructions, str):
        recipe.steps = [s.strip() for s in instructions.split("\n") if s.strip()]
    elif isinstance(instructions, list):
        for item in instructions:
            if isinstance(item, str):
                recipe.steps.append(item.strip())
            elif isinstance(item, dict):
                text = item.get("text", "")
                if text:
                    recipe.steps.append(text.strip())
                else:
                    for nested in item.get("itemListElement", []):
                        if isinstance(nested, dict) and nested.get("text"):
                            recipe.steps.append(str(nested["text"]).strip())

    # Times
    recipe.prep_time_minutes = _parse_duration(data.get("prepTime"))
    recipe.cook_time_minutes = _parse_duration(data.get("cookTime"))

    if not recipe.description and isinstance(data.get("abstract"), str):
        recipe.description = data["abstract"]

    return recipe


def _parse_chefkoch(soup: BeautifulSoup, url: str) -> ImportedRecipe | None:
    """Fallback parser for chefkoch.de."""
    recipe = ImportedRecipe(source_url=url)

    title_el = soup.find("h1")
    if title_el:
        recipe.title = title_el.get_text(strip=True)

    recipe.description = _text_value(soup.find(itemprop="description"))
    image_element = soup.find(itemprop="image")
    if image_element:
        recipe.image_url = str(image_element.get("content") or image_element.get("src") or "")

    recipe.ingredients = [
        _parse_ingredient_string(element.get_text(" ", strip=True))
        for element in soup.find_all(itemprop="recipeIngredient")
        if element.get_text(strip=True)
    ]

    recipe.steps = [
        element.get_text(" ", strip=True)
        for element in soup.find_all(itemprop="recipeInstructions")
        if element.get_text(strip=True)
    ]

    yield_element = soup.find(itemprop="recipeYield")
    if yield_element:
        servings_match = re.search(r"\d+", yield_element.get_text(" ", strip=True))
        if servings_match:
            recipe.servings = max(int(servings_match.group()), 1)

    recipe.prep_time_minutes = _parse_duration_value(soup.find(itemprop="prepTime"))
    recipe.cook_time_minutes = _parse_duration_value(soup.find(itemprop="cookTime"))

    return recipe if recipe.title else None


def _parse_chefkoch_table(soup: BeautifulSoup) -> list[ImportedIngredient]:
    """Ingredients from Chefkoch's ingredient table: amount cell, name and properties."""
    ingredients: list[ImportedIngredient] = []
    for row in soup.select("tr.ds-ingredients-table__tr"):
        cells = row.find_all("td")
        name_element = row.select_one(".ds-ingredients-table__ingredient-name")
        if len(cells) < 2 or name_element is None:
            continue
        properties_element = row.select_one(".ds-ingredients-table__ingredient-properties")
        parsed = parse_cells(
            cells[0].get_text(" ", strip=True),
            name_element.get_text(" ", strip=True),
            properties_element.get_text(" ", strip=True) if properties_element else "",
        )
        if parsed.name:
            ingredients.append(_imported_from_parsed(parsed))
    return ingredients


def _parse_microdata(soup: BeautifulSoup, url: str) -> ImportedRecipe | None:
    """Fallback: parse microdata itemtype=Recipe."""
    recipe_el = soup.find(itemtype=re.compile(r"schema.org/Recipe"))
    if not recipe_el:
        return None

    recipe = ImportedRecipe(source_url=url)

    name_el = recipe_el.find(itemprop="name")
    if name_el:
        recipe.title = name_el.get_text(strip=True)

    description_el = recipe_el.find(itemprop="description")
    recipe.description = _text_value(description_el)
    image_el = recipe_el.find(itemprop="image")
    if image_el:
        recipe.image_url = str(image_el.get("content") or image_el.get("src") or "")

    for ing_el in recipe_el.find_all(itemprop="recipeIngredient"):
        recipe.ingredients.append(_parse_ingredient_string(ing_el.get_text(strip=True)))

    instruction_elements = recipe_el.find_all(itemprop="recipeInstructions")
    recipe.steps = [
        element.get_text(" ", strip=True) for element in instruction_elements if element.get_text(strip=True)
    ]

    yield_el = recipe_el.find(itemprop="recipeYield")
    if yield_el:
        servings_match = re.search(r"\d+", yield_el.get_text(" ", strip=True))
        if servings_match:
            recipe.servings = max(int(servings_match.group()), 1)

    return recipe if recipe.title else None


def _parse_ingredient_string(s: str) -> ImportedIngredient:
    """Parse a free-text ingredient string like '200 g Mehl'."""
    return _imported_from_parsed(parse_line(s))


def _imported_from_parsed(parsed: ParsedLine) -> ImportedIngredient:
    name = parsed.query or parsed.source_line
    # The size ("große") is part of the amount, not of the name.
    note = ", ".join(part for part in parsed.note.split(", ") if part and part != parsed.size_word)
    if note:
        name = f"{name} ({note})"
    quantity = f"{parsed.quantity:g}" if parsed.quantity else ""
    return ImportedIngredient(name=name, quantity=quantity, unit=unit_display(parsed.unit), parsed=parsed)


def _validate_public_hostname(hostname: str | None) -> None:
    """Reject loopback, private, link-local, and metadata destinations."""
    if not hostname:
        raise ValueError("Ungültige Rezept-URL")
    if hostname_is_blocked(hostname):
        raise ValueError("Diese Rezept-URL ist nicht zulässig")
    try:
        addresses = resolve_public_addresses(hostname.lower().rstrip("."))
    except socket.gaierror as exc:
        raise SourceUnreachableError("Die Seite konnte nicht geladen werden.") from exc
    if any(is_blocked_address(address) for address in addresses):
        raise ValueError("Diese Rezept-URL ist nicht zulässig")


def _parse_duration(iso_str: str | None) -> int | None:
    """Parse ISO 8601 duration to minutes."""
    if not iso_str:
        return None
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?", iso_str)
    if match:
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        return hours * 60 + minutes
    return None


def _parse_duration_value(element) -> int | None:
    """Parse a duration from a microdata element's datetime or text value."""
    if element is None:
        return None
    value = element.get("datetime") or element.get_text(strip=True)
    return _parse_duration(value)


def _text_value(element) -> str:
    if element is None:
        return ""
    return str(element.get("content") or element.get_text(" ", strip=True))
