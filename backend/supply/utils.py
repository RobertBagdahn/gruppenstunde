"""Shared formatting utilities for the supply and food domain."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supply.models.ingredient import Ingredient, Portion


def format_weight(grams: float) -> str:
    """Format a weight value (in grams) for German-locale display.

    Tiers:
        < 1g    → mg  (e.g. 300mg)
        1–9g    → 1g steps (e.g. 4g)
        10–99g  → 5g steps (e.g. 45g)
        100–999g → 10g steps (e.g. 150g)
        ≥ 1000g → kg with 1 decimal, comma separator (e.g. 1,5 kg)
    """
    if grams <= 0:
        return "0g"
    if grams < 1:
        mg = round(grams * 1000)
        return f"{mg}mg"
    if grams >= 1000:
        kg = grams / 1000
        # Always 1 decimal, German locale: dot → comma
        return f"{kg:.1f} kg".replace(".", ",")
    if grams >= 100:
        # Use conventional rounding (0.5 rounds up), not Python's banker's rounding
        rounded = math.floor(grams / 10 + 0.5) * 10
        return f"{int(rounded)}g"
    if grams >= 10:
        rounded = math.floor(grams / 5 + 0.5) * 5
        return f"{int(rounded)}g"
    return f"{round(grams)}g"


def _format_quantity(quantity: float) -> str:
    """Format a portion quantity for German-locale display.

    Whole numbers are shown without decimals; fractions use a comma,
    rounded to 1 decimal place.
    """
    rounded = round(quantity, 1)
    if rounded == int(rounded):
        return str(int(rounded))
    return f"{rounded:.1f}".replace(".", ",")


def build_portion_display(
    quantity: float,
    portion: Portion,
    ingredient: Ingredient | None = None,
) -> tuple[str, bool]:
    """Build the combined portion display string and missing-weight flag.

    Returns:
        (display_str, has_missing_weight)

    Format: "{quantity} {unit_name} {ingredient_name} ({weight})"
    Special cases:
        - measuring_unit.name == "Stück" → unit_name omitted
        - weight_g is None → no weight clause, has_missing_weight=True
        - ingredient.name missing → fall back to slug or portion.name
    """
    # Resolve ingredient name (with slug fallback)
    ingredient_name = ""
    if ingredient:
        ingredient_name = ingredient.name or ingredient.slug or ""
    if not ingredient_name and portion:
        ingredient_name = getattr(portion, "name", "") or ""

    # Resolve unit name – suppress "Stück"
    unit_name = ""
    if portion and portion.measuring_unit:
        mu_name = portion.measuring_unit.name or ""
        if mu_name.lower() != "stück":
            unit_name = mu_name

    # Compute total weight
    weight_g: float | None = None
    has_missing_weight = False
    if portion and portion.weight_g is not None:
        weight_g = quantity * portion.weight_g
    else:
        has_missing_weight = True

    # Build quantity string
    qty_str = _format_quantity(quantity)

    # Build display
    parts = [qty_str]
    if unit_name:
        parts.append(unit_name)
    if ingredient_name:
        parts.append(ingredient_name)

    base = " ".join(parts)

    if weight_g is not None:
        return f"{base} ({format_weight(weight_g)})", has_missing_weight
    return base, has_missing_weight


def get_shopping_portion(ingredient: Ingredient) -> Portion | None:
    """Get the most suitable portion for shopping list display.

    Returns the portion with the smallest weight_g that:
    - Is not deleted
    - Has weight_g > 0
    - Is not the 'g' base unit

    This is typically a reasonable "packung" (package) or similar portion
    that can be bought as a unit.
    """
    try:
        portion = (
            ingredient.portions.filter(
                deleted_at__isnull=True,
                weight_g__gt=0,
                is_system=False,
            )
            .order_by("weight_g")
            .first()
        )
        return portion
    except Exception:
        return None


def build_package_display(quantity_g: float, ingredient: Ingredient) -> str:
    """Build the package options string for a shopping list item.

    Finds the best portion for shopping (smallest with weight_g > 0, excluding 'g'),
    then calculates how many units are needed.

    Rounding rule:
        - Compute exact count = quantity_g / portion.weight_g
        - Always round up — better to buy slightly more than run short

    Returns empty string when no suitable portion exists.
    """
    if not quantity_g or quantity_g <= 0:
        return ""

    portion = get_shopping_portion(ingredient)
    if not portion or not portion.weight_g or portion.weight_g <= 0:
        return ""

    exact = quantity_g / portion.weight_g
    # Always round up — better to buy slightly more than run short
    count = math.ceil(exact)

    if count <= 0:
        return ""

    pkg_label = format_weight(portion.weight_g)
    return f"{count}×{pkg_label}"
