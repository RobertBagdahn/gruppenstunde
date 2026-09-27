"""Read-only audit for gram portions and obvious weight anomalies."""

from collections import defaultdict

from django.core.management.base import BaseCommand

from recipe.models import RecipeItem
from supply.models import Portion


class Command(BaseCommand):
    help = "Audit gram portion variants, missing weights and obvious placeholders without changing data."

    def handle(self, *args, **options):
        active = Portion.objects.active().select_related("ingredient", "measuring_unit")
        gram_groups: dict[int, list[dict]] = defaultdict(list)
        missing_weight = 0
        one_gram = 0

        for portion in active.iterator():
            if portion.weight_g is None:
                missing_weight += 1
            if portion.weight_g == 1:
                one_gram += 1

            unit = portion.measuring_unit
            if not unit or unit.unit != "g":
                continue
            normalized_name = (portion.name or "").strip().casefold()
            if normalized_name not in {"g", "gramm", "gram", "100g", "100 g"}:
                continue

            gram_groups[portion.ingredient_id].append(
                {
                    "id": portion.id,
                    "ingredient": portion.ingredient.name,
                    "name": portion.name,
                    "quantity": float(portion.quantity),
                    "weight_g": portion.weight_g,
                    "rank": portion.rank,
                    "recipe_items": RecipeItem.objects.filter(portion=portion).count(),
                }
            )

        self.stdout.write(f"ACTIVE_PORTIONS {active.count()}")
        self.stdout.write(f"MISSING_WEIGHT {missing_weight}")
        self.stdout.write(f"ONE_GRAM {one_gram}")
        self.stdout.write("GRAM_VARIANT_GROUPS")
        duplicate_groups = 0
        for portions in sorted(gram_groups.values(), key=lambda values: values[0]["ingredient"]):
            if len(portions) > 1:
                duplicate_groups += 1
                self.stdout.write(repr(portions))
        self.stdout.write(f"GRAM_COUNT {sum(len(items) for items in gram_groups.values())}")
        self.stdout.write(f"GRAM_GROUPS {duplicate_groups}")
