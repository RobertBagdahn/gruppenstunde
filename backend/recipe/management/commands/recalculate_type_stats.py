"""Management command: recalculate RecipeTypeStats for all recipe types."""

from django.core.management.base import BaseCommand

from recipe.models import Recipe
from recipe.services.type_stats_service import recalculate_type_stats


class Command(BaseCommand):
    help = "Recalculate RecipeTypeStats for all recipe types with >=10 recipes"

    def handle(self, *args, **options):
        # Get all unique recipe_type values
        recipe_types = Recipe.objects.values_list("recipe_type", flat=True).distinct().order_by("recipe_type")

        count = 0
        for recipe_type in recipe_types:
            stats = recalculate_type_stats(recipe_type)
            if stats:
                count += 1
                self.stdout.write(
                    f"✓ {recipe_type}: {stats['count']} recipes, {len(stats.get('price_buckets', []))} price buckets"
                )
            else:
                self.stdout.write(f"⊘ {recipe_type}: fewer than 10 recipes (deleted stats)")

        self.stdout.write(self.style.SUCCESS(f"\nDone. {count} types with stats."))
