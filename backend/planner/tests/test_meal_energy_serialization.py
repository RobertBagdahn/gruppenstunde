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

    def test_nutrition_summary_with_date_filter(self):
        import datetime as dt
        from django.utils import timezone
        plan = make_meal_plan(norm_portions=1)
        day1 = dt.date(2026, 6, 3)
        day2 = day1 + dt.timedelta(days=1)

        meal1 = make_meal(
            meal_plan=plan,
            start_datetime=timezone.make_aware(dt.datetime.combine(day1, dt.time(8, 0)))
        )
        meal2 = make_meal(
            meal_plan=plan,
            start_datetime=timezone.make_aware(dt.datetime.combine(day2, dt.time(12, 0)))
        )

        recipe1 = make_recipe(servings=1)
        ing1 = make_ingredient(protein_g=10.0, energy_kj=0, fat_g=0, carbohydrate_g=0, sugar_g=0, fibre_g=0, salt_g=0)
        portion1 = make_portion(ingredient=ing1, weight_g=100.0)
        make_recipe_item(recipe=recipe1, portion=portion1, ingredient=ing1, quantity=1.0)
        make_meal_item(meal=meal1, recipe=recipe1, factor=1.0)

        recipe2 = make_recipe(servings=1)
        ing2 = make_ingredient(protein_g=25.0, energy_kj=0, fat_g=0, carbohydrate_g=0, sugar_g=0, fibre_g=0, salt_g=0)
        portion2 = make_portion(ingredient=ing2, weight_g=100.0)
        make_recipe_item(recipe=recipe2, portion=portion2, ingredient=ing2, quantity=1.0)
        make_meal_item(meal=meal2, recipe=recipe2, factor=1.0)

        client = Client()
        client.force_login(plan.created_by)

        # No filter: should return sum of both (10.0 + 25.0 = 35.0g)
        response = client.get(f"/api/meal-plans/{plan.id}/nutrition-summary/")
        assert response.status_code == 200
        assert response.json()["protein_g"] == pytest.approx(35.0)

        # Day 1 filter: should return 10.0g
        response = client.get(f"/api/meal-plans/{plan.id}/nutrition-summary/?date=2026-06-03")
        assert response.status_code == 200
        assert response.json()["protein_g"] == pytest.approx(10.0)

        # Day 2 filter: should return 25.0g
        response = client.get(f"/api/meal-plans/{plan.id}/nutrition-summary/?date=2026-06-04")
        assert response.status_code == 200
        assert response.json()["protein_g"] == pytest.approx(25.0)

    def test_external_meal_serialization_and_total_energy_kj(self):
        from recipe.services.nutrition_units import kcal_to_kj
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan, is_external=True, external_energy_kj=kcal_to_kj(500.0))

        assert MealOut.resolve_external_energy_kcal(meal) == pytest.approx(500.0)
        assert MealOut.resolve_total_energy_kj(meal) == pytest.approx(kcal_to_kj(500.0))
        assert MealOut.resolve_total_cost_eur(meal) == 0.0

    def test_meal_plan_day_part_factor_propagation(self):
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan, meal_type="breakfast", day_part_factor=0.25)

        # Update plan's factors
        plan.day_part_factors = {
            "breakfast": 0.30,
            "lunch": 0.35,
            "dinner": 0.30,
            "snack": 0.10,
            "dessert": 0.00,
        }
        plan.save()

        meal.refresh_from_db()
        assert meal.day_part_factor == 0.30

    def test_aggregate_meal_values_external_meal(self):
        from recipe.services.nutrition_aggregation import _aggregate_meal_values
        from recipe.services.nutrition_units import kcal_to_kj
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan, is_external=True, external_energy_kj=kcal_to_kj(600.0))

        totals = _aggregate_meal_values(meal)
        assert totals["energy_kj"] == pytest.approx(kcal_to_kj(600.0))
        assert totals["protein_g"] == 0.0
        assert totals["price_total"] == 0.0

    def test_external_meal_cockpit_is_neutral(self):
        from recipe.services.nutrition_aggregation import evaluate_meal_cockpit
        from recipe.services.nutrition_units import kcal_to_kj
        from recipe.tests import make_rule
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan, is_external=True, external_energy_kj=kcal_to_kj(500.0))

        make_rule(name="Energy", parameter="energy_kj", scope="meal", min_green=100.0, max_green=200.0)

        cockpit = evaluate_meal_cockpit(meal)
        assert cockpit["summary_status"] == "green"
        for ev in cockpit["evaluations"]:
            assert ev["status"] == "green"
            assert ev["min_green"] == ev["current_value"]
            assert ev["max_green"] == ev["current_value"]
