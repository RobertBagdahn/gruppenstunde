"""Management command to backfill retail sections for ingredients that lack one.

Uses keyword mapping from supply.services.retail_section_mapping to match
ingredient name and description to an appropriate RetailSection.
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Idempotent backfill of retail sections for ingredients that lack one."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show planned assignments without saving to the database.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Batch size for bulk_update (default: 500).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.models import Ingredient
        from supply.services.retail_section_mapping import get_retail_section

        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen werden in der Datenbank gespeichert.\n"))

        ingredients = Ingredient.objects.filter(retail_section__isnull=True)
        total = ingredients.count()
        self.stdout.write(f"Zutaten ohne Abteilung gefunden: {total}\n")

        assigned: list[Ingredient] = []
        no_match_names: list[str] = []

        for ing in ingredients.iterator():
            rs = get_retail_section(ing.name, ing.description)
            if rs:
                ing.retail_section = rs
                assigned.append(ing)
                if dry_run:
                    self.stdout.write(
                        f"  Geplant: \"{ing.name}\" ({ing.description or 'keine Beschreibung'}) → \"{rs.name}\""
                    )
            else:
                no_match_names.append(ing.name)

        assigned_count = len(assigned)
        no_match_count = len(no_match_names)

        # Bulk update if we have assignments and not dry_run
        if assigned and not dry_run:
            Ingredient.objects.bulk_update(assigned, ["retail_section"], batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(f"\nErfolgreich {assigned_count} Zutaten aktualisiert."))
        elif dry_run:
            self.stdout.write(
                self.style.WARNING(f"\nDry Run abgeschlossen. {assigned_count} Zutaten wären aktualisiert worden.")
            )
        else:
            self.stdout.write("\nKeine Zutaten aktualisiert.")

        # Abschluss-Report
        self.stdout.write("\n=================== Abschluss-Report ===================")
        self.stdout.write(f"Anzahl erfolgreich zugeordnet: {assigned_count}")
        self.stdout.write(f"Anzahl weiterhin ohne Treffer: {no_match_count}")

        if no_match_names:
            self.stdout.write("\nFolgende Zutaten konnten nicht zugeordnet werden (Namensliste):")
            for name in sorted(no_match_names):
                self.stdout.write(f"  - {name}")
        self.stdout.write("========================================================\n")
