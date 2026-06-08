"""Calculate quality scores for all ingredients and recipes."""

from django.core.management.base import BaseCommand

from supply.models import Ingredient
from recipe.models import Recipe
from supply.services.quality_score import calculate_ingredient_quality_score
from recipe.services.quality_score import calculate_recipe_quality_score


class Command(BaseCommand):
    help = "Calculate quality scores for all ingredients and recipes"

    def add_arguments(self, parser):
        parser.add_argument("--type", type=str, default=None, help="'ingredient' or 'recipe', or omit for both")
        parser.add_argument("--batch-size", type=int, default=500, help="Batch size")

    def handle(self, *args, **options):
        item_type = options["type"]
        batch_size = options["batch_size"]

        if item_type is None or item_type == "ingredient":
            self._process_ingredients(batch_size)

        if item_type is None or item_type == "recipe":
            self._process_recipes(batch_size)

    def _process_ingredients(self, batch_size):
        ingredients = Ingredient.objects.all()
        total = ingredients.count()
        updated = 0

        for ing in ingredients.iterator(chunk_size=batch_size):
            score = calculate_ingredient_quality_score(ing)
            Ingredient.objects.filter(pk=ing.pk).update(quality_score=score)
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated}/{total} ingredients"))

    def _process_recipes(self, batch_size):
        recipes = Recipe.objects.all()
        total = recipes.count()
        updated = 0

        for recipe in recipes.iterator(chunk_size=batch_size):
            score = calculate_recipe_quality_score(recipe)
            Recipe.objects.filter(pk=recipe.pk).update(quality_score=score)
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated}/{total} recipes"))
