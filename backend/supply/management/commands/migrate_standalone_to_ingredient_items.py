"""Management command to migrate standalone food MealItems.

Converts MealItems that were using dummy recipes (recipe_type='ingredient')
to ingredient-based MealItems. This is idempotent — can be run multiple times safely.

Before this command, standalone foods were stored as:
- Ingredient (is_standalone_food=True)
- Dummy Recipe (recipe_type='ingredient', created by signal)
- MealItem pointing to Dummy Recipe

After this command:
- Ingredient (is_standalone_food=True, standalone_type removed)
- MealItem pointing directly to Ingredient
- Dummy Recipes are deleted
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from planner.models import MealItem
from recipe.models import Recipe


class Command(BaseCommand):
    help = (
        "Migrate standalone food MealItems from dummy recipes to ingredient-based items. "
        "Idempotent — safe to run multiple times."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without making changes",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        # Find all dummy recipes (recipe_type='ingredient')
        dummy_recipes = Recipe.objects.filter(recipe_type="ingredient")
        migrated_count = 0
        failed_count = 0

        for dummy_recipe in dummy_recipes:
            # Find MealItems pointing to this dummy recipe
            meal_items = MealItem.objects.filter(recipe=dummy_recipe)

            for meal_item in meal_items:
                try:
                    # Get the ingredient from the dummy recipe's RecipeItem
                    recipe_item = dummy_recipe.recipe_items.select_related("portion__ingredient").first()
                    if not recipe_item or not recipe_item.portion or not recipe_item.portion.ingredient:
                        self.stdout.write(
                            self.style.WARNING(f"Dummy recipe #{dummy_recipe.pk} has no ingredient, skipping")
                        )
                        failed_count += 1
                        continue

                    ingredient = recipe_item.portion.ingredient

                    if not dry_run:
                        # Update MealItem to point to ingredient instead of recipe
                        meal_item.recipe = None
                        meal_item.ingredient = ingredient
                        # Preserve quantity/measuring_unit from recipe_item if not set
                        if not meal_item.quantity and recipe_item.quantity:
                            meal_item.quantity = recipe_item.quantity
                        if not meal_item.measuring_unit and recipe_item.portion:
                            meal_item.measuring_unit = recipe_item.portion.measuring_unit
                        meal_item.save()

                    migrated_count += 1
                    self.stdout.write(f"  MealItem #{meal_item.pk} → Ingredient #{ingredient.pk}")

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to migrate MealItem #{meal_item.pk}: {e}"))
                    failed_count += 1
                    if not dry_run:
                        raise

        # Delete dummy recipes (only if no MealItems reference them anymore)
        deleted_count = 0
        remaining_dummy = Recipe.objects.filter(recipe_type="ingredient")
        for dummy_recipe in remaining_dummy:
            if not MealItem.objects.filter(recipe=dummy_recipe).exists():
                if not dry_run:
                    dummy_recipe.delete()
                deleted_count += 1
                self.stdout.write(f"  Deleted dummy recipe #{dummy_recipe.pk}")

        # Summary
        self.stdout.write(self.style.SUCCESS("\n✓ Migration complete"))
        self.stdout.write(f"  Migrated MealItems: {migrated_count}")
        self.stdout.write(f"  Deleted dummy recipes: {deleted_count}")
        if failed_count:
            self.stdout.write(self.style.ERROR(f"  Failed: {failed_count}"))

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry run — no changes made. Run again without --dry-run to apply."))
