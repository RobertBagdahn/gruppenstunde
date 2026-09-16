"""Canonical active ingredient context for meal calculations."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import TYPE_CHECKING

from supply.services.portion_resolution import resolve_trusted_weight

if TYPE_CHECKING:
    from planner.models import MealItem, MealItemOverride
    from recipe.models import Recipe, RecipeItem


@dataclass(frozen=True, slots=True)
class ActiveRecipeItem:
    """A recipe item after variant and override selection."""

    recipe_item: RecipeItem
    quantity: float
    weight_g: float | None


def resolve_active_recipe_items(
    recipe: Recipe,
    *,
    active_ids: set[int] | None = None,
    overrides: Iterable[MealItemOverride] | None = None,
) -> list[ActiveRecipeItem]:
    """Resolve recipe items using the same variant rules for all consumers."""
    selected_ids = active_ids or set()
    override_map = {override.recipe_item_id: override for override in (overrides or [])}
    result: list[ActiveRecipeItem] = []

    for recipe_item in recipe.recipe_items.select_related("portion", "portion__ingredient").all():
        portion = recipe_item.portion
        if portion is None or portion.deleted_at is not None:
            continue

        if recipe_item.exchange_group_id is not None:
            if selected_ids and recipe_item.id not in selected_ids:
                continue
            if not selected_ids and recipe_item.exchange_position != 0:
                continue
        elif selected_ids and recipe_item.is_optional and recipe_item.id not in selected_ids:
            continue

        override = override_map.get(recipe_item.id)
        if override and override.excluded:
            continue

        quantity = float(
            override.quantity_override if override and override.quantity_override is not None else recipe_item.quantity
        )
        # Only trusted weights may drive gram-based calculations; unresolved
        # piece weights (unknown/AI-proposed) contribute nothing.
        trusted_weight = resolve_trusted_weight(portion)
        weight_g = float(trusted_weight) * quantity if trusted_weight is not None else None
        result.append(ActiveRecipeItem(recipe_item=recipe_item, quantity=quantity, weight_g=weight_g))

    return result


def active_recipe_items(meal_item: MealItem) -> list[ActiveRecipeItem]:
    """Return active recipe ingredients with overrides applied.

    Non-optional items remain active by default. Exchange-group and optional
    items require an explicit active ID when a variant selection exists.
    Soft-deleted portions are omitted from all downstream calculations.
    """
    if not meal_item.recipe:
        return []

    return resolve_active_recipe_items(
        meal_item.recipe,
        active_ids=set(meal_item.active_recipe_item_ids or []),
        overrides=meal_item.overrides.all(),
    )
