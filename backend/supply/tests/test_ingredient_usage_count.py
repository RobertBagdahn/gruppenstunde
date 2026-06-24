"""Tests for Ingredient.usage_count signals — RecipeItem create/update/delete."""

import pytest

from recipe.models import RecipeItem
from recipe.tests import make_recipe, make_recipe_item
from supply.models import Portion
from supply.tests import make_ingredient, make_measuring_unit


@pytest.mark.django_db
class TestIngredientUsageCountSignals:
    """Test that RecipeItem create/update/delete correctly updates Ingredient.usage_count."""

    def test_create_recipe_item_increments_usage_count(self):
        ing = make_ingredient(name="Salz")
        assert ing.usage_count == 0

        unit = make_measuring_unit()
        portion = Portion.objects.create(name="1 Prise", ingredient=ing, measuring_unit=unit, quantity=1, weight_g=1)
        recipe = make_recipe()
        make_recipe_item(recipe=recipe, portion=portion)

        ing.refresh_from_db()
        assert ing.usage_count == 1

    def test_delete_recipe_item_decrements_usage_count(self):
        ing = make_ingredient(name="Pfeffer")
        unit = make_measuring_unit()
        portion = Portion.objects.create(name="1 Prise", ingredient=ing, measuring_unit=unit, quantity=1, weight_g=1)
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=portion)

        ing.refresh_from_db()
        assert ing.usage_count == 1

        item.delete()
        ing.refresh_from_db()
        assert ing.usage_count == 0

    def test_multiple_recipe_items_increment_correctly(self):
        ing = make_ingredient(name="Mehl")
        unit = make_measuring_unit()
        portion = Portion.objects.create(
            name="100g Mehl", ingredient=ing, measuring_unit=unit, quantity=100, weight_g=100
        )
        recipe1 = make_recipe()
        recipe2 = make_recipe()
        make_recipe_item(recipe=recipe1, portion=portion)
        make_recipe_item(recipe=recipe2, portion=portion)

        ing.refresh_from_db()
        assert ing.usage_count == 2

    def test_change_portion_updates_both_ingredients(self):
        ing_a = make_ingredient(name="Zucker")
        ing_b = make_ingredient(name="Salz")
        unit = make_measuring_unit()
        portion_a = Portion.objects.create(
            name="1 TL Zucker", ingredient=ing_a, measuring_unit=unit, quantity=1, weight_g=5
        )
        portion_b = Portion.objects.create(
            name="1 Prise Salz", ingredient=ing_b, measuring_unit=unit, quantity=1, weight_g=1
        )
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=portion_a)

        ing_a.refresh_from_db()
        assert ing_a.usage_count == 1

        item.portion = portion_b
        item.save()

        ing_a.refresh_from_db()
        ing_b.refresh_from_db()
        assert ing_a.usage_count == 0
        assert ing_b.usage_count == 1

    def test_usage_count_never_goes_below_zero(self):
        ing = make_ingredient(name="Basilikum")
        ing.usage_count = 0
        ing.save()

        unit = make_measuring_unit()
        portion = Portion.objects.create(name="1 Blatt", ingredient=ing, measuring_unit=unit, quantity=1, weight_g=0.5)

        # Delete a RecipeItem that references this ingredient when count is 0
        recipe = make_recipe()
        make_recipe_item(recipe=recipe, portion=portion)
        # Normal delete should decrement but not go below 0
        RecipeItem.objects.filter(recipe=recipe).delete()
        ing.refresh_from_db()
        assert ing.usage_count == 0
