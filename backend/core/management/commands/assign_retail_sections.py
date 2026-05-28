"""
Management command to assign retail sections to ingredients that lack one.

Uses keyword matching from the ingredient description to determine the
appropriate RetailSection.

Usage:
    uv run python manage.py assign_retail_sections
    uv run python manage.py assign_retail_sections --dry-run
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Assign retail sections to ingredients without one, based on description keywords."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be assigned without saving.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Batch size for bulk_update (default: 500).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        from collections import Counter

        from supply.models import Ingredient
        from supply.services.retail_section_mapping import get_retail_section

        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen werden gespeichert.\n"))

        ingredients = Ingredient.objects.filter(retail_section__isnull=True)
        total = ingredients.count()
        self.stdout.write(f"Zutaten ohne RetailSection: {total}\n")

        assigned: list[Ingredient] = []
        section_counter: Counter[str] = Counter()

        for ing in ingredients.iterator():
            rs = get_retail_section(ing.name, ing.description)
            if rs:
                ing.retail_section = rs
                assigned.append(ing)
                section_counter[rs.name] += 1

        self.stdout.write(f"\nZugewiesen: {len(assigned)} / {total}\n")

        if section_counter:
            self.stdout.write("\nVerteilung:")
            for name, count in section_counter.most_common():
                self.stdout.write(f"  {name:30s} {count:>5}")

        if assigned and not dry_run:
            Ingredient.objects.bulk_update(assigned, ["retail_section"], batch_size=batch_size)
            self.stdout.write(self.style.SUCCESS(f"\n{len(assigned)} Zutaten aktualisiert."))
        elif dry_run:
            self.stdout.write(self.style.WARNING("\nDry-run — nichts gespeichert."))
        else:
            self.stdout.write("\nKeine Zutaten zu aktualisieren.")
