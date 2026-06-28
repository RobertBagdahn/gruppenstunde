"""Management command to sync all recipe nutritional tags from their ingredients."""

from django.core.management.base import BaseCommand

from recipe.models import Recipe
from recipe.services.recipe_checks import sync_recipe_nutritional_tags


class Command(BaseCommand):
    help = "Sync denormalized nutritional tags for all recipes from their ingredients."

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

        self.stdout.write(f"Syncing nutritional tags for {total_recipes} recipes...")

        updated_recipes_count = 0
        total_synced_tags_count = 0

        for i, recipe in enumerate(recipes.iterator(), start=1):
            # Check current tags
            current_tag_ids = set(recipe.nutritional_tags.values_list("id", flat=True))

            # Compute what tags would be synced (AND intersection — all ingredients must share the tag)
            from django.db.models import Count, Q
            from recipe.models import RecipeItem
            from supply.models.reference import NutritionalTag

            ingredient_ids = list(
                RecipeItem.objects.filter(recipe=recipe).values_list("portion__ingredient_id", flat=True).distinct()
            )
            new_tag_ids = set()
            if ingredient_ids:
                total = len(ingredient_ids)
                new_tag_ids = set(
                    NutritionalTag.objects.filter(ingredients__id__in=ingredient_ids)
                    .annotate(
                        ingredient_count=Count("ingredients", filter=Q(ingredients__id__in=ingredient_ids), distinct=True)
                    )
                    .filter(ingredient_count=total)
                    .values_list("id", flat=True)
                )

            has_changed = current_tag_ids != new_tag_ids

            if has_changed:
                updated_recipes_count += 1
                if not dry_run:
                    sync_recipe_nutritional_tags(recipe)

            total_synced_tags_count += len(new_tag_ids)

            if i % 100 == 0:
                self.stdout.write(f"  {i}/{total_recipes} done")

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f"Dry-run complete. Would update {updated_recipes_count} recipes.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Synced {total_recipes} recipes, {updated_recipes_count} recipes updated with {total_synced_tags_count} total tags synced."
                )
            )
