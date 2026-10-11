"""Recipe ingredient amounts for printed recipes, matching the food frontend.

Mirror of ``formatQuantity`` (``frontend-food/src/lib/unitConversion.ts``) and
``formatScaledRecipeAmount`` / ``formatStepIngredientLabel``
(``frontend-food/src/lib/ingredientAmount.ts``): a natural portion reads as
"0,35 Portion (18 g)", everything else as grams, and beverages with a known
density as millilitres, the same as the recipe ingredient list and step chips.
"""

from __future__ import annotations

import math
import re
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING, NamedTuple

from supply.choices import PhysicalViscosityChoices

if TYPE_CHECKING:
    from recipe.models import RecipeItem
    from supply.models import Ingredient

UNIT_SHORT: dict[str, str] = {
    "Esslöffel": "EL",
    "Teelöffel": "TL",
    "Kilogramm": "kg",
    "Gramm": "g",
    "Milliliter": "ml",
    "Liter": "l",
    "Prise": "Pr.",
    "Tasse": "Tasse",
    "Messerspitze": "Msp.",
    "Schuss": "Schuss",
}

_BASE_METRIC_UNIT_NAMES = frozenset({"Gramm", "g", "kg", "Kilogramm", "Milliliter", "ml", "Liter", "l"})
_GRAM_PORTION_NAME_RE = re.compile(r"^(?:\d+(?:[.,]\d+)?\s*)?(?:g|kg|ml|l)\b", re.IGNORECASE)
_PRE_WEIGHED_NAME_RE = re.compile(r"^\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b", re.IGNORECASE)
_NAMED_COUNT_RE = re.compile(r"^(\d+(?:[.,]\d+)?)\s+(.*)$")

MISSING_AMOUNT = "—"


class RecipeAmount(NamedTuple):
    """Amount with its unit ("0,35 Portion", "200 g") and the grams when not already metric."""

    primary: str
    secondary: str | None


def _round_half_up(value: float, step: float = 1) -> float:
    """``Math.round`` semantics (0.5 rounds up) on a step grid."""
    return math.floor(value / step + 0.5) * step


def _format_german(value: float, max_decimals: int, *, grouping: bool) -> str:
    """German number like ``toLocaleString('de-DE')``: comma decimals, no trailing zeros."""
    rounded = Decimal(repr(value)).quantize(Decimal(1).scaleb(-max_decimals), rounding=ROUND_HALF_UP)
    text = f"{rounded:,f}" if grouping else f"{rounded:f}"
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text.replace(",", "\u0000").replace(".", ",").replace("\u0000", ".")


def _smart_round(value: float) -> float:
    if value <= 0:
        return 0
    if value < 1:
        rounded = _round_half_up(value * 10) / 10
        return rounded if rounded > 0 else 0.1
    if value < 50:
        return _round_half_up(value)
    if value < 100:
        return _round_half_up(value, 5)
    if value < 1000:
        return _round_half_up(value, 10)
    return _round_half_up(value, 50)


def _format_number(value: float) -> str:
    if value == int(value):
        return str(int(value))
    return _format_german(value, 1, grouping=True)


def _format_weight(grams: float) -> str:
    if 0 < grams < 1:
        return f"{int(_round_half_up(grams * 1000))} mg"
    rounded = _smart_round(grams)
    if rounded >= 1000:
        return f"{_format_number(rounded / 1000)} kg"
    return f"{_format_number(rounded)} g"


def _format_volume(milliliters: float) -> str:
    rounded = _smart_round(milliliters)
    if rounded >= 1000:
        return f"{_format_number(rounded / 1000)} l"
    return f"{_format_number(rounded)} ml"


def format_display_quantity(grams: float, viscosity: str | None, density: float | None) -> str:
    """Grams in the display unit of the ingredient: beverages with a density as ml/l, else g/kg."""
    if grams <= 0:
        return "0 g"
    if viscosity == PhysicalViscosityChoices.BEVERAGE and density and density > 0:
        return _format_volume(grams / density)
    return _format_weight(grams)


