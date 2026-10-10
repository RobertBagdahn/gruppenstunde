"""Map legacy MealItem measuring units to the explicit unit model.

Ingredient MealItems store exactly one unit kind: a portion, a standard
measure or a g/ml measuring unit (openspec change `switchable-quantity-units`).
Older rows may still carry another measuring unit ("EL", "Scheibe", …). This
command maps them to a standard measure or the matching portion; the count
(`quantity`) is kept. Rows that cannot be mapped are reported.

Dry run by default; pass `--apply` to write.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from ninja.errors import HttpError

from planner.models import MealItem
from planner.services.meal_item_units import unit_fields_for_measuring_unit
from supply.services.quantity_units import GRAM_UNIT_NAMES, MILLILITER_UNIT_NAMES


class Command(BaseCommand):
    help = "Normalize legacy MealItem units (dry run unless --apply)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--apply", action="store_true", help="Write the changes.")

    def handle(self, *args, **options) -> None:
        apply: bool = options["apply"]
        metric = Q(measuring_unit__name__iregex=r"^(" + "|".join(GRAM_UNIT_NAMES + MILLILITER_UNIT_NAMES) + r")$")
        candidates = (
            MealItem.objects.filter(ingredient__isnull=False, portion__isnull=True, standard_measure_key="")
            .exclude(measuring_unit__isnull=True)
            .exclude(metric)
            .select_related("ingredient", "measuring_unit")
        )
        without_unit = MealItem.objects.filter(
            ingredient__isnull=False, portion__isnull=True, standard_measure_key="", measuring_unit__isnull=True
        ).count()

        mapped = 0
        unmapped: list[str] = []
        with transaction.atomic():
            for item in candidates:
                try:
                    fields = unit_fields_for_measuring_unit(item.ingredient, item.measuring_unit)
                except HttpError:
                    unmapped.append(
                        f"MealItem {item.id}: {item.ingredient.name} – {item.quantity} {item.measuring_unit.name}"
                    )
                    continue
                mapped += 1
                if apply:
                    item.portion = fields.portion
                    item.standard_measure_key = fields.standard_measure_key
                    item.measuring_unit = fields.measuring_unit
                    item.save(update_fields=["portion", "standard_measure_key", "measuring_unit"])

        mode = "angewendet" if apply else "Probelauf"
        self.stdout.write(f"{mode}: {mapped} Einträge zugeordnet, {len(unmapped)} nicht zuordenbar.")
        if without_unit:
            self.stdout.write(f"{without_unit} Einträge ohne Einheit (werden als 0 g gerechnet).")
        for line in unmapped:
            self.stdout.write(f"  nicht zuordenbar: {line}")
