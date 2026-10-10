"""Shared ingredient resolution for RecipeItem consumers."""

from __future__ import annotations

from typing import TYPE_CHECKING

from supply.choices import MeasuringUnitType

if TYPE_CHECKING:
    from recipe.models import RecipeItem
    from supply.models import Ingredient


def get_recipe_item_ingredient(item: RecipeItem) -> Ingredient | None:
    """Resolve the ingredient from the portion, or the direct link for gram items."""
    portion = item.portion
    if portion is not None:
        return portion.ingredient
    return item.ingredient


def get_recipe_item_weight_g(item: RecipeItem) -> float:
    """Return item weight in grams; portionless quantities are already grams."""
    if item.portion is None:
        return float(item.quantity or 0)

    from supply.services.portion_resolution import is_piece_like_name, resolve_trusted_weight

    portion = item.portion
    trusted_weight = resolve_trusted_weight(portion)
    if trusted_weight is not None:
        return float(item.quantity) * float(trusted_weight)

    if is_piece_like_name(portion.name):
        return 0.0

    if portion.measuring_unit:
        raw = float(item.quantity) * float(portion.quantity) * float(portion.measuring_unit.quantity)
        ingredient = get_recipe_item_ingredient(item)
        if ingredient and portion.measuring_unit.unit == MeasuringUnitType.VOLUME:
            raw *= getattr(ingredient, "physical_density", None) or 1.0
        return raw

    return 0.0
