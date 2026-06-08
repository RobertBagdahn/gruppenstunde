"""Tests for recipe total energy cache calculation."""

import pytest

from recipe.services.recipe_checks import recalculate_recipe_cache
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestRecipeEnergyTotalCache:
    def test_recalculate_recipe_cache_sets_total_energy_from_weight(self):
        recipe = make_recipe(servings=4)
        ingredient = make_ingredient(energy_kcal=120)
        portion = make_portion(ingredient=ingredient, weight_g=200.0)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=2.0)

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        expected_total = ingredient.energy_kcal * (item.quantity * item.portion.weight_g / 100.0)
        assert recipe.cached_energy_kcal == pytest.approx(120.0)
        assert recipe.cached_energy_total_kcal == pytest.approx(expected_total)

    def test_recipe_item_save_updates_total_energy_cache(self):
        recipe = make_recipe(servings=4)
        ingredient = make_ingredient(energy_kcal=120)
        portion = make_portion(ingredient=ingredient, weight_g=100.0)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)

        recipe.refresh_from_db()
        assert recipe.cached_energy_total_kcal == pytest.approx(120.0)

        item.quantity = 2.0
        item.save()

        recipe.refresh_from_db()
        assert recipe.cached_energy_total_kcal == pytest.approx(240.0)

    def test_recipe_item_delete_clears_total_energy_cache(self):
        recipe = make_recipe(servings=4)
        ingredient = make_ingredient(energy_kcal=120)
        portion = make_portion(ingredient=ingredient, weight_g=100.0)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)

        recipe.refresh_from_db()
        assert recipe.cached_energy_total_kcal == pytest.approx(120.0)

        item.delete()

        recipe.refresh_from_db()
        assert recipe.cached_energy_total_kcal is None
