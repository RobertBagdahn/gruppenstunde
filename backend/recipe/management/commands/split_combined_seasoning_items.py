"""Replace recipe rows "Salz und Pfeffer" by one row per seasoning ("1 Prise" each).

The combined catalog ingredient is soft-deleted and excluded from import matching
afterwards. Recipe rows have no soft delete: each affected row is replaced by two new
rows with the same recipe, order, note and quantity, then the old row is removed.

Usage:
    uv run python manage.py split_combined_seasoning_items            # dry run
    uv run python manage.py split_combined_seasoning_items --apply
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

COMBINED_NAME = "Salz und Pfeffer"
SEASONINGS = (("Jodsalz", "Salz"), ("gemahlener schwarzer Pfeffer", "Pfeffer"))


def affected_items() -> list[Any]:
    from recipe.models import RecipeItem
    from supply.models import Ingredient

    combined_ids = Ingredient.objects.filter(name=COMBINED_NAME, deleted_at__isnull=True).values("id")
    return list(
        RecipeItem.objects.filter(portion__ingredient__in=combined_ids)
        .select_related("portion__ingredient", "recipe")
        .order_by("recipe_id", "sort_order", "id")
    )


class Command(BaseCommand):
    help = "Split recipe rows 'Salz und Pfeffer' into one '1 Prise' row per seasoning."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Write the changes (default: dry run)")

    def handle(self, *args: Any, **options: Any) -> None:
        from recipe.models import RecipeItem
        from supply.models import Ingredient

        items = affected_items()
        combined = Ingredient.objects.filter(name=COMBINED_NAME, deleted_at__isnull=True).first()
        if combined is None and not items:
            self.stdout.write("Keine betroffenen Rezeptzeilen gefunden.")
            return

        plan: list[tuple[Any, list[Any]]] = []
        for item in items:
            seasonings = []
            for seasoning_name, _short in SEASONINGS:
                seasoning = Ingredient.objects.filter(name=seasoning_name, deleted_at__isnull=True).first()
                if seasoning is None:
                    self.stderr.write(self.style.ERROR(f"Zutat fehlt: {seasoning_name}"))
                    return
                seasonings.append(seasoning)
            plan.append((item, seasonings))

        for item, seasonings in plan[:30]:
            labels = ", ".join(seasoning.name for seasoning in seasonings)
            self.stdout.write(f"  {item.recipe.title}: Zeile {item.id} → 1 Prise {labels}")
        if len(plan) > 30:
            self.stdout.write(f"  … und {len(plan) - 30} weitere")
        self.stdout.write(f"{len(plan)} Zeilen betroffen; „{COMBINED_NAME}“ wird soft-gelöscht.")

        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Dry run: nichts geschrieben."))
            return

        with transaction.atomic():
            for item, seasonings in plan:
                for seasoning in seasonings:
                    # A standard measure is anchored on the ingredient itself, not on a portion.
                    RecipeItem.objects.create(
                        recipe=item.recipe,
                        portion=None,
                        ingredient=seasoning,
                        quantity=item.quantity,
                        standard_measure_key="prise",
                        sort_order=item.sort_order,
                        note=item.note,
                        is_optional=item.is_optional,
                    )
                item.delete()
            if combined is not None:
                combined.deleted_at = timezone.now()
                combined.exclude_from_matching = True
                combined.save(update_fields=["deleted_at", "exclude_from_matching", "updated_at"])
        self.stdout.write(self.style.SUCCESS(f"{len(plan)} Zeilen aufgeteilt."))
