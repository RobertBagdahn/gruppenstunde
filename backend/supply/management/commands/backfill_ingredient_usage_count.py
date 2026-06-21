"""Management command to backfill Ingredient.usage_count from RecipeItem counts."""

from django.core.management.base import BaseCommand
from django.db.models import Count, OuterRef, Subquery

from recipe.models import RecipeItem
from supply.models import Ingredient


class Command(BaseCommand):
    help = "Backfill Ingredient.usage_count from actual RecipeItem counts"

    def handle(self, *args, **options):
        subquery = (
            RecipeItem.objects.filter(portion__ingredient_id=OuterRef("pk"))
            .values("portion__ingredient_id")
            .annotate(cnt=Count("id"))
            .values("cnt")
        )

        updated = Ingredient.objects.update(usage_count=0)

        ingredients_with_counts = (
            RecipeItem.objects.filter(portion__ingredient__isnull=False)
            .values("portion__ingredient_id")
            .annotate(cnt=Count("id"))
        )

        count = 0
        for entry in ingredients_with_counts:
            Ingredient.objects.filter(pk=entry["portion__ingredient_id"]).update(
                usage_count=entry["cnt"]
            )
            count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Updated usage_count for {count} ingredients.")
        )