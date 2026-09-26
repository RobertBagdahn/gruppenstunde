"""Bulk deterministic nutrition repair for ingredients.

Applies ``propose_deterministic_repair`` to every ingredient, recalculates
Nutri-Score and quality score and writes everything with ``bulk_update`` (no
per-row signals). Values that need domain knowledge are set to ``None`` so the
AI fill only has to deliver genuinely missing values.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from django.db import transaction
from django.utils import timezone

from supply.services.nutrition_plausibility import (
    NUTRITION_FIELDS,
    detect_nutrition_issues,
    ingredient_nutrition_values,
    propose_deterministic_repair,
)

BATCH_SIZE = 500


@dataclass
class NutritionRepairReport:
    """Summary of a deterministic repair run."""

    checked: int = 0
    repaired: int = 0
    field_changes: Counter[str] = field(default_factory=Counter)
    remaining_issues: Counter[str] = field(default_factory=Counter)
    needs_ai: list[int] = field(default_factory=list)
    examples: list[tuple[str, dict[str, tuple[float | None, float | None]]]] = field(default_factory=list)


def repair_nutrition(*, apply: bool, ingredient_ids: list[int] | None = None) -> NutritionRepairReport:
    """Run deterministic nutrition repairs and report what still needs AI."""
    from supply.models import Ingredient
    from supply.services.nutri_service import calculate_nutri_score
    from supply.services.quality_score import calculate_ingredient_quality_score

    queryset = Ingredient.objects.select_related("retail_section").order_by("id")
    if ingredient_ids is not None:
        queryset = queryset.filter(id__in=ingredient_ids)

    report = NutritionRepairReport()
    pending: list[Ingredient] = []
    now = timezone.now()

    for ingredient in queryset.iterator(chunk_size=BATCH_SIZE):
        report.checked += 1
        values = ingredient_nutrition_values(ingredient)
        changes = propose_deterministic_repair(values, name=ingredient.name)
        if changes:
            report.repaired += 1
            if len(report.examples) < 25:
                report.examples.append((ingredient.name, {f: (values.get(f), v) for f, v in changes.items()}))
            for field_name, value in changes.items():
                report.field_changes[field_name] += 1
                setattr(ingredient, field_name, value)
            ingredient.nutri_score, ingredient.nutri_class = calculate_nutri_score(ingredient)
            ingredient.quality_score = calculate_ingredient_quality_score(ingredient)
            ingredient.quality_score_updated_at = now
            pending.append(ingredient)

        remaining = detect_nutrition_issues(ingredient_nutrition_values(ingredient), name=ingredient.name)
        missing_core = any(getattr(ingredient, f) is None for f in ("energy_kcal", "protein_g", "fat_g"))
        for issue in remaining:
            report.remaining_issues[issue.code] += 1
        if remaining or missing_core:
            report.needs_ai.append(ingredient.id)

    if apply and pending:
        update_fields = [*NUTRITION_FIELDS, "nutri_score", "nutri_class", "quality_score", "quality_score_updated_at"]
        with transaction.atomic():
            for start in range(0, len(pending), BATCH_SIZE):
                Ingredient.objects.bulk_update(pending[start : start + BATCH_SIZE], update_fields)

    return report
