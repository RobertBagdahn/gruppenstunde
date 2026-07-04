"""Backfill System-Portionen (g, Stück, Packung) für Zutaten aus Alt-Importen
und Reparatur von Zutaten ohne rank=1 (Normalportion).

Hintergrund: Das Signal `create_base_portion_for_ingredient` legt System-Portionen
nur bei `Ingredient.objects.create(...)`-Aufrufen an (`created=True`). Massenimporte
(Fixtures, `bulk_create`, Legacy-Importe) haben dieses Signal nie ausgelöst, weshalb
für Alt-Zutaten bislang keine `is_system=True`-Portionen existieren.

Idempotent: mehrfaches Ausführen erzeugt keine Duplikate (get_or_create pro Name).
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

# Manuelle Reparatur für die wenigen Alt-Zutaten, die zwar Portionen haben,
# aber keine davon auf rank=1 (Normalportion) steht. Werte sind gängige
# Küchen-Richtwerte (Rezept-Standardportion).
RANK1_FIXES: dict[str, dict[str, Any]] = {
    "eier": {"promote_portion_name": "1 Ei (Größe M)"},
    "zimtstangen": {"promote_portion_name": "Zimtstange"},
    "kartoffel": {"create": {"name": "1 mittelgroße Kartoffel", "unit": "stueck", "weight_g": 150}},
    "sojaflocken": {"create": {"name": "Portion (40g)", "unit": "g", "weight_g": 40}},
    "zwiebel-rot-2": {"create": {"name": "1 Zwiebel", "unit": "stueck", "weight_g": 80}},
}


class Command(BaseCommand):
    help = (
        "Idempotenter Backfill der System-Portionen (g, Stück, Packung) für alle Zutaten "
        "+ Reparatur von Zutaten ohne rank=1 (Normalportion)."
    )

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--dry-run", action="store_true", help="Nur anzeigen, nichts speichern.")

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.models import Ingredient, MeasuringUnit, Portion
        from supply.signals import _create_system_portions

        dry_run = options["dry_run"]
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen werden gespeichert.\n"))

        # --- Phase 1: System-Portionen (g/Stück/Packung) für alle Zutaten ---
        ingredients = Ingredient.objects.all()
        total = ingredients.count()
        self.stdout.write(f"Prüfe System-Portionen für {total} Zutaten ...")

        created_counts = {"g": 0, "Stück": 0, "Packung": 0}
        ingredients_touched = 0

        with transaction.atomic():
            for ing in ingredients.iterator():
                existing_system = set(
                    ing.portions.filter(deleted_at__isnull=True, is_system=True).values_list("name", flat=True)
                )
                missing = Portion.system_portion_names() - existing_system
                if not missing:
                    continue

                ingredients_touched += 1
                if dry_run:
                    self.stdout.write(f"  {ing.name} (#{ing.id}): fehlt {sorted(missing)}")
                    continue

                _create_system_portions(ing)
                for name in missing:
                    created_counts[name] = created_counts.get(name, 0) + 1

            if dry_run:
                transaction.set_rollback(True)

        if dry_run:
            self.stdout.write(f"\nZutaten mit fehlenden System-Portionen: {ingredients_touched}")
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"System-Portionen angelegt — g: {created_counts['g']}, "
                    f"Stück: {created_counts['Stück']}, Packung: {created_counts['Packung']} "
                    f"(betroffene Zutaten: {ingredients_touched})"
                )
            )

        # --- Phase 2: rank=1 (Normalportion) für Zutaten ohne Normalportion ---
        self.stdout.write("\nPrüfe rank=1 (Normalportion) ...")
        missing_rank1 = Ingredient.objects.exclude(
            id__in=Portion.objects.filter(rank=1, deleted_at__isnull=True).values_list("ingredient_id", flat=True)
        )
        count_missing = missing_rank1.count()
        self.stdout.write(f"Zutaten ohne rank=1: {count_missing}")

        g_unit = MeasuringUnit.objects.filter(name__iexact="g").first()
        stueck_unit = MeasuringUnit.objects.filter(name__iexact="Stück").first()
        unit_map = {"g": g_unit, "stueck": stueck_unit}

        fixed = 0
        unknown = 0
        for ing in missing_rank1:
            fix = RANK1_FIXES.get(ing.slug)
            if not fix:
                unknown += 1
                self.stdout.write(
                    self.style.WARNING(f"  ⚠ Keine bekannte Regel für '{ing.name}' (slug={ing.slug})")
                )
                continue

            if dry_run:
                self.stdout.write(f"  Geplant: {ing.name} → {fix}")
                continue

            with transaction.atomic():
                if "promote_portion_name" in fix:
                    portion = ing.portions.filter(name=fix["promote_portion_name"], deleted_at__isnull=True).first()
                    if portion:
                        portion.rank = 1
                        portion.save(update_fields=["rank"])
                        fixed += 1
                        self.stdout.write(f"  ✓ {ing.name}: '{portion.name}' → rank=1")
                    else:
                        self.stdout.write(
                            self.style.ERROR(f"  ✗ {ing.name}: Portion '{fix['promote_portion_name']}' nicht gefunden")
                        )
                elif "create" in fix:
                    data = fix["create"]
                    Portion.objects.create(
                        ingredient=ing,
                        name=data["name"],
                        measuring_unit=unit_map[data["unit"]],
                        quantity=1,
                        weight_g=data["weight_g"],
                        rank=1,
                        is_system=False,
                    )
                    fixed += 1
                    self.stdout.write(f"  ✓ {ing.name}: neue Portion '{data['name']}' ({data['weight_g']}g) → rank=1")

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"\nrank=1 repariert: {fixed}, unbekannt: {unknown}"))

        self.stdout.write(self.style.SUCCESS("\nFertig."))
