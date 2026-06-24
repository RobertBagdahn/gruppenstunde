"""Management command to delete RetailSections and rename others.

Steps:
1. Delete specified RetailSections (ingredients get retail_section=NULL via SET_NULL)
2. Rename "Gewürze & Öle" → "Gewürze"
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

SECTIONS_TO_DELETE = [
    "Kühlung",
    "Obst & Gemüse",
    "Milchprodukte",
    "Backwaren",
    "Getreide & Teigwaren",
    "Konserven",
    "Grundnahrungsmittel",
]

RENAME_MAP = {
    "Gewürze & Öle": "Gewürze",
}


class Command(BaseCommand):
    help = "Delete specified RetailSections, rename 'Gewürze & Öle' → 'Gewürze'."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show planned actions without modifying the database.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.models import RetailSection

        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen.\n"))

        # --- Step 1: Delete sections ---
        sections_to_delete = list(RetailSection.objects.filter(name__in=SECTIONS_TO_DELETE))

        if not sections_to_delete:
            self.stdout.write("Keine der anzulöschenden Abteilungen gefunden.\n")
        else:
            self.stdout.write(f"Gefundene Abteilungen zum Löschen ({len(sections_to_delete)}):")
            for section in sections_to_delete:
                count = section.ingredients.count()
                self.stdout.write(f'  - "{section.name}" (ID={section.id}, rank={section.rank}, ' f"{count} Zutaten)")

            if not dry_run:
                for section in sections_to_delete:
                    affected = section.ingredients.count()
                    section.delete()
                    self.stdout.write(
                        self.style.SUCCESS(f'  Gelöscht: "{section.name}" ' f"({affected} Zutaten auf NULL gesetzt)")
                    )
            else:
                self.stdout.write(self.style.WARNING("  (Trockenlauf — nichts gelöscht)"))

        # --- Step 2: Rename sections ---
        for old_name, new_name in RENAME_MAP.items():
            try:
                section = RetailSection.objects.get(name=old_name)
                self.stdout.write(
                    f'Umbenennen: "{old_name}" → "{new_name}" '
                    f"(ID={section.id}, {section.ingredients.count()} Zutaten)"
                )
                if not dry_run:
                    section.name = new_name
                    section.save()
                    self.stdout.write(self.style.SUCCESS(f'  Umbenannt: "{old_name}" → "{new_name}"'))
                else:
                    self.stdout.write(self.style.WARNING("  (Trockenlauf — nichts umbenannt)"))
            except RetailSection.DoesNotExist:
                self.stdout.write(f'Übersprungen: "{old_name}" nicht gefunden.\n')

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry Run abgeschlossen."))
        else:
            self.stdout.write(self.style.SUCCESS("\nAlle Änderungen ausgeführt."))
