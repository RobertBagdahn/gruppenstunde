"""Management command to recalculate all recipe caches in bulk."""

from django.core.management.base import BaseCommand

from recipe.models import Recipe
from recipe.services.recipe_checks import recalculate_recipe_cache


class Command(BaseCommand):
    help = "Recalculate denormalized nutritional cache fields for all recipes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--stale-only",
            action="store_true",
            help="Only recalculate recipes where cached_at is NULL (stale cache).",
        )

    def handle(self, *args, **options):
        qs = Recipe.objects.all()
        if options["stale_only"]:
            qs = qs.filter(cached_at__isnull=True)

        total = qs.count()
        self.stdout.write(f"Recalculating cache for {total} recipes...")

        for i, recipe in enumerate(qs.iterator(), start=1):
            recalculate_recipe_cache(recipe)
            if i % 50 == 0:
                self.stdout.write(f"  {i}/{total} done")

        self.stdout.write(self.style.SUCCESS(f"Done. {total} recipes recalculated."))
