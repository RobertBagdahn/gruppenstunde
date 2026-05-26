"""Service to import recipes from external URLs.

Supports:
- Schema.org JSON-LD Recipe markup (generic, works on most recipe sites)
- Chefkoch.de fallback scraping
"""

import json
import logging
import re
from dataclasses import dataclass, field

import httpx
from bs4 import BeautifulSoup

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
    servings: int = 4
    ingredients: list[ImportedIngredient] = field(default_factory=list)
    steps: list[str] = field(default_factory=list)
    image_url: str = ""
    source_url: str = ""
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None


def import_from_url(url: str) -> ImportedRecipe:
    """Fetch and parse a recipe from a URL."""
    response = httpx.get(
        url,
        follow_redirects=True,
        timeout=15.0,
        headers={"User-Agent": "Mozilla/5.0 (compatible; InspiBot/1.0)"},
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Try Schema.org JSON-LD first
    recipe = _parse_json_ld(soup, url)
    if recipe and recipe.title:
        return recipe

    # Fallback: Chefkoch-specific
    if "chefkoch.de" in url:
        recipe = _parse_chefkoch(soup, url)
        if recipe and recipe.title:
            return recipe

    # Last resort: try microdata
    recipe = _parse_microdata(soup, url)
    if recipe and recipe.title:
        return recipe

    raise ValueError("Kein Rezept auf dieser Seite gefunden")


def _parse_json_ld(soup: BeautifulSoup, url: str) -> ImportedRecipe | None:
    """Parse Schema.org JSON-LD Recipe."""
    scripts = soup.find_all("script", {"type": "application/ld+json"})

    for script in scripts:
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        # Handle @graph arrays
        if isinstance(data, list):
            for item in data:
                if _is_recipe(item):
                    return _json_ld_to_recipe(item, url)
        elif isinstance(data, dict):
            if "@graph" in data:
                for item in data["@graph"]:
                    if _is_recipe(item):
                        return _json_ld_to_recipe(item, url)
            elif _is_recipe(data):
                return _json_ld_to_recipe(data, url)

    return None


def _is_recipe(data: dict) -> bool:
    t = data.get("@type", "")
    if isinstance(t, list):
        return "Recipe" in t
    return t == "Recipe"


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
        recipe.servings = int(servings_match.group())

    # Image
    image = data.get("image", "")
    if isinstance(image, list):
        image = image[0] if image else ""
    if isinstance(image, dict):
        image = image.get("url", "")
    recipe.image_url = image

    # Ingredients
    for ing_str in data.get("recipeIngredient", []):
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

    # Times
    recipe.prep_time_minutes = _parse_duration(data.get("prepTime"))
    recipe.cook_time_minutes = _parse_duration(data.get("cookTime"))

    return recipe


def _parse_chefkoch(soup: BeautifulSoup, url: str) -> ImportedRecipe | None:
    """Fallback parser for chefkoch.de."""
    # Chefkoch usually has JSON-LD, but as fallback:
    recipe = ImportedRecipe(source_url=url)

    title_el = soup.find("h1")
    if title_el:
        recipe.title = title_el.get_text(strip=True)

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

    for ing_el in recipe_el.find_all(itemprop="recipeIngredient"):
        recipe.ingredients.append(_parse_ingredient_string(ing_el.get_text(strip=True)))

    return recipe if recipe.title else None


def _parse_ingredient_string(s: str) -> ImportedIngredient:
    """Parse a free-text ingredient string like '200 g Mehl'."""
    s = s.strip()
    # Pattern: optional quantity, optional unit, name
    match = re.match(
        r"^(\d+[\.,]?\d*)\s*(g|kg|ml|l|EL|TL|Stk?\.?|Prise|Bund|Dose[n]?|Becher|Packung|Scheibe[n]?)?\s*(.+)$",
        s,
        re.IGNORECASE,
    )
    if match:
        return ImportedIngredient(
            quantity=match.group(1).replace(",", "."),
            unit=match.group(2) or "",
            name=match.group(3).strip(),
        )
    return ImportedIngredient(name=s)


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
