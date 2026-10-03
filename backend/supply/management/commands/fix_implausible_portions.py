"""Deterministic cleanup of implausible portion weights and duplicate retail sections.

Rules (all idempotent, dry-run by default):
1. A portion whose name declares a gram weight ("Dose (à 400g)", "100g Milch")
   that disagrees with ``weight_g`` gets the declared weight — only when no
   recipe uses it, because referenced portions may carry compensated quantities.
2. An unused portion named after a standard measure (EL, TL, Tasse, Prise, …)
   with a physically impossible weight is soft-deleted; the standard-measure
   catalog already offers these measures.
3. A referenced measure portion with a physically impossible weight (e.g.
   "gehäufter TL" = 1 g) is replaced by grams: its recipe items keep their
   total weight on the gram portion, and an item that then duplicates a plain
   item of the same ingredient in the same recipe is merged into it.
   Other referenced mismatches are only reported for manual review.
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
from supply.services.portion_integrity import (
    get_or_create_gram_portion,
    measure_violation,
    rebind_recipe_items_to_portion,
)
from supply.services.portion_resolution import resolve_trusted_weight

DECLARED_GRAMS = re.compile(r"(?<![\d,.])(\d+(?:[.,]\d+)?)\s*g\b(?!\s*abgetropft)", re.IGNORECASE)

# Legacy/duplicate section name -> catalog section name.
SECTION_MERGES: dict[str, str] = {
    "Backwaren": "Brot & Backwaren",
    "Gewürze": "Gewürze & Kräuter",
}


@dataclass
class Finding:
    portion: Portion
    action: str  # "set_weight" | "soft_delete" | "rebind" | "report"
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
            findings.append(Finding(portion, "rebind" if used else "soft_delete", violation))
    return findings


def rebind_to_grams(portion: Portion) -> int:
    """Move all recipe items of `portion` onto grams, keeping their total weight.

    Returns the number of items merged into an existing plain item of the same
    ingredient in the same recipe.
    """
    gram_portion = get_or_create_gram_portion(portion.ingredient)
    item_ids = rebind_recipe_items_to_portion(portion, gram_portion)
    gram_weight = resolve_trusted_weight(gram_portion) or 1.0
    merged = 0
    for item in RecipeItem.objects.filter(id__in=item_ids).select_related("portion"):
        if item.is_optional or item.exchange_group_id:
            continue
        twin = (
            RecipeItem.objects.filter(
                recipe_id=item.recipe_id,
                portion__ingredient_id=portion.ingredient_id,
                is_optional=False,
                exchange_group__isnull=True,
            )
            .exclude(id=item.id)
            .select_related("portion")
            .order_by("sort_order", "id")
            .first()
        )
        twin_weight = resolve_trusted_weight(twin.portion) if twin else None
        if twin is None or not twin_weight:
            continue
        twin.quantity += item.quantity * gram_weight / twin_weight
        twin.save(update_fields=["quantity"])
        item.delete()
        merged += 1
    return merged


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
                elif finding.action == "rebind":
                    self.stdout.write(f"  [GRAMM] {label}: {finding.reason} → Rezeptzeilen auf Gramm umgestellt")
                    if apply:
                        merged = rebind_to_grams(p)
                        if merged:
                            self.stdout.write(f"    {merged} doppelte Zutatenzeile(n) zusammengeführt")
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
            action: sum(1 for f in findings if f.action == action)
            for action in ("set_weight", "soft_delete", "rebind", "report")
        }
        self.stdout.write(
            f"\nGewicht korrigiert: {summary['set_weight']}, entfernt: {summary['soft_delete']}, "
            f"auf Gramm umgestellt: {summary['rebind']}, "
            f"manuell prüfen: {summary['report']}"
        )
        if not apply:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen gespeichert. Mit --apply ausführen."))
