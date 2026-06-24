"""Tests for backfill_ingredient_usage_count management command."""

import pytest
from django.core.management import call_command

from recipe.tests import make_recipe, make_recipe_item
from supply.models import Ingredient, Portion
from supply.tests import make_ingredient, make_measuring_unit


@pytest.mark.django_db
class TestBackfillIngredientUsageCount:
    """Test the backfill_ingredient_usage_count management command."""

    def test_backfill_sets_usage_count_from_recipe_items(self):
        ing = make_ingredient(name="Tomaten")
        assert ing.usage_count == 0

        unit = make_measuring_unit()
        portion = Portion.objects.create(name="1 Tomate", ingredient=ing, measuring_unit=unit, quantity=1, weight_g=100)
        recipe1 = make_recipe()
        recipe2 = make_recipe()
        make_recipe_item(recipe=recipe1, portion=portion)
        make_recipe_item(recipe=recipe2, portion=portion)

        ing.usage_count = 0
        ing.save()

        call_command("backfill_ingredient_usage_count")

        ing.refresh_from_db()
        assert ing.usage_count == 2

    def test_backfill_sets_zero_for_unused_ingredients(self):
        make_ingredient(name="UnUsed", usage_count=5)

        call_command("backfill_ingredient_usage_count")

        unused = Ingredient.objects.get(name="UnUsed")
        assert unused.usage_count == 0

    def test_backfill_idempotent(self):
        ing = make_ingredient(name="Mehl")
        unit = make_measuring_unit()
        portion = Portion.objects.create(
            name="100g Mehl", ingredient=ing, measuring_unit=unit, quantity=100, weight_g=100
        )
        recipe = make_recipe()
        make_recipe_item(recipe=recipe, portion=portion)

        call_command("backfill_ingredient_usage_count")
        call_command("backfill_ingredient_usage_count")

        ing.refresh_from_db()
        assert ing.usage_count == 1
