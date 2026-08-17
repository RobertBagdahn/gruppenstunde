"""Canonical active ingredient context for meal calculations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealItem
    from recipe.models import RecipeItem


@dataclass(frozen=True, slots=True)
class ActiveRecipeItem:
    """A recipe item after variant and override selection."""

    recipe_item: RecipeItem
    quantity: float
    weight_g: float | None


def active_recipe_items(meal_item: MealItem) -> list[ActiveRecipeItem]:
    """Return active recipe ingredients with overrides applied.

    Non-optional items remain active by default. Exchange-group and optional
    items require an explicit active ID when a variant selection exists.
    Soft-deleted portions are omitted from all downstream calculations.
    """
    if not meal_item.recipe:
        return []

    active_ids = set(meal_item.active_recipe_item_ids or [])
    overrides = {override.recipe_item_id: override for override in meal_item.overrides.all()}
    result: list[ActiveRecipeItem] = []

    recipe_items = meal_item.recipe.recipe_items.select_related("portion").all()
    for recipe_item in recipe_items:
        portion = recipe_item.portion
        if portion is None or portion.deleted_at is not None:
            continue

        if active_ids and (recipe_item.exchange_group_id is not None or recipe_item.is_optional):
            if recipe_item.id not in active_ids:
                continue

        override = overrides.get(recipe_item.id)
        if override and override.excluded:
            continue

        quantity = float(
            override.quantity_override
            if override and override.quantity_override is not None
            else recipe_item.quantity
        )
        weight_g = float(portion.weight_g) * quantity if portion.weight_g is not None else None
        result.append(ActiveRecipeItem(recipe_item=recipe_item, quantity=quantity, weight_g=weight_g))

    return result
