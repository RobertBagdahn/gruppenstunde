"""Portion-split helpers for exchange groups and optional ingredients.

Shares are stored as floats (0.0–1.0) on MealItemSplit. To render whole portions
we use the largest-remainder method so the rounded portions always sum exactly to
the total. The included fraction per RecipeItem feeds the shopping list and
nutrition/cost calculations.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealItem
    from recipe.models import RecipeItem


def largest_remainder_round(shares: dict[int, float], total: int) -> dict[int, int]:
    """Round fractional shares to whole portions summing exactly to ``total``.

    Args:
        shares: mapping of key -> share (0.0–1.0); shares should sum to ~1.0
        total: the number of whole portions to distribute

    Returns:
        mapping of key -> whole portions, summing exactly to ``total``.
        Leftover portions from rounding go to the entries with the largest
        fractional remainders (ties broken by key order for determinism).
    """
    if total <= 0 or not shares:
        return {key: 0 for key in shares}

    raw = {key: share * total for key, share in shares.items()}
    floored = {key: int(value) for key, value in raw.items()}
    assigned = sum(floored.values())
    remainder = total - assigned

    if remainder > 0:
        # Distribute leftover to largest fractional parts.
        ordered = sorted(
            raw.keys(),
            key=lambda k: (raw[k] - floored[k], -k),
            reverse=True,
        )
        for key in ordered[:remainder]:
            floored[key] += 1

    return floored


def get_included_fractions(
    meal_item: "MealItem",
    recipe_items: list["RecipeItem"],
    effective_portions: int,
) -> dict[int, float]:
    """Return the included fraction (0.0–1.0) per RecipeItem for a meal item.

    Rules (per design):
      - split present for this item        -> rounded_portions / effective_portions
      - is_optional without split          -> 1.0 (default: included)
      - exchange_position == 0 no split    -> 1.0 (default member)
      - exchange_position > 0 no split     -> 0.0 (not included)
      - neither optional nor exchange      -> 1.0 (unchanged)

    Shares are rounded per group via largest-remainder so portions stay whole.
    """
    from planner.models import MealItemSplit

    splits = {
        s.recipe_item_id: s.share
        for s in MealItemSplit.objects.filter(meal_item=meal_item)
    }

    # Group recipe items by their split-group key.
    # exchange group -> {recipe_item_id: share}; optional item -> {id: share}
    group_members: dict[str, dict[int, float]] = {}
    for ri in recipe_items:
        if ri.exchange_group_id is not None:
            key = f"exchange:{ri.exchange_group_id}"
        elif ri.is_optional:
            key = f"optional:{ri.id}"
        else:
            continue
        group_members.setdefault(key, {})

    # Build per-group rounded portions from stored shares (where present).
    rounded_by_item: dict[int, int] = {}
    for ri in recipe_items:
        if ri.exchange_group_id is not None:
            key = f"exchange:{ri.exchange_group_id}"
        elif ri.is_optional:
            key = f"optional:{ri.id}"
        else:
            continue
        if ri.id in splits:
            group_members[key][ri.id] = splits[ri.id]

    for key, members in group_members.items():
        if members:
            rounded = largest_remainder_round(members, effective_portions)
            rounded_by_item.update(rounded)

    fractions: dict[int, float] = {}
    for ri in recipe_items:
        if ri.id in rounded_by_item:
            fractions[ri.id] = (
                rounded_by_item[ri.id] / effective_portions
                if effective_portions > 0
                else 0.0
            )
        elif ri.is_optional:
            fractions[ri.id] = 1.0  # default included
        elif ri.exchange_group_id is not None:
            fractions[ri.id] = 1.0 if (ri.exchange_position or 0) == 0 else 0.0
        else:
            fractions[ri.id] = 1.0

    return fractions


def _item_total_for_field(ri: "RecipeItem", field: str) -> float:
    """Total contribution of one RecipeItem to a nutrition/price field over the
    whole recipe (per Recipe.portions servings).

    field: an Ingredient attribute per 100g (e.g. 'energy_kcal') or 'price' for
    price_per_kg-based cost.
    """
    if not ri.portion or not ri.portion.ingredient:
        return 0.0
    ing = ri.portion.ingredient
    weight_g = ri.quantity * (ri.portion.weight_g or 0)
    if field == "price":
        if ing.price_per_kg is None:
            return 0.0
        return float(ing.price_per_kg) * weight_g / 1000.0
    value_per_100g = getattr(ing, field, None)
    if value_per_100g is None:
        return 0.0
    return float(value_per_100g) * weight_g / 100.0


def get_split_delta_total(
    meal_item: "MealItem",
    recipe_items: list["RecipeItem"],
    field: str,
) -> float:
    """Delta to add to the cached recipe total for a nutrition/price field.

    The cached recipe total assumes all default members (exchange_position=0) at
    full quantity and all optional items included. This returns the signed delta
    introduced by the meal item's splits, over the whole recipe (per Recipe.portions).
    """
    from planner.models import MealItemSplit

    splits = {
        s.recipe_item_id: s.share
        for s in MealItemSplit.objects.filter(meal_item=meal_item)
    }
    if not splits:
        return 0.0

    items_by_id = {ri.id: ri for ri in recipe_items}
    # Group exchange members for default-vs-actual comparison.
    exchange_groups: dict[int, list["RecipeItem"]] = {}
    for ri in recipe_items:
        if ri.exchange_group_id is not None:
            exchange_groups.setdefault(ri.exchange_group_id, []).append(ri)

    delta = 0.0

    # Exchange groups: actual (Σ share × member) − base (default member full).
    for group_id, members in exchange_groups.items():
        if not any(m.id in splits for m in members):
            continue
        default_member = next(
            (m for m in members if (m.exchange_position or 0) == 0), None
        )
        base = _item_total_for_field(default_member, field) if default_member else 0.0
        actual = 0.0
        for m in members:
            share = splits.get(m.id)
            if share is None:
                # No split row for this member -> 0 portions for non-default.
                # Default with no row would be covered by base; skip.
                continue
            actual += share * _item_total_for_field(m, field)
        delta += actual - base

    # Optional items: delta = (share − 1.0) × item (base includes them fully).
    for ri in recipe_items:
        if ri.is_optional and ri.id in splits:
            delta += (splits[ri.id] - 1.0) * _item_total_for_field(ri, field)

    return delta
