"""Reassign portions like "200 ml" or "1 Liter" that carry the measuring unit "Esslöffel"/"Teelöffel".

Such portions made "1 EL Limettensaft" count as 1/200 of a "200 ml" portion (2 g).
Only the measuring unit changes; name, weight and rank stay.

Usage:
    uv run python manage.py fix_misassigned_spoon_units            # dry run
    uv run python manage.py fix_misassigned_spoon_units --apply
"""

from __future__ import annotations

import re
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

SPOON_UNIT_NAMES = ("Esslöffel", "Teelöffel")
METRIC_PORTION_NAME = re.compile(r"^\s*\d+(?:[.,]\d+)?\s*(?P<unit>ml|l|liter|g|gramm|kg)\b", re.IGNORECASE)
TARGET_UNIT_NAMES = {
    "ml": "Milliliter",
    "l": "Liter",
    "liter": "Liter",
    "g": "Gramm",
    "gramm": "Gramm",
    "kg": "Kilogramm",
}


def misassigned_spoon_portions() -> list[tuple[Any, str]]:
    """Active portions with a spoon unit whose name states a metric amount, with the target unit name."""
    from supply.models import Portion

    found: list[tuple[Any, str]] = []
    portions = Portion.objects.active().filter(measuring_unit__name__in=SPOON_UNIT_NAMES).select_related("ingredient")
    for portion in portions.order_by("id"):
        match = METRIC_PORTION_NAME.match(portion.name or "")
        if match:
            found.append((portion, TARGET_UNIT_NAMES[match.group("unit").lower()]))
    return found


class Command(BaseCommand):
    help = "Reassign metric portions ('200 ml') that carry a spoon measuring unit."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Write the changes (default: dry run)")

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.models import MeasuringUnit

        units = {
            name: MeasuringUnit.objects.filter(name=name).order_by("id").first()
            for name in set(TARGET_UNIT_NAMES.values())
        }
        found = misassigned_spoon_portions()
        missing = sorted({target for _portion, target in found if units.get(target) is None})
        if missing:
            self.stderr.write(self.style.ERROR(f"Maßeinheit fehlt: {', '.join(missing)}"))
            return

        for portion, target in found[:30]:
            self.stdout.write(f"  {portion.ingredient.name}: „{portion.name}“ {portion.measuring_unit.name} → {target}")
        if len(found) > 30:
            self.stdout.write(f"  … und {len(found) - 30} weitere")

        if not options["apply"]:
            self.stdout.write(self.style.WARNING(f"Dry run: {len(found)} Portionen würden umgestellt."))
            return

        with transaction.atomic():
            for portion, target in found:
                portion.measuring_unit = units[target]
                portion.save(update_fields=["measuring_unit", "updated_at"])
        self.stdout.write(self.style.SUCCESS(f"{len(found)} Portionen umgestellt."))
