"""Tests for recipe total energy cache calculation."""

import pytest

from recipe.models import RecipeItemExchangeGroup
from recipe.services.recipe_checks import recalculate_recipe_cache
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestRecipeEnergyTotalCache:
    def test_recalculate_recipe_cache_sets_total_energy_from_weight(self):
        recipe = make_recipe(portions=4)
        ingredient = make_ingredient(energy_kcal=120)
        portion = make_portion(ingredient=ingredient, weight_g=200.0)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=2.0)

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        expected_total = ingredient.energy_kcal * (item.quantity * item.portion.weight_g / 100.0)
        assert recipe.cached_energy_kcal == pytest.approx(120.0)
        assert recipe.cached_energy_total_kcal == pytest.approx(expected_total)

    def test_recipe_item_save_updates_total_energy_cache(self):
        recipe = make_recipe(portions=4)
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
        recipe = make_recipe(portions=4)
        ingredient = make_ingredient(energy_kcal=120)
        portion = make_portion(ingredient=ingredient, weight_g=100.0)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)

        recipe.refresh_from_db()
        assert recipe.cached_energy_total_kcal == pytest.approx(120.0)

        item.delete()

        recipe.refresh_from_db()
        assert recipe.cached_energy_total_kcal is None


@pytest.mark.django_db
class TestCacheExcludesExchangeAlternatives:
    def test_cache_excludes_exchange_alternatives(self):
        recipe = make_recipe(portions=1)
        ing_normal = make_ingredient(name="Normal", energy_kcal=100)
        ing_primary = make_ingredient(name="Primary", energy_kcal=200)
        ing_alt = make_ingredient(name="Alternative", energy_kcal=500)

        portion_normal = make_portion(ingredient=ing_normal, weight_g=100.0)
        portion_primary = make_portion(ingredient=ing_primary, weight_g=100.0)
        portion_alt = make_portion(ingredient=ing_alt, weight_g=100.0)

        make_recipe_item(recipe=recipe, portion=portion_normal, quantity=1.0)
        primary = make_recipe_item(recipe=recipe, portion=portion_primary, quantity=1.0)
        alt = make_recipe_item(recipe=recipe, portion=portion_alt, quantity=1.0)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        primary.exchange_group = group
        primary.exchange_position = 0
        primary.save()
        alt.exchange_group = group
        alt.exchange_position = 1
        alt.save()

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        # Only normal (100) + primary (200) = 300 kcal expected
        expected_total = 100.0 + 200.0
        assert recipe.cached_energy_total_kcal == pytest.approx(expected_total, abs=0.5)

    def test_cache_includes_optional_items(self):
        recipe = make_recipe(portions=1)
        ing_normal = make_ingredient(name="Normal", energy_kcal=100)
        ing_optional = make_ingredient(name="Optional", energy_kcal=300)

        portion_normal = make_portion(ingredient=ing_normal, weight_g=100.0)
        portion_optional = make_portion(ingredient=ing_optional, weight_g=100.0)

        make_recipe_item(recipe=recipe, portion=portion_normal, quantity=1.0)
        opt = make_recipe_item(recipe=recipe, portion=portion_optional, quantity=1.0)
        opt.is_optional = True
        opt.save()

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        # Both items included: 100 + 300 = 400 kcal
        expected_total = 100.0 + 300.0
        assert recipe.cached_energy_total_kcal == pytest.approx(expected_total, abs=0.5)
