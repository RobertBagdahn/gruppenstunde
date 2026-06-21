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
        """Replicate the migration logic: divide by portions, set portions=1."""
        recipes = Recipe.objects.filter(portions__gt=1).exclude(portions__isnull=True)
        for recipe in recipes:
            portions = recipe.portions
            items = RecipeItem.objects.filter(recipe=recipe)
            for item in items:
                item.quantity = item.quantity / portions
                item.save(update_fields=["quantity"])
            recipe.portions = 1
            recipe.save(update_fields=["portions"])

    def test_normalizes_quantities(self):
        """Quantities should be divided by portions count."""
        mu = make_measuring_unit()
        ing = make_ingredient()
        portion = make_portion(ing, measuring_unit=mu)

        recipe = make_recipe(portions=4)
        ri = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=8.0, sort_order=0)

        self._normalize()

        recipe.refresh_from_db()
        ri.refresh_from_db()
        assert recipe.portions == 1
        assert ri.quantity == 2.0  # 8.0 / 4 = 2.0

    def test_skips_single_portion_recipes(self):
        """Recipes with portions=1 should not be changed."""
        mu = make_measuring_unit()
        ing = make_ingredient()
        portion = make_portion(ing, measuring_unit=mu)

        recipe = make_recipe(portions=1)
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

        recipe = make_recipe(portions=10)
        ri1 = RecipeItem.objects.create(recipe=recipe, portion=p1, quantity=100.0, sort_order=0)
        ri2 = RecipeItem.objects.create(recipe=recipe, portion=p2, quantity=50.0, sort_order=1)

        self._normalize()

        ri1.refresh_from_db()
        ri2.refresh_from_db()
        assert ri1.quantity == 10.0  # 100 / 10
        assert ri2.quantity == 5.0  # 50 / 10

    def test_skips_null_portions(self):
        """Recipes with portions=None should not be changed."""
        mu = make_measuring_unit()
        ing = make_ingredient()
        portion = make_portion(ing, measuring_unit=mu)

        recipe = make_recipe(portions=None)
        ri = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=5.0, sort_order=0)

        self._normalize()

        ri.refresh_from_db()
        assert ri.quantity == 5.0
