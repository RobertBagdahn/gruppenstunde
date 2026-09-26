"""Deterministic cleanup of implausible portion weights and duplicate retail sections.

Rules (all idempotent, dry-run by default):
1. A portion whose name declares a gram weight ("Dose (à 400g)", "100g Milch")
   that disagrees with ``weight_g`` gets the declared weight — only when no
   recipe uses it, because referenced portions may carry compensated quantities.
2. An unused portion named after a standard measure (EL, TL, Tasse, Prise, …)
   with a physically impossible weight is soft-deleted; the standard-measure
   catalog already offers these measures.
3. Referenced implausible portions are only reported for manual review.
4. Retail sections that are exact duplicates of or legacy aliases for a
   catalog section are merged into it.

Usage:
    uv run python manage.py fix_implausible_portions            # report only
    uv run python manage.py fix_implausible_portions --apply    # write changes
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from recipe.models import RecipeItem
from supply.models import Ingredient, Portion, RetailSection

# (pattern on portion name, min g, max g) — outside these bounds a measure is impossible.
MEASURE_BOUNDS: list[tuple[re.Pattern[str], float, float]] = [
    (re.compile(r"^(1\s*)?(el|esslöffel)\b", re.IGNORECASE), 3, 40),
    (re.compile(r"^(1\s*)?(tl|teelöffel)\b", re.IGNORECASE), 0.8, 15),
    (re.compile(r"gehäuft", re.IGNORECASE), 2, 40),
    (re.compile(r"^(1\s*)?(tasse|tassen|becher)\b", re.IGNORECASE), 50, 400),
    (re.compile(r"^(1\s*)?prise\b", re.IGNORECASE), 0.05, 1.5),
    (re.compile(r"^(1\s*)?(dose|dosen|packung|glas|flasche)\b", re.IGNORECASE), 5, 5000),
]

DECLARED_GRAMS = re.compile(r"(?<![\d,.])(\d+(?:[.,]\d+)?)\s*g\b(?!\s*abgetropft)", re.IGNORECASE)

# Legacy/duplicate section name -> catalog section name.
SECTION_MERGES: dict[str, str] = {
    "Backwaren": "Brot & Backwaren",
    "Gewürze": "Gewürze & Kräuter",
}


@dataclass
class Finding:
    portion: Portion
    action: str  # "set_weight" | "soft_delete" | "report"
    reason: str
    new_weight: float | None = None


def declared_grams(name: str) -> float | None:
    """Return the single gram weight declared in a portion name, if unambiguous."""
    if "kg" in name.lower():
        return None
    matches = DECLARED_GRAMS.findall(name)
    if len(matches) != 1:
        return None
    return float(matches[0].replace(",", "."))


def measure_violation(name: str, weight_g: float) -> str | None:
    for pattern, low, high in MEASURE_BOUNDS:
        if pattern.search(name.strip()) and not (low <= weight_g <= high):
            return f"{weight_g:g} g liegt außerhalb {low:g}–{high:g} g"
    return None


def collect_findings() -> list[Finding]:
    referenced = set(RecipeItem.objects.values_list("portion_id", flat=True).distinct())
    findings: list[Finding] = []
    portions = Portion.objects.active().filter(weight_g__isnull=False).select_related("ingredient")
    for portion in portions.iterator():
        weight = float(portion.weight_g)
        used = portion.id in referenced
        declared = declared_grams(portion.name)
        if declared and abs(declared - weight) / declared > 0.05:
            reason = f"Name nennt {declared:g} g, gespeichert {weight:g} g"
            if used:
                findings.append(Finding(portion, "report", reason))
            else:
                findings.append(Finding(portion, "set_weight", reason, declared))
            continue
        violation = measure_violation(portion.name, weight)
        if violation:
            findings.append(Finding(portion, "report" if used else "soft_delete", violation))
    return findings


class Command(BaseCommand):
    help = "Fix implausible portion weights and merge duplicate retail sections (dry-run by default)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Write changes to the database.")

    def handle(self, *args: Any, **options: Any) -> None:
        apply: bool = options["apply"]
        findings = collect_findings()
        now = timezone.now()

        with transaction.atomic():
            for finding in findings:
                p = finding.portion
                label = f"#{p.id} {p.ingredient.name!r} / {p.name!r}"
                if finding.action == "set_weight":
                    self.stdout.write(f"  [GEWICHT] {label}: {finding.reason} → {finding.new_weight:g} g")
                    if apply:
                        Portion.objects.filter(id=p.id).update(weight_g=finding.new_weight, updated_at=now)
                elif finding.action == "soft_delete":
                    self.stdout.write(f"  [ENTFERNEN] {label}: {finding.reason} (von keinem Rezept genutzt)")
                    if apply:
                        Portion.objects.filter(id=p.id).update(deleted_at=now, updated_at=now)
                else:
                    self.stdout.write(f"  [PRÜFEN] {label}: {finding.reason} (von Rezepten genutzt)")

            for legacy_name, target_name in SECTION_MERGES.items():
                target = RetailSection.objects.filter(name=target_name).first()
                if target is None:
                    continue
                for legacy in RetailSection.objects.filter(name=legacy_name).exclude(id=target.id):
                    count = Ingredient.objects.filter(retail_section=legacy).count()
                    self.stdout.write(
                        f"  [ABTEILUNG] {legacy_name!r} (#{legacy.id}, {count} Zutaten) → {target_name!r}"
                    )
                    if apply:
                        Ingredient.objects.filter(retail_section=legacy).update(retail_section=target)
                        legacy.shopping_list_items.update(retail_section=target)
                        legacy.delete()

        summary = {
            action: sum(1 for f in findings if f.action == action) for action in ("set_weight", "soft_delete", "report")
        }
        self.stdout.write(
            f"\nGewicht korrigiert: {summary['set_weight']}, entfernt: {summary['soft_delete']}, "
            f"manuell prüfen: {summary['report']}"
        )
        if not apply:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen gespeichert. Mit --apply ausführen."))
