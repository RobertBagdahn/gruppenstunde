"""Typical grams per person of each ingredient across approved recipes.

The values are the baseline for the quantity outlier checks
(``recipe.services.quantity_outliers``). Recipe quantities are stored per
person, so the grams of a recipe line are grams per person.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from collections.abc import Iterable
from typing import TYPE_CHECKING

from django.db import transaction
from django.db.models import Q

if TYPE_CHECKING:
    from recipe.models import Recipe, RecipeItem

MIN_SAMPLES = 5


def _p90(values: list[float]) -> float:
    if len(values) == 1:
        return values[0]
    return statistics.quantiles(values, n=10, method="inclusive")[8]


def _summary(values: list[float]) -> dict[str, float | int]:
    return {
        "sample_count": len(values),
        "median_g": round(statistics.median(values), 2),
        "p90_g": round(_p90(values), 2),
    }


def counts_for_baseline(item: RecipeItem) -> bool:
    """Optional lines and non-default exchange alternatives are not the usual amount."""
    if item.is_optional:
        return False
    return item.exchange_group_id is None or item.exchange_position == 0


def collect_grams_per_recipe(
    ingredient_ids: Iterable[int] | None = None,
) -> dict[int, list[tuple[str, float]]]:
    """``{ingredient_id: [(recipe_type, grams_per_person), ...]}`` — one entry per recipe."""
    from content.choices import ContentStatus
    from recipe.models import RecipeItem
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient, resolve_recipe_item_grams

    items = RecipeItem.objects.filter(
        recipe__status=ContentStatus.APPROVED,
        recipe__deleted_at__isnull=True,
    ).select_related("recipe", "portion__ingredient", "portion__measuring_unit", "ingredient")
    if ingredient_ids is not None:
        ids = list(ingredient_ids)
        items = items.filter(Q(portion__ingredient_id__in=ids) | Q(portion__isnull=True, ingredient_id__in=ids))

    per_recipe: dict[tuple[int, int], float] = defaultdict(float)
    recipe_types: dict[int, str] = {}
    for item in items:
        if not counts_for_baseline(item):
            continue
        if item.portion is not None and item.portion.deleted_at is not None:
            continue
        ingredient = get_recipe_item_ingredient(item)
        grams = resolve_recipe_item_grams(item)
        if ingredient is None or grams is None or grams <= 0:
            continue
        per_recipe[(ingredient.id, item.recipe_id)] += grams
        recipe_types[item.recipe_id] = item.recipe.recipe_type or ""

    result: dict[int, list[tuple[str, float]]] = defaultdict(list)
    for (ingredient_id, recipe_id), grams in per_recipe.items():
        result[ingredient_id].append((recipe_types[recipe_id], grams))
    return result


@transaction.atomic
def recalculate_ingredient_quantity_stats(ingredient_ids: Iterable[int] | None = None) -> int:
    """Recalculate the baseline for the given ingredients (all when ``None``).

    Returns the number of stored stats rows. Ingredients without any usable
    recipe line lose their stats row.
    """
    from supply.models import IngredientQuantityStats

    ids = list(ingredient_ids) if ingredient_ids is not None else None
    samples = collect_grams_per_recipe(ids)

    stale = IngredientQuantityStats.objects.exclude(ingredient_id__in=samples.keys())
    if ids is not None:
        stale = stale.filter(ingredient_id__in=ids)
    stale.delete()

    for ingredient_id, entries in samples.items():
        values = [grams for _, grams in entries]
        by_type_values: dict[str, list[float]] = defaultdict(list)
        for recipe_type, grams in entries:
            if recipe_type:
                by_type_values[recipe_type].append(grams)
        overall = _summary(values)
        IngredientQuantityStats.objects.update_or_create(
            ingredient_id=ingredient_id,
            defaults={
                "sample_count": overall["sample_count"],
                "median_g": overall["median_g"],
                "p90_g": overall["p90_g"],
                "by_recipe_type": {key: _summary(group) for key, group in by_type_values.items()},
            },
        )
    return len(samples)


def recalculate_for_recipe(recipe: Recipe) -> int:
    """Refresh the baseline of every ingredient used by ``recipe``."""
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

    ingredient_ids = {
        ingredient.id
        for item in recipe.recipe_items.select_related("portion__ingredient", "ingredient")
        if (ingredient := get_recipe_item_ingredient(item)) is not None
    }
    if not ingredient_ids:
        return 0
    return recalculate_ingredient_quantity_stats(ingredient_ids)
