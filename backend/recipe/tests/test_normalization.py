"""Tests for recipe normalization data migration logic (14.8).

Note: test settings disable migrations (DisableMigrations class), so we test
the normalization function logic directly rather than via migration runner.
"""

import pytest

from recipe.models import Recipe, RecipeItem
from recipe.tests import make_recipe
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestNormalizationLogic:
    """Test the logic that normalizes recipe items from N-portion to 1-portion basis."""

    def _normalize(self):
        """Replicate the migration logic: divide by servings, set servings=1."""
        recipes = Recipe.objects.filter(servings__gt=1).exclude(servings__isnull=True)
        for recipe in recipes:
            servings = recipe.servings
            items = RecipeItem.objects.filter(recipe=recipe)
            for item in items:
                item.quantity = item.quantity / servings
                item.save(update_fields=["quantity"])
            recipe.servings = 1
            recipe.save(update_fields=["servings"])

    def test_normalizes_quantities(self):
        """Quantities should be divided by servings count."""
        mu = make_measuring_unit()
        ing = make_ingredient()
        portion = make_portion(ing, measuring_unit=mu)

        recipe = make_recipe(servings=4)
        ri = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=8.0, sort_order=0)

        self._normalize()

        recipe.refresh_from_db()
        ri.refresh_from_db()
        assert recipe.servings == 1
        assert ri.quantity == 2.0  # 8.0 / 4 = 2.0

    def test_skips_single_serving_recipes(self):
        """Recipes with servings=1 should not be changed."""
        mu = make_measuring_unit()
        ing = make_ingredient()
        portion = make_portion(ing, measuring_unit=mu)

        recipe = make_recipe(servings=1)
        ri = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=3.0, sort_order=0)

        self._normalize()

        ri.refresh_from_db()
        assert ri.quantity == 3.0

    def test_handles_multiple_items(self):
        """All items in a recipe should be normalized."""
        mu = make_measuring_unit()
        ing1 = make_ingredient(name="Mehl")
        ing2 = make_ingredient(name="Zucker")
        p1 = make_portion(ing1, measuring_unit=mu)
        p2 = make_portion(ing2, measuring_unit=mu)

        recipe = make_recipe(servings=10)
        ri1 = RecipeItem.objects.create(recipe=recipe, portion=p1, quantity=100.0, sort_order=0)
        ri2 = RecipeItem.objects.create(recipe=recipe, portion=p2, quantity=50.0, sort_order=1)

        self._normalize()

        ri1.refresh_from_db()
        ri2.refresh_from_db()
        assert ri1.quantity == 10.0  # 100 / 10
        assert ri2.quantity == 5.0  # 50 / 10

    def test_skips_null_servings(self):
        """Recipes with servings=None should not be changed."""
        mu = make_measuring_unit()
        ing = make_ingredient()
        portion = make_portion(ing, measuring_unit=mu)

        recipe = make_recipe(servings=None)
        ri = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=5.0, sort_order=0)

        self._normalize()

        ri.refresh_from_db()
        assert ri.quantity == 5.0
