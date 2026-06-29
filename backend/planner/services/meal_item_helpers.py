"""Shared helpers for MealItem energy/cost calculations."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supply.models import Portion


def resolve_ingredient_energy_kcal(item, effective_portions: float = 1.0) -> float | None:
    """Compute total energy kcal for an ingredient-based MealItem.

    The formula:
        weight_g = quantity × portion.weight_g  (or direct grams if unit is "g")
        energy = (ingredient.energy_kcal / 100) × weight_g × factor × effective_portions

    This returns the TOTAL energy contribution for ALL people,
    consistent with recipe items (which also multiply by effective_portions).
    """
    if not item.ingredient or item.ingredient.energy_kcal is None:
        return None
    weight_g = _resolve_ingredient_weight_g(item)
    if weight_g <= 0:
        return None
    return (float(item.ingredient.energy_kcal) / 100.0) * weight_g * item.factor * effective_portions


def resolve_ingredient_cost_eur(item, effective_portions: float = 1.0) -> float | None:
    """Compute total cost for an ingredient-based MealItem.

    Consistent with energy: multiplies by effective_portions for total cost.
    """
    if not item.ingredient or item.ingredient.price_per_kg is None:
        return None
    weight_g = _resolve_ingredient_weight_g(item)
    if weight_g <= 0:
        return None
    return (float(item.ingredient.price_per_kg) / 1000.0) * weight_g * item.factor * effective_portions


def _resolve_ingredient_weight_g(
    item,
    portion_cache: dict[tuple[int, int], "Portion"] | None = None,
) -> float:
    """Resolve the total weight in grams for an ingredient-based MealItem.

    Supports three paths:
    1. If measuring_unit name is "g" → quantity directly (grams)
    2. If measuring_unit name is "ml" → quantity × density (fallback: 1 g/ml)
    3. Otherwise → portion lookup (weight_g × quantity)

    Args:
        item: A MealItem with ingredient and measuring_unit set.
        portion_cache: Optional pre-loaded portion dict keyed by
            (ingredient_id, measuring_unit_id).  When supplied, no DB
            queries are made for the portion lookup (avoids N+1 in callers
            that already batch-load portions).
    """
    if not item.quantity or not item.measuring_unit:
        return 0.0

    name_lower = item.measuring_unit.name.lower()
    if name_lower == "g":
        return float(item.quantity)
    if name_lower == "ml":
        density = getattr(item.ingredient, "physical_density", None) or 1.0
        return float(item.quantity) * density

    # Portion-unit path — use cache when available to avoid extra DB hit
    if portion_cache is not None:
        portion = portion_cache.get((item.ingredient_id, item.measuring_unit_id))
    else:
        portion = item.ingredient.portions.filter(
            measuring_unit=item.measuring_unit
        ).first()

    if portion and portion.weight_g:
        return portion.weight_g * float(item.quantity)

    # Fallback: use default portion weight_g if available
    if portion_cache is not None:
        # Look for any default portion for this ingredient in the cache
        default_portion = next(
            (p for (ing_id, _), p in portion_cache.items()
             if ing_id == item.ingredient_id and p.rank == 1 and p.weight_g),
            None,
        )
        if default_portion:
            return float(default_portion.weight_g) * float(item.quantity)
    else:
        default_portions = item.ingredient.portions.filter(
            rank=1, weight_g__isnull=False
        )
        if default_portions.exists():
            return float(default_portions.first().weight_g) * float(item.quantity)

    # Fallback: use standard_recipe_weight_g as per-portion estimate
    if item.ingredient.standard_recipe_weight_g:
        return float(item.ingredient.standard_recipe_weight_g) * float(item.quantity)

    return 0.0
