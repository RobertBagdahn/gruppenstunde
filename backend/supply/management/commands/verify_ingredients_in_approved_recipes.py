"""Verify system draft Ingredients that are used in approved recipes.

Affected: system Ingredients (``owner=None``) with ``status="draft"``, not deleted,
used by at least one RecipeItem of a non-deleted recipe with ``status="approved"``.
Draft Ingredients with an owner are only reported, never verified.

Every change goes through ``set_ingredient_status(..., actor=SYSTEM)`` so each
Ingredient gets its own audit log entry with ``changed_by=NULL``. Idempotent.

Usage:
    uv run python manage.py verify_ingredients_in_approved_recipes                   # report only
    uv run python manage.py verify_ingredients_in_approved_recipes --csv gaps.csv    # report + CSV
    uv run python manage.py verify_ingredients_in_approved_recipes --apply           # verify
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand
from django.db.models import QuerySet

from supply.choices import IngredientStatusChoices
from supply.models import Ingredient
from supply.services.ingredient_status import SYSTEM, set_ingredient_status


@dataclass
class GapRow:
    ingredient_id: int
    name: str
    missing_kcal: bool
    missing_price: bool
    missing_section: bool

    @property
    def has_gap(self) -> bool:
        return self.missing_kcal or self.missing_price or self.missing_section


def _drafts_in_approved_recipes() -> QuerySet[Ingredient]:
    return Ingredient.objects.filter(
        status=IngredientStatusChoices.DRAFT,
        portions__recipe_items__recipe__status="approved",
        portions__recipe_items__recipe__deleted_at__isnull=True,
    ).distinct()


def affected_system_ingredients() -> QuerySet[Ingredient]:
    return _drafts_in_approved_recipes().filter(owner__isnull=True).order_by("name")


def owned_draft_ingredients() -> QuerySet[Ingredient]:
    return _drafts_in_approved_recipes().filter(owner__isnull=False).order_by("name")


def gap_rows(ingredients: QuerySet[Ingredient]) -> list[GapRow]:
    return [
        GapRow(
            ingredient_id=ing.id,
            name=ing.name,
            missing_kcal=ing.energy_kcal is None,
            missing_price=ing.price_per_kg is None,
            missing_section=ing.retail_section_id is None,
        )
        for ing in ingredients
    ]


class Command(BaseCommand):
    help = "Verifiziert System-Entwurfszutaten, die in freigegebenen Rezepten verwendet werden."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Zutaten tatsächlich verifizieren.")
        parser.add_argument("--csv", type=str, default=None, help="Lückenliste als CSV schreiben.")

    def handle(self, *args: Any, **options: Any) -> None:
        affected = affected_system_ingredients()
        rows = gap_rows(affected)
        gaps = [row for row in rows if row.has_gap]

        self.stdout.write(f"Betroffene System-Zutaten: {len(rows)}")
        self.stdout.write(
            f"  ohne kcal: {sum(r.missing_kcal for r in rows)}, "
            f"ohne Preis: {sum(r.missing_price for r in rows)}, "
            f"ohne Abteilung: {sum(r.missing_section for r in rows)}"
        )
        for row in gaps:
            missing = ", ".join(
                label
                for label, flag in (
                    ("kcal", row.missing_kcal),
                    ("Preis", row.missing_price),
                    ("Abteilung", row.missing_section),
                )
                if flag
            )
            self.stdout.write(f"  - #{row.ingredient_id} {row.name}: fehlt {missing}")

        owned = list(owned_draft_ingredients().values_list("id", "name"))
        if owned:
            self.stdout.write(f"Nutzer-Entwürfe in freigegebenen Rezepten (nicht verifiziert): {len(owned)}")
            for ingredient_id, name in owned:
                self.stdout.write(f"  - #{ingredient_id} {name}")

        if options["csv"]:
            self._write_csv(Path(options["csv"]), rows)
            self.stdout.write(f"CSV geschrieben: {options['csv']}")

        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Trockenlauf – nichts geändert. Mit --apply verifizieren."))
            return

        verified = 0
        for ingredient in affected:
            set_ingredient_status(ingredient, IngredientStatusChoices.VERIFIED, actor=SYSTEM)
            verified += 1
        self.stdout.write(self.style.SUCCESS(f"Verifiziert: {verified}"))

    @staticmethod
    def _write_csv(path: Path, rows: list[GapRow]) -> None:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["id", "name", "fehlt_kcal", "fehlt_preis", "fehlt_abteilung"])
            for row in rows:
                writer.writerow([row.ingredient_id, row.name, row.missing_kcal, row.missing_price, row.missing_section])
