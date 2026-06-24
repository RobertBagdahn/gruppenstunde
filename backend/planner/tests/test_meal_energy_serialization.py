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
        recipe = make_recipe(portions=5, cached_energy_total_kcal=239.0)
        item = make_meal_item(meal=meal, recipe=recipe, factor=1.5)

        assert MealItemOut.resolve_energy_kcal(item) == pytest.approx(717.0)

    def test_meal_item_energy_is_none_without_total_energy_cache(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=5, cached_energy_total_kcal=None)
        item = make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        assert MealItemOut.resolve_energy_kcal(item) is None

    def test_meal_total_energy_sums_items(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)
        recipe_one = make_recipe(portions=5, cached_energy_total_kcal=239.0)
        recipe_two = make_recipe(portions=10, cached_energy_total_kcal=478.0)
        make_meal_item(meal=meal, recipe=recipe_one, factor=1.5)
        make_meal_item(meal=meal, recipe=recipe_two, factor=0.5)

        assert MealOut.resolve_total_energy_kcal(meal) == pytest.approx(956.0)

    def test_meal_total_energy_matches_nutrition_summary(self):
        plan = make_meal_plan(norm_portions=8)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=4)
        ingredient = make_ingredient(energy_kcal=120, protein_g=0.0, fat_g=0.0, carbohydrate_g=0.0, sugar_g=0.0, fibre_g=0.0, salt_g=0.0)
        portion = make_portion(ingredient=ingredient, weight_g=200.0)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        meal.refresh_from_db()
        recipe.refresh_from_db()
        expected_total = recipe.cached_energy_total_kcal * (plan.norm_portions / recipe.portions)
        assert MealOut.resolve_total_energy_kcal(meal) == pytest.approx(expected_total)

        client = Client()
        client.force_login(plan.created_by)
        response = client.get(f"/api/meal-plans/{plan.id}/nutrition-summary/")

        assert response.status_code == 200
        assert response.json()["energy_kcal"] == pytest.approx(MealOut.resolve_total_energy_kcal(meal))

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

        recipe1 = make_recipe(portions=1)
        ing1 = make_ingredient(protein_g=10.0, energy_kcal=0, fat_g=0, carbohydrate_g=0, sugar_g=0, fibre_g=0, salt_g=0)
        portion1 = make_portion(ingredient=ing1, weight_g=100.0)
        make_recipe_item(recipe=recipe1, portion=portion1, ingredient=ing1, quantity=1.0)
        make_meal_item(meal=meal1, recipe=recipe1, factor=1.0)

        recipe2 = make_recipe(portions=1)
        ing2 = make_ingredient(protein_g=25.0, energy_kcal=0, fat_g=0, carbohydrate_g=0, sugar_g=0, fibre_g=0, salt_g=0)
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

    def test_external_meal_serialization_and_total_energy_kcal(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan, is_external=True, external_energy_kcal=500.0)

        # external_energy_kcal is per person; total_energy_kcal is the GESAMT value
        # over effective_portions, symmetric to total_cost_eur.
        assert MealOut.resolve_external_energy_kcal(meal) == pytest.approx(500.0)
        assert MealOut.resolve_total_energy_kcal(meal) == pytest.approx(5000.0)
        assert MealOut.resolve_total_cost_eur(meal) == 0.0

    def test_external_meal_energy_uses_override_portions(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(
            meal_plan=plan, is_external=True, external_energy_kcal=500.0, override_portions=20
        )
        assert MealOut.resolve_total_energy_kcal(meal) == pytest.approx(10000.0)

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
        # day_part_factor propagation has been removed per specifications
        assert meal.day_part_factor == 0.25

    def test_aggregate_meal_values_external_meal(self):
        from recipe.services.nutrition_aggregation import _aggregate_meal_values
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan, is_external=True, external_energy_kcal=600.0)

        totals = _aggregate_meal_values(meal)
        assert totals["energy_kcal"] == pytest.approx(600.0)
        assert totals["protein_g"] == 0.0
        assert totals["price_total"] == 0.0

    def test_external_meal_cockpit_is_neutral(self):
        from recipe.services.nutrition_aggregation import evaluate_meal_cockpit
        from recipe.tests import make_rule
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan, is_external=True, external_energy_kcal=500.0)

        make_rule(name="Energy", parameter="energy_kcal", scope="meal", min_green=100.0, max_green=200.0)

        cockpit = evaluate_meal_cockpit(meal)
        assert cockpit["summary_status"] == "green"
        for ev in cockpit["evaluations"]:
            assert ev["status"] == "green"
            assert ev["min_green"] == ev["current_value"]
            assert ev["max_green"] == ev["current_value"]

    def test_meal_with_ingredient_item(self):
        """Test meal with ingredient item."""
        from model_bakery import baker
        from supply.models import MeasuringUnit
        
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)
        
        # Create ingredient with nutrition info
        ingredient = make_ingredient(
            energy_kcal=150.0,
            protein_g=20.0,
            fat_g=5.0,
            carbohydrate_g=0.0,
            sugar_g=0.0,
            fibre_g=0.0,
            salt_g=0.0,
            price_per_kg=8.0
        )
        g_unit = MeasuringUnit.objects.get(name="g")
        make_portion(ingredient=ingredient, measuring_unit=g_unit, weight_g=1.0)
        
        # Create meal item with ingredient (no recipe)
        meal_item = baker.make(
            "planner.MealItem",
            meal=meal,
            recipe=None,
            ingredient=ingredient,
            quantity=200,
            measuring_unit=g_unit,
            factor=1.0
        )
        
        # Ingredient meal energy: 300 kcal (150 kcal/100g × 200g)
        ingredient_energy = MealOut.resolve_total_energy_kcal(meal)
        assert ingredient_energy == pytest.approx(300.0)
        
        # Ingredient meal cost: 200g × 8€/kg = 1.6€
        ingredient_cost = MealOut.resolve_total_cost_eur(meal)
        assert ingredient_cost == pytest.approx(1.6)

    def test_pure_ingredient_meal(self):
        """Test meal with only ingredient items."""
        from model_bakery import baker
        from recipe.services.nutrition_aggregation import _aggregate_meal_values
        from supply.models import MeasuringUnit
        
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)
        
        # Two ingredient items
        ingredient1 = make_ingredient(
            energy_kcal=100.0,
            protein_g=5.0,
            fat_g=2.0,
            carbohydrate_g=15.0,
            sugar_g=5.0,
            fibre_g=1.0,
            salt_g=0.1,
            price_per_kg=5.0
        )
        g_unit = MeasuringUnit.objects.get(name="g")
        make_portion(ingredient=ingredient1, measuring_unit=g_unit, weight_g=1.0)
        
        ingredient2 = make_ingredient(
            energy_kcal=50.0,
            protein_g=2.0,
            fat_g=1.0,
            carbohydrate_g=8.0,
            sugar_g=2.0,
            fibre_g=0.5,
            salt_g=0.05,
            price_per_kg=3.0
        )
        make_portion(ingredient=ingredient2, measuring_unit=g_unit, weight_g=1.0)
        
        # 250g of ingredient1 (100 kcal/100g) = 250 kcal
        baker.make(
            "planner.MealItem",
            meal=meal,
            recipe=None,
            ingredient=ingredient1,
            quantity=250,
            measuring_unit=g_unit,
            factor=1.0
        )
        
        # 150g of ingredient2 (50 kcal/100g) = 75 kcal
        baker.make(
            "planner.MealItem",
            meal=meal,
            recipe=None,
            ingredient=ingredient2,
            quantity=150,
            measuring_unit=g_unit,
            factor=1.0
        )
        
        totals = _aggregate_meal_values(meal)
        
        # Total energy: 250 + 75 = 325 kcal
        assert totals["energy_kcal"] == pytest.approx(325.0)
        
        # Total protein: 250g * 5/100 + 150g * 2/100 = 12.5 + 3 = 15.5g
        assert totals["protein_g"] == pytest.approx(15.5)
        
        # Total cost: 250g * 5€/kg + 150g * 3€/kg = 1.25 + 0.45 = 1.70€
        assert totals["price_total"] == pytest.approx(1.70)
        
        # Total weight: 250 + 150 = 400g
        assert totals["weight_g"] == pytest.approx(400.0)
