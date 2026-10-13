"""Flag unusually high ingredient quantities and lines that were not divided.

All checks only warn; nothing is changed or blocked. Grams are per person
(recipe quantities are stored for one person).
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from supply.services.ingredient_quantity_stats import MIN_SAMPLES, counts_for_baseline

if TYPE_CHECKING:
    from recipe.models import Recipe, RecipeItem
    from supply.models import IngredientQuantityStats

OutlierKind = Literal["high_quantity", "undivided"]
OutlierSeverity = Literal["warning", "danger"]

# A line is unusual above max(3 × median, 1.5 × p90) and at least 20 g over
# the median; the gram floor keeps tiny amounts (spices) quiet.
WARNING_MEDIAN_FACTOR = 3.0
DANGER_MEDIAN_FACTOR = 6.0
P90_FACTOR = 1.5
MIN_EXCESS_G = 20.0

# Heuristic for lines that kept the source amount when a recipe was divided.
UNDIVIDED_MIN_GRAMS = 60.0
UNDIVIDED_MIN_FRACTIONAL_SIBLINGS = 2


@dataclass(frozen=True)
class Baseline:
    median_g: float
    p90_g: float
    sample_count: int


@dataclass(frozen=True)
class QuantityOutlier:
    kind: OutlierKind
    severity: OutlierSeverity
    grams_per_person: float
    median_g: float | None
    p90_g: float | None
    sample_count: int
    message: str


def _format_g(value: float) -> str:
    return f"{round(value):d} g"


def baseline_for(stats: IngredientQuantityStats | None, recipe_type: str | None) -> Baseline | None:
    """Recipe-type values with enough samples, else the overall values."""
    if stats is None:
        return None
    by_type = (stats.by_recipe_type or {}).get(recipe_type or "")
    if by_type and by_type.get("sample_count", 0) >= MIN_SAMPLES and by_type.get("median_g"):
        return Baseline(float(by_type["median_g"]), float(by_type["p90_g"]), int(by_type["sample_count"]))
    if stats.sample_count >= MIN_SAMPLES and stats.median_g:
        return Baseline(float(stats.median_g), float(stats.p90_g or stats.median_g), stats.sample_count)
    return None


def evaluate_grams(grams: float, baseline: Baseline | None) -> QuantityOutlier | None:
    """Outlier for ``grams`` per person against ``baseline``, or None."""
    if baseline is None or grams <= 0:
        return None
    threshold = max(WARNING_MEDIAN_FACTOR * baseline.median_g, P90_FACTOR * baseline.p90_g)
    if grams <= threshold or grams - baseline.median_g < MIN_EXCESS_G:
        return None
    severity: OutlierSeverity = "danger" if grams >= DANGER_MEDIAN_FACTOR * baseline.median_g else "warning"
    return QuantityOutlier(
        kind="high_quantity",
        severity=severity,
        grams_per_person=round(grams, 1),
        median_g=baseline.median_g,
        p90_g=baseline.p90_g,
        sample_count=baseline.sample_count,
        message=f"{_format_g(grams)} pro Person – üblich sind {_format_g(baseline.median_g)}",
    )


def load_stats(ingredient_ids: Iterable[int]) -> dict[int, IngredientQuantityStats]:
    from supply.models import IngredientQuantityStats

    ids = set(ingredient_ids)
    if not ids:
        return {}
    return {stats.ingredient_id: stats for stats in IngredientQuantityStats.objects.filter(ingredient_id__in=ids)}


def _is_whole(value: float) -> bool:
    return abs(value - round(value)) < 1e-9


def _is_counted_unit(item: RecipeItem) -> bool:
    from recipe.services.recipe_item_helpers import recipe_item_unit_label

    return recipe_item_unit_label(item) != "g"


def _is_piece_portion(item: RecipeItem) -> bool:
    from supply.services.portion_resolution import is_piece_like_name

    return item.portion is not None and is_piece_like_name(item.portion.name)


def undivided_item_ids(recipe: Recipe, items: list[RecipeItem]) -> set[int]:
    """Lines that probably kept the source amount when the recipe was divided."""
    from recipe.services.recipe_item_helpers import resolve_recipe_item_grams

    servings = recipe.source_servings or 0
    if servings <= 1:
        return set()
    flagged: set[int] = set()
    fractional_counted = [
        item.id for item in items if _is_counted_unit(item) and not _is_whole(float(item.quantity or 0))
    ]
    for item in items:
        quantity = float(item.quantity or 0)
        if quantity <= 0:
            continue
        if item.source_quantity is not None:
            if abs(float(item.source_quantity) - quantity) < 1e-9:
                flagged.add(item.id)
            continue
        # Only countable pieces ("2 Zwiebeln"); "1 Portion" is naturally per person.
        if not _is_piece_portion(item) or quantity < 1 or not _is_whole(quantity):
            continue
        if (resolve_recipe_item_grams(item) or 0) < UNDIVIDED_MIN_GRAMS:
            continue
        siblings = [item_id for item_id in fractional_counted if item_id != item.id]
        if len(siblings) >= UNDIVIDED_MIN_FRACTIONAL_SIBLINGS:
            flagged.add(item.id)
    return flagged


def _undivided_outlier(recipe: Recipe, grams: float) -> QuantityOutlier:
    return QuantityOutlier(
        kind="undivided",
        severity="danger",
        grams_per_person=round(grams, 1),
        median_g=None,
        p90_g=None,
        sample_count=0,
        message=(f"Vermutlich nicht durch {recipe.source_servings} Personen geteilt ({_format_g(grams)} pro Person)"),
    )


def recipe_outliers(
    recipe: Recipe,
    items: list[RecipeItem] | None = None,
    stats: dict[int, IngredientQuantityStats] | None = None,
) -> dict[int, QuantityOutlier]:
    """``{recipe_item_id: outlier}`` for one recipe.

    Lines of the same ingredient are summed (the baseline counts each recipe
    once); every line of an unusual ingredient carries the finding. A line
    that was not divided wins over a high-quantity finding.
    """
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient, resolve_recipe_item_grams

    if items is None:
        items = list(recipe.recipe_items.select_related("portion__ingredient", "portion__measuring_unit", "ingredient"))
    lines_by_ingredient: dict[int, list[RecipeItem]] = defaultdict(list)
    grams_by_ingredient: dict[int, float] = defaultdict(float)
    grams_by_item: dict[int, float] = {}
    for item in items:
        ingredient = get_recipe_item_ingredient(item)
        grams = resolve_recipe_item_grams(item) or 0.0
        grams_by_item[item.id] = grams
        if ingredient is None or not counts_for_baseline(item):
            continue
        lines_by_ingredient[ingredient.id].append(item)
        grams_by_ingredient[ingredient.id] += grams

    if stats is None:
        stats = load_stats(lines_by_ingredient.keys())

    result: dict[int, QuantityOutlier] = {}
    for ingredient_id, lines in lines_by_ingredient.items():
        outlier = evaluate_grams(
            grams_by_ingredient[ingredient_id], baseline_for(stats.get(ingredient_id), recipe.recipe_type)
        )
        if outlier is None:
            continue
        for line in lines:
            result[line.id] = outlier
    for item_id in undivided_item_ids(recipe, items):
        result[item_id] = _undivided_outlier(recipe, grams_by_item.get(item_id, 0.0))
    return result


def cached_recipe_outliers(recipe: Recipe) -> dict[int, QuantityOutlier]:
    """Outliers computed once per recipe instance (used by per-item serializers)."""
    cached = getattr(recipe, "_quantity_outliers", None)
    if cached is None:
        cached = recipe_outliers(recipe)
        recipe._quantity_outliers = cached  # type: ignore[attr-defined]
    return cached
