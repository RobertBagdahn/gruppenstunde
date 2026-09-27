"""Bulk re-assignment of ingredient retail sections via the deterministic classifier.

Manual assignments (``retail_section_source == "manual"``) are never touched.
Updates use ``bulk_update`` so no per-row signals (embedding, audit) fire; the
embedding backfill picks up the changed embedding text afterwards.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from django.db import transaction

from supply.choices import RetailSectionSourceChoices
from supply.data.retail_sections import RETAIL_SECTION_NAMES
from supply.services.retail_section_classifier import classify_retail_section

BATCH_SIZE = 500


@dataclass
class ReclassifyReport:
    """Summary of a reclassification run."""

    checked: int = 0
    changed: int = 0
    unchanged: int = 0
    unclassified: int = 0
    skipped_manual: int = 0
    transitions: Counter[tuple[str, str]] = field(default_factory=Counter)
    unclassified_names: list[str] = field(default_factory=list)


def reclassify_retail_sections(*, apply: bool, ingredient_ids: list[int] | None = None) -> ReclassifyReport:
    """Classify all (or the given) ingredients and optionally persist changes."""
    from supply.models import Ingredient, RetailSection

    sections = {section.name: section for section in RetailSection.objects.filter(name__in=RETAIL_SECTION_NAMES)}
    queryset = Ingredient.objects.select_related("retail_section").order_by("id")
    if ingredient_ids is not None:
        queryset = queryset.filter(id__in=ingredient_ids)

    report = ReclassifyReport()
    pending: list[Ingredient] = []

    for ingredient in queryset.iterator(chunk_size=BATCH_SIZE):
        report.checked += 1
        if ingredient.retail_section_source == RetailSectionSourceChoices.MANUAL:
            report.skipped_manual += 1
            continue

        current = ingredient.retail_section.name if ingredient.retail_section else ""
        classification = classify_retail_section(ingredient.name)
        if classification is None or classification.section not in sections:
            report.unclassified += 1
            report.unclassified_names.append(ingredient.name)
            continue

        target = sections[classification.section]
        if ingredient.retail_section_id == target.id:
            report.unchanged += 1
            if ingredient.retail_section_source != RetailSectionSourceChoices.RULE:
                ingredient.retail_section_source = RetailSectionSourceChoices.RULE
                pending.append(ingredient)
            continue

        report.changed += 1
        report.transitions[(current or "—", target.name)] += 1
        ingredient.retail_section = target
        ingredient.retail_section_source = RetailSectionSourceChoices.RULE
        pending.append(ingredient)

    if apply and pending:
        with transaction.atomic():
            for start in range(0, len(pending), BATCH_SIZE):
                Ingredient.objects.bulk_update(
                    pending[start : start + BATCH_SIZE], ["retail_section", "retail_section_source"]
                )

    return report