def is_gram_portion(portion_name: str | None, unit_name: str | None) -> bool:
    """A portion is metric when its name is a plain metric amount ("Gramm", "100g Reis")."""
    if not portion_name:
        return (unit_name or "") in _BASE_METRIC_UNIT_NAMES
    return portion_name in _BASE_METRIC_UNIT_NAMES or bool(_GRAM_PORTION_NAME_RE.match(portion_name))


def short_unit(name: str) -> str:
    return UNIT_SHORT.get(name, name)


def format_count(value: float) -> str:
    return _format_german(value, 2 if value < 1 else 1, grouping=True)


def format_portion_amount(amount: float, portion_name: str) -> str:
    """Portion count with its name: "2 Scheiben" scales a named count, "100g Reis" reads as a multiple."""
    if _PRE_WEIGHED_NAME_RE.match(portion_name):
        return f"{format_count(amount)} × {portion_name}"
    match = _NAMED_COUNT_RE.match(portion_name)
    count = amount * float(match.group(1).replace(",", ".")) if match else amount
    name = match.group(2) if match else portion_name
    return f"{format_count(count)} {name}"


def format_scaled_recipe_amount(
    *,
    quantity: float | None,
    weight_g: float | None,
    portion_name: str | None,
    measuring_unit_name: str | None = None,
    unit_short: str | None = None,
    viscosity: str | None = None,
    density: float | None = None,
    scale: float = 1.0,
) -> RecipeAmount:
    """Amount of a recipe item or its share in a step for ``scale`` servings.

    ``quantity`` is a portion count for portion items and grams for direct-gram items.
    """
    scaled_quantity = (quantity or 0) * scale
    scaled_weight_g = (weight_g or 0) * scale
    grams = format_display_quantity(scaled_weight_g, viscosity, density) if scaled_weight_g > 0 else None
    name = portion_name or None

    if name and scaled_quantity > 0 and not is_gram_portion(name, measuring_unit_name):
        return RecipeAmount(format_portion_amount(scaled_quantity, short_unit(name)), grams)
    if grams is not None:
        return RecipeAmount(grams, None)

    unit_name = unit_short or measuring_unit_name
    if scaled_quantity > 0 and unit_name:
        return RecipeAmount(f"{format_count(scaled_quantity)} {short_unit(unit_name)}", None)
    return RecipeAmount(MISSING_AMOUNT, None)


def format_amount_label(amount: RecipeAmount, name: str) -> str:
    """Amount and name as in a step chip: "0,35 Portion (18 g) Sojagranulat"."""
    if amount.primary == MISSING_AMOUNT:
        amount_text = ""
    elif amount.secondary:
        amount_text = f"{amount.primary} ({amount.secondary})"
    else:
        amount_text = amount.primary
    return " ".join(part for part in (amount_text, name) if part)


def format_recipe_item_amount(
    recipe_item: RecipeItem,
    ingredient: Ingredient | None,
    *,
    scale: float = 1.0,
    quantity_modifier: float = 1.0,
) -> RecipeAmount:
    """Scaled amount of a recipe item (or its ``quantity_modifier`` share in a step)."""
    from recipe.services.recipe_item_helpers import get_recipe_item_weight_g
    from supply.services.quantity_units import portion_label

    portion = recipe_item.portion
    weight_g = get_recipe_item_weight_g(recipe_item)
    return format_scaled_recipe_amount(
        quantity=float(recipe_item.quantity or 0) * quantity_modifier,
        weight_g=weight_g * quantity_modifier if weight_g > 0 else None,
        portion_name=portion.name if portion is not None else None,
        measuring_unit_name=portion.measuring_unit.name if portion is not None and portion.measuring_unit else None,
        unit_short="g" if portion is None else portion_label(portion),
        viscosity=ingredient.physical_viscosity if ingredient else None,
        density=ingredient.physical_density if ingredient else None,
        scale=scale,
    )
