"""Management command to sync all recipe allergen tags from their ingredients."""

from django.core.management.base import BaseCommand

from recipe.models import Recipe
from recipe.services.recipe_checks import sync_recipe_allergen_tags
from supply.models.reference import NutritionalTag


class Command(BaseCommand):
    help = "Sync denormalized allergen tags for all recipes from their ingredients."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without saving changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        recipes = Recipe.objects.all()
        total_recipes = recipes.count()

        if dry_run:
            self.stdout.write("Running in DRY-RUN mode. No changes will be saved.")

        self.stdout.write(f"Syncing allergen tags for {total_recipes} recipes...")

        updated_recipes_count = 0
        total_dangerous_tags_count = 0

        for i, recipe in enumerate(recipes.iterator(), start=1):
            # Fetch current dangerous tags
            current_dangerous_tag_ids = set(
                recipe.nutritional_tags.filter(is_dangerous=True).values_list("id", flat=True)
            )

            # Compute new dangerous tags
            ingredient_ids = list(recipe.recipe_items.values_list("portion__ingredient_id", flat=True).distinct())
            if ingredient_ids:
                new_dangerous_tag_ids = set(
                    NutritionalTag.objects.filter(is_dangerous=True, ingredients__id__in=ingredient_ids).values_list(
                        "id", flat=True
                    )
                )
            else:
                new_dangerous_tag_ids = set()

            has_changed = current_dangerous_tag_ids != new_dangerous_tag_ids

            if has_changed:
                updated_recipes_count += 1
                if not dry_run:
                    # Perform actual sync
                    sync_recipe_allergen_tags(recipe)

            # Sum up current / updated dangerous tags
            total_dangerous_tags_count += len(new_dangerous_tag_ids)

            if i % 100 == 0:
                self.stdout.write(f"  {i}/{total_recipes} done")

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Dry-run complete. Would update {updated_recipes_count} recipes."))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Synced {total_recipes} recipes, {updated_recipes_count} recipes updated with {total_dangerous_tags_count} total dangerous tags."
                )
            )
