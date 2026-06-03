"""Tests for meal energy serialization."""

import pytest
from django.test import Client

from planner.schemas.meal_plan import MealItemOut, MealOut
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestMealEnergySerialization:
    def test_meal_item_energy_uses_recipe_total_energy_cache(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(servings=5, cached_energy_total_kj=1000.0)
        item = make_meal_item(meal=meal, recipe=recipe, factor=1.5)

        assert MealItemOut.resolve_energy_kj(item) == pytest.approx(3000.0)

    def test_meal_item_energy_is_none_without_total_energy_cache(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(servings=5, cached_energy_total_kj=None)
        item = make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        assert MealItemOut.resolve_energy_kj(item) is None

    def test_meal_total_energy_sums_items(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)
        recipe_one = make_recipe(servings=5, cached_energy_total_kj=1000.0)
        recipe_two = make_recipe(servings=10, cached_energy_total_kj=2000.0)
        make_meal_item(meal=meal, recipe=recipe_one, factor=1.5)
        make_meal_item(meal=meal, recipe=recipe_two, factor=0.5)

        assert MealOut.resolve_total_energy_kj(meal) == pytest.approx(4000.0)

    def test_meal_total_energy_matches_nutrition_summary(self):
        plan = make_meal_plan(norm_portions=8)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(servings=4)
        ingredient = make_ingredient(energy_kj=500.0, protein_g=0.0, fat_g=0.0, carbohydrate_g=0.0, sugar_g=0.0, fibre_g=0.0, salt_g=0.0)
        portion = make_portion(ingredient=ingredient, weight_g=200.0)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        meal.refresh_from_db()
        recipe.refresh_from_db()
        expected_total = recipe.cached_energy_total_kj * (plan.norm_portions / recipe.servings)
        assert MealOut.resolve_total_energy_kj(meal) == pytest.approx(expected_total)

        client = Client()
        client.force_login(plan.created_by)
        response = client.get(f"/api/meal-plans/{plan.id}/nutrition-summary/")

        assert response.status_code == 200
        assert response.json()["energy_kj"] == pytest.approx(MealOut.resolve_total_energy_kj(meal))
