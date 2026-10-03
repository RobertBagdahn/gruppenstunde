"""Fix the food data quality audit findings (idempotent, dry-run by default).

Steps (select with --steps, default: all):
  water       clear the price of cooking/pickle water (free ingredients)
  duplicates  merge curated duplicate ingredients (dried basil)
  prices      set curated prices where none exists (e.g. dried mountain lentils)
  nutrition   curated reference values + deterministic energy/macro repair
  publish     verify system drafts used in recipes that pass the publish gate

Examples:
  manage.py fix_food_data_quality                  # dry-run, shows every change
  manage.py fix_food_data_quality --apply          # write the changes
  manage.py fix_food_data_quality --apply --steps water,prices
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from supply.services.food_data_quality import (
    StepResult,
    fill_missing_prices,
    fix_free_water_prices,
    fix_nutrition,
    merge_duplicate_groups,
    publish_recipe_drafts,
)

# Order matters: nutrition and prices are fixed before the publish gate looks at them.
STEPS: dict[str, tuple[str, Callable[..., StepResult]]] = {
    "water": ("Wasser ohne Preis", fix_free_water_prices),
    "duplicates": ("Duplikate zusammenführen", merge_duplicate_groups),
    "prices": ("Fehlende Preise", fill_missing_prices),
    "nutrition": ("Nährwerte", fix_nutrition),
    "publish": ("Entwürfe in Rezepten verifizieren", publish_recipe_drafts),
}


class Command(BaseCommand):
    help = "Behebt die Funde des Food-Datenqualitäts-Audits (Standard: Dry-Run)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Änderungen speichern (Standard: Dry-Run).")
        parser.add_argument("--steps", default=",".join(STEPS), help=f"Kommagetrennt aus: {', '.join(STEPS)}.")

    def handle(self, *args: Any, **options: Any) -> None:
        apply: bool = options["apply"]
        selected = [step.strip() for step in options["steps"].split(",") if step.strip()]
        unknown = [step for step in selected if step not in STEPS]
        if unknown:
            raise CommandError(f"Unbekannte Schritte: {', '.join(unknown)}")

        self.stdout.write(self.style.MIGRATE_HEADING(f"Food-Datenqualität ({'ANGEWENDET' if apply else 'DRY-RUN'})"))
        with transaction.atomic():
            for key in (step for step in STEPS if step in selected):
                label, runner = STEPS[key]
                result = runner(apply=apply)
                self.stdout.write(self.style.MIGRATE_LABEL(f"\n{label}: {result.changed}"))
                for message in result.messages:
                    self.stdout.write(f"  {message}")
        if not apply:
            self.stdout.write(self.style.WARNING("\nDry-Run – nichts geändert. Mit --apply schreiben."))
