"""Helpers for variant meal items with active_recipe_item_ids.

Replaces split_service.py: instead of computing included fractions from
MealItemSplit rows, each variant meal item stores its active RecipeItem IDs
directly. The factor on the item scales the result to the actual portion count.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealItem
    from recipe.models import RecipeItem


def _item_total_for_field(ri: RecipeItem, field: str, quantity_override: float | None = None) -> float:
    """Total contribution of one RecipeItem to a nutrition/price field.

    field: an Ingredient attribute per 100g (e.g. 'energy_kcal') or 'price'.
    quantity_override: when set, replaces ri.quantity (same unit: portion count).
    """
    if not ri.portion or not ri.portion.ingredient:
        return 0.0
    ing = ri.portion.ingredient
    effective_quantity = quantity_override if quantity_override is not None else float(ri.quantity)
    weight_g = effective_quantity * (ri.portion.weight_g or 0)
    if field == "price":
        if ing.price_per_kg is None:
            return 0.0
        return float(ing.price_per_kg) * weight_g / 1000.0
    value_per_100g = getattr(ing, field, None)
    if value_per_100g is None:
        return 0.0
    return float(value_per_100g) * weight_g / 100.0


def _active_items(meal_item: MealItem) -> list[RecipeItem]:
    """Return the RecipeItems that are active for this variant."""
    ids = list(meal_item.active_recipe_item_ids or [])
    if not ids or not meal_item.recipe:
        return []
    return list(meal_item.recipe.recipe_items.select_related("portion__ingredient").filter(id__in=ids))


def _build_overrides_map(meal_item: MealItem) -> dict[int, object]:
    """Build {recipe_item_id: override} from the meal item's prefetched overrides."""
    return {o.recipe_item_id: o for o in meal_item.overrides.all()}


def compute_variant_energy(meal_item: MealItem) -> float:
    """Energy basis for this variant (before factor × portions scaling).

    Respects MealItemOverride: excluded items are excluded from the total,
    quantity_override replaces the recipe item quantity.
    """
    if not meal_item.recipe or meal_item.recipe.cached_energy_total_kcal is None:
        return 0.0

    overrides_map = _build_overrides_map(meal_item)
    base = float(meal_item.recipe.cached_energy_total_kcal)
    active_ids = set(meal_item.active_recipe_item_ids or [])

    recipe_items = list(meal_item.recipe.recipe_items.select_related("portion__ingredient").all())

    # If there are overrides, recompute from scratch to correctly apply them
    if overrides_map:
        return _compute_total_with_overrides(recipe_items, active_ids, overrides_map, "energy_kcal")

    if not active_ids:
        return base

    return base + _compute_delta(recipe_items, active_ids, "energy_kcal")


def compute_variant_cost(meal_item: MealItem) -> float:
    """Cost basis for this variant (before factor × portions scaling).

    Respects MealItemOverride: excluded items are excluded from the total,
    quantity_override replaces the recipe item quantity.
    """
    if not meal_item.recipe or meal_item.recipe.cached_price_total is None:
        return 0.0

    overrides_map = _build_overrides_map(meal_item)
    base = float(meal_item.recipe.cached_price_total)
    active_ids = set(meal_item.active_recipe_item_ids or [])

    recipe_items = list(meal_item.recipe.recipe_items.select_related("portion__ingredient").all())

    if overrides_map:
        return _compute_total_with_overrides(recipe_items, active_ids, overrides_map, "price")

    if not active_ids:
        return base

    return base + _compute_delta(recipe_items, active_ids, "price")


def _compute_total_with_overrides(
    recipe_items: list[RecipeItem],
    active_ids: set[int],
    overrides_map: dict[int, object],
    field: str,
) -> float:
    """Compute total from scratch, applying overrides (excluded + quantity_override).

    Used when there are active MealItemOverrides so the cached total cannot be reused.
    """
    total = 0.0
    for ri in recipe_items:
        # Exchange/optional filtering same as standard path
        if ri.exchange_group_id is not None or ri.is_optional:
            if ri.id not in active_ids:
                continue

        override = overrides_map.get(ri.id)
        if override and override.excluded:
            continue

        quantity_override = (
            float(override.quantity_override) if (override and override.quantity_override is not None) else None
        )
        total += _item_total_for_field(ri, field, quantity_override=quantity_override)
    return total


def _compute_delta(
    recipe_items: list[RecipeItem],
    active_ids: set[int],
    field: str,
) -> float:
    """Delta from default (pos=0 members, all optionals) to active items.

    Default = all exchange_position=0 members included, all optionals included.
    Active = items in active_ids only.
    Delta = sum(active contributions) - sum(default contributions).
    """
    from collections import defaultdict

    exchange_groups: dict[int, list[RecipeItem]] = defaultdict(list)
    optionals: list[RecipeItem] = []
    normals: list[RecipeItem] = []

    for ri in recipe_items:
        if ri.exchange_group_id is not None:
            exchange_groups[ri.exchange_group_id].append(ri)
        elif ri.is_optional:
            optionals.append(ri)
        else:
            normals.append(ri)

    default_value = 0.0
    active_value = 0.0

    for _group_id, members in exchange_groups.items():
        default_member = next((m for m in members if (m.exchange_position or 0) == 0), None)
        if default_member:
            default_value += _item_total_for_field(default_member, field)
        for m in members:
            if m.id in active_ids:
                active_value += _item_total_for_field(m, field)

    for ri in optionals:
        default_value += _item_total_for_field(ri, field)
        if ri.id in active_ids:
            active_value += _item_total_for_field(ri, field)

    for ri in normals:
        val = _item_total_for_field(ri, field)
        default_value += val
        active_value += val

    return active_value - default_value


def compute_variant_contributions(
    meal_plan,
) -> dict[int, float]:
    """Return total weight-g per RecipeItem summed across all variant items.

    Returns {recipe_item_id: total_weight_g} for the shopping list.
    """
    from collections import defaultdict

    contributions: dict[int, float] = defaultdict(float)

    for meal in meal_plan.meals.all():
        for item in meal.items.filter(recipe__isnull=False).select_related("recipe"):
            active_ids = list(item.active_recipe_item_ids or [])
            if not active_ids:
                continue
            recipe_items = item.recipe.recipe_items.filter(id__in=active_ids).select_related("portion__ingredient")
            for ri in recipe_items:
                weight_g = float(ri.quantity) * (float(ri.portion.weight_g) if ri.portion else 0)
                contributions[ri.id] += weight_g * item.factor

    return contributions
