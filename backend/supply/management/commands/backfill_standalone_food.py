"""Flag ingredients that can be eaten or drunk directly (is_standalone_food).

Runs as a dry run by default and only writes with --apply.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from django.core.management.base import BaseCommand

from supply.services.standalone_food import STANDALONE_SECTION_RULES, is_standalone_candidate


class Command(BaseCommand):
    help = "Set is_standalone_food for suitable ingredients (dry run unless --apply is given)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Write the changes. Without it nothing is saved.")
        parser.add_argument(
            "--include-drafts",
            action="store_true",
            help="Also consider ingredients that are not verified (default: verified only).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.models import Ingredient

        apply: bool = options["apply"]
        qs = Ingredient.objects.filter(
            retail_section__name__in=list(STANDALONE_SECTION_RULES),
            is_standalone_food=False,
        ).select_related("retail_section")
        if not options["include_drafts"]:
            qs = qs.filter(status="verified")

        by_section: dict[str, list[str]] = defaultdict(list)
        skipped: dict[str, list[str]] = defaultdict(list)
        to_update: list[Ingredient] = []
        for ingredient in qs.order_by("name"):
            section = ingredient.retail_section.name if ingredient.retail_section else ""
            if is_standalone_candidate(ingredient.name, section):
                ingredient.is_standalone_food = True
                to_update.append(ingredient)
                by_section[section].append(ingredient.name)
            else:
                skipped[section].append(ingredient.name)

        mode = "APPLY" if apply else "DRY RUN (nichts wird gespeichert)"
        self.stdout.write(self.style.WARNING(f"{mode}\n"))
        for section in STANDALONE_SECTION_RULES:
            self.stdout.write(f"{section}: {len(by_section[section])} markiert, {len(skipped[section])} übersprungen")
            if by_section[section]:
                self.stdout.write("  + " + ", ".join(by_section[section]))
            if skipped[section]:
                self.stdout.write("  - " + ", ".join(skipped[section]))

        if apply and to_update:
            Ingredient.objects.bulk_update(to_update, ["is_standalone_food"], batch_size=500)
            self.stdout.write(self.style.SUCCESS(f"\n{len(to_update)} Zutaten als Einzelzutat markiert."))
        else:
            self.stdout.write(
                self.style.WARNING(f"\n{len(to_update)} Zutaten würden markiert (--apply zum Schreiben).")
            )
