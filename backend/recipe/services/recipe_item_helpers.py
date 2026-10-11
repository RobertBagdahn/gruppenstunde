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


def get_recipe_item_standard_measure_key(item: RecipeItem) -> str:
    """The item's standard measure key ("" when it is a portion/gram item)."""
    return getattr(item, "standard_measure_key", "") or ""


def resolve_recipe_item_grams(item: RecipeItem, quantity: float | None = None) -> float | None:
    """Trusted grams of a recipe item, or None when the weight is unknown.

    `quantity` overrides the stored count (same unit). Standard measures are
    resolved via `supply.services.quantity_units.resolve_grams`; portionless
    quantities are grams; portions need a trusted weight.
    """
    count = float(item.quantity if quantity is None else quantity)
    standard_key = get_recipe_item_standard_measure_key(item)
    if standard_key:
        from supply.services.quantity_units import resolve_grams

        result = resolve_grams(
            ingredient=get_recipe_item_ingredient(item),
            quantity=count,
            portion=None,
            standard_measure_key=standard_key,
            measuring_unit=None,
        )
        if result is None or result.missing:
            return None
        return result.grams
    if item.portion is None:
        return count

    from supply.services.portion_resolution import resolve_trusted_weight

    trusted_weight = resolve_trusted_weight(item.portion)
    return count * float(trusted_weight) if trusted_weight is not None else None


def is_recipe_item_weight_approx(item: RecipeItem) -> bool:
    """True when the item's grams are an estimate (standard measure without explicit density)."""
    standard_key = get_recipe_item_standard_measure_key(item)
    if not standard_key or not item.quantity:
        return False
    from supply.services.quantity_units import resolve_grams

    result = resolve_grams(
        ingredient=get_recipe_item_ingredient(item),
        quantity=float(item.quantity),
        portion=None,
        standard_measure_key=standard_key,
        measuring_unit=None,
    )
    return bool(result and result.is_approx and not result.missing)


def get_recipe_item_weight_g(item: RecipeItem) -> float:
    """Return item weight in grams; portionless quantities are already grams."""
    if get_recipe_item_standard_measure_key(item):
        return resolve_recipe_item_grams(item) or 0.0
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
