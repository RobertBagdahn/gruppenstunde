"""Deterministic nutrition repair (no AI, no costs).

Dry-run by default; pass --apply to persist. Afterwards the listed ingredients
still need the AI review (``ai_review_ingredients``).
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from supply.services.nutrition_plausibility import ISSUE_LABELS
from supply.services.nutrition_repair import repair_nutrition


class Command(BaseCommand):
    help = "Repariert Nährwerte regelbasiert (kJ→kcal, Platzhalter-Nullen, Salz/Natrium, Atwater-Energie)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Änderungen speichern (Standard: Dry-Run).")

    def handle(self, *args: Any, **options: Any) -> None:
        apply: bool = options["apply"]
        report = repair_nutrition(apply=apply)

        mode = "ANGEWENDET" if apply else "DRY-RUN"
        self.stdout.write(self.style.MIGRATE_HEADING(f"Nährwert-Reparatur ({mode})"))
        self.stdout.write(f"Geprüft: {report.checked} · repariert: {report.repaired}")
        self.stdout.write("\nGeänderte Felder:")
        for field_name, count in report.field_changes.most_common():
            self.stdout.write(f"  {count:5}  {field_name}")
        self.stdout.write("\nBeispiele:")
        for name, changes in report.examples[:15]:
            diff = ", ".join(f"{f}: {old} → {new}" for f, (old, new) in changes.items())
            self.stdout.write(f"  {name}: {diff}")
        self.stdout.write("\nVerbleibende Auffälligkeiten (→ KI-Review):")
        for code, count in report.remaining_issues.most_common():
            self.stdout.write(f"  {count:5}  {ISSUE_LABELS.get(code, code)}")
        self.stdout.write(f"\nZutaten mit KI-Bedarf: {len(report.needs_ai)}")
