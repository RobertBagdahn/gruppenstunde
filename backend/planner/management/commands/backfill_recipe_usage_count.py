"""Management command to backfill Recipe.usage_count from MealItem counts."""

from django.core.management.base import BaseCommand
from django.db.models import Count, Subquery, OuterRef

from planner.models.meal_plan import MealItem
from recipe.models import Recipe


class Command(BaseCommand):
    help = "Backfill Recipe.usage_count from actual MealItem counts"

    def handle(self, *args, **options):
        subquery = (
            MealItem.objects.filter(recipe_id=OuterRef("pk"))
            .values("recipe_id")
            .annotate(cnt=Count("id"))
            .values("cnt")
        )

        # Reset all to 0 first
        Recipe.objects.update(usage_count=0)

        # Update recipes that have MealItems
        recipes_with_counts = (
            MealItem.objects.filter(recipe_id__isnull=False)
            .values("recipe_id")
            .annotate(cnt=Count("id"))
        )

        updated = 0
        for entry in recipes_with_counts:
            Recipe.objects.filter(pk=entry["recipe_id"]).update(
                usage_count=entry["cnt"]
            )
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(f"Updated usage_count for {updated} recipes.")
        )
