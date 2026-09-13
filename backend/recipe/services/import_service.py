"""Service to import recipes from external URLs.

Supports:
- Schema.org JSON-LD Recipe markup (generic, works on most recipe sites)
- Chefkoch.de fallback scraping
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
from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError

logger = logging.getLogger(__name__)


@dataclass
class ImportedIngredient:
    name: str
    quantity: str = ""
    unit: str = ""


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
        with httpx.Client(
            follow_redirects=False,
            timeout=15.0,
            headers={"User-Agent": "Mozilla/5.0 (compatible; InspiBot/1.0)"},
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

    soup = BeautifulSoup(response.text, "html.parser")

    # Try Schema.org JSON-LD first
    recipe = _parse_json_ld(soup, url)
    if recipe and recipe.title and (recipe.ingredients or recipe.steps):
        return recipe

    # Fallback: Chefkoch-specific
    if parsed_url.hostname and parsed_url.hostname.lower().endswith("chefkoch.de"):
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
    s = s.strip()
    # Pattern: optional quantity, optional unit, name
    quantity_match = re.match(r"^(\d+(?:[\.,]\d+)?)(?:\s+|$)(.*)$", s)
    if quantity_match:
        quantity = quantity_match.group(1).replace(",", ".")
        remainder = quantity_match.group(2).strip()
        unit_match = re.match(
            r"^(kg|ml|g|l|EL|TL|Stück|Stk\.?|Prise|Bund|Dosen?|Becher|Packungen?|Scheiben?)(?:\s+|$)(.*)$",
            remainder,
            re.IGNORECASE,
        )
        if unit_match:
            unit = unit_match.group(1)
            name = unit_match.group(2).strip() or unit
        else:
            unit = ""
            name = remainder
        return ImportedIngredient(quantity=quantity, unit=unit, name=name)
    return ImportedIngredient(name=s)


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
