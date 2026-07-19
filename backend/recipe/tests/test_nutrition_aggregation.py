import datetime as dt
from decimal import Decimal

import pytest
from django.utils import timezone
from model_bakery import baker

from planner.models import MealItem
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.services.nutrition_aggregation import (
    _aggregate_day_values,
    _aggregate_meal_plan_values,
    _aggregate_meal_values,
)
from recipe.services.recipe_checks import recalculate_recipe_cache
from recipe.services.suggestion_service import _evaluate_admin_rules
from recipe.tests import make_recipe, make_recipe_item, make_rule
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestNutritionAggregationPortionScaling:
    """Verify that _aggregate_meal_values scales recipe nutrients and price to Normportion correctly."""

    def test_aggregate_meal_values_normportion_scaling_cached(self):
        meal_plan = make_meal_plan()
        meal = make_meal(meal_plan=meal_plan)

        # Each recipe = 1 Normportion. Total weight = 800g → nutrient_scale = 800/100 = 8.0
        recipe = make_recipe(portions=1)
        ing = make_ingredient(
            name="Protein-Source",
            protein_g=12.0,
            price_per_kg=10.00,  # 10€ per kg
        )
        portion = make_portion(ingredient=ing, weight_g=800.0, name="800g Ingredient")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        # Recalculate cache to populate cached_weight_g and other cached fields
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        assert recipe.cached_weight_g == 800.0
        assert recipe.cached_protein_g == 12.0
        # 10.00€/kg * 0.8kg = 8.00€
        assert float(recipe.cached_price_total) == 8.00

        # Assign recipe to meal with factor = 1.5
        make_meal_item(meal=meal, recipe=recipe, factor=1.5)

        # Aggregate meal values
        totals = _aggregate_meal_values(meal)

        # Expected protein (Normportion):
        # 12.0g/100g * nutrient_scale (8.0) * factor (1.5) = 144.0g
        assert totals["protein_g"] == 144.0

        # Expected price (Normportion total * factor):
        # 8.00€ * 1.5 factor = 12.00€
        assert totals["price_total"] == 12.00
        assert totals["weight_g"] == 1200.0

    def test_aggregate_meal_values_normportion_scaling_uncached_fallback(self):
        meal_plan = make_meal_plan()
        meal = make_meal(meal_plan=meal_plan)

        # Each recipe = 1 Normportion. Total weight = 500g → nutrient_scale = 500/100 = 5.0
        # We do NOT recalculate cache, so cached_at is None (uncached fallback path)
        recipe = make_recipe(portions=1)
        ing = make_ingredient(
            name="Protein-Source",
            protein_g=10.0,
        )
        portion = make_portion(ingredient=ing, weight_g=500.0, name="500g Ingredient")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        # Assign recipe to meal with factor = 1.0
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        totals = _aggregate_meal_values(meal)

        # Expected protein (Normportion):
        # 10.0g/100g * nutrient_scale (5.0) * factor (1.0) = 50.0g
        assert totals["protein_g"] == 50.0
        assert totals["weight_g"] == 500.0

    def test_meal_with_two_recipes_different_factors(self):
        """A meal with two recipes aggregates Normportion values weighted by MealItem.factor."""
        meal_plan = make_meal_plan()
        meal = make_meal(meal_plan=meal_plan)

        # Recipe A: 200g total → scale 2.0, protein 10g/100g
        recipe_a = make_recipe(portions=1, title="Rezept A")
        ing_a = make_ingredient(name="Zutat A", protein_g=10.0)
        portion_a = make_portion(ingredient=ing_a, weight_g=200.0, name="200g A")
        make_recipe_item(recipe=recipe_a, portion=portion_a, ingredient=ing_a, quantity=1.0)

        # Recipe B: 100g total → scale 1.0, protein 20g/100g
        recipe_b = make_recipe(portions=1, title="Rezept B")
        ing_b = make_ingredient(name="Zutat B", protein_g=20.0)
        portion_b = make_portion(ingredient=ing_b, weight_g=100.0, name="100g B")
        make_recipe_item(recipe=recipe_b, portion=portion_b, ingredient=ing_b, quantity=1.0)

        make_meal_item(meal=meal, recipe=recipe_a, factor=2.0)
        make_meal_item(meal=meal, recipe=recipe_b, factor=0.5)

        totals = _aggregate_meal_values(meal)

        # A: 10 * 2.0 * 2.0 = 40.0; B: 20 * 1.0 * 0.5 = 10.0 → 50.0
        assert totals["protein_g"] == 50.0
        # weight: A 200*2.0 = 400; B 100*0.5 = 50 → 450
        assert totals["weight_g"] == 450.0

    def test_day_and_plan_aggregate_all_meal_types(self):
        meal_plan = make_meal_plan()
        today = dt.date.today()
        breakfast = make_meal(
            meal_plan=meal_plan,
            meal_type="breakfast",
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(8, 0))),
        )
        snack = make_meal(
            meal_plan=meal_plan,
            meal_type="snack",
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(15, 0))),
        )

        recipe = make_recipe(portions=1)
        ingredient = make_ingredient(name="Hafer", protein_g=10.0, sugar_g=2.0, price_per_kg=2.00)
        portion = make_portion(ingredient=ingredient, weight_g=400.0, name="400g Hafer")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)
        recalculate_recipe_cache(recipe)
        recipe.cached_nutri_class = 2
        recipe.save(update_fields=["cached_nutri_class"])

        make_meal_item(meal=breakfast, recipe=recipe, factor=1.0)
        make_meal_item(meal=snack, recipe=recipe, factor=1.0)

        day_values = _aggregate_day_values(meal_plan, today)
        plan_values = _aggregate_meal_plan_values(meal_plan)

        # Per meal: weight 400, protein 10*4.0 = 40, price 0.80€. Two meals → doubled.
        assert day_values["weight_g"] == 800.0
        assert day_values["price_total"] == 1.6
        assert day_values["protein_g"] == 80.0
        assert day_values["nutri_class"] == 2.0
        assert plan_values["weight_g"] == day_values["weight_g"]
        assert plan_values["price_total"] == day_values["price_total"]

    def test_person_factors_do_not_affect_aggregation(self):
        """norm_portions / reserve_factor must NOT change Normportion aggregates."""
        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Zutat", protein_g=10.0)
        portion = make_portion(ingredient=ing, weight_g=200.0, name="200g")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        plan_a = make_meal_plan(norm_portions=10, reserve_factor=1.1)
        meal_a = make_meal(meal_plan=plan_a)
        make_meal_item(meal=meal_a, recipe=recipe, factor=1.0)

        plan_b = make_meal_plan(norm_portions=50, reserve_factor=1.5)
        meal_b = make_meal(meal_plan=plan_b)
        make_meal_item(meal=meal_b, recipe=recipe, factor=1.0)

        totals_a = _aggregate_meal_values(meal_a)
        totals_b = _aggregate_meal_values(meal_b)

        # 10g/100g * 2.0 scale * 1.0 factor = 20.0 regardless of person factors
        assert totals_a["protein_g"] == 20.0
        assert totals_b["protein_g"] == 20.0
        assert totals_a["protein_g"] == totals_b["protein_g"]
        assert totals_a["weight_g"] == totals_b["weight_g"] == 200.0

    def test_standalone_ingredient_ml_uses_physical_density(self):
        """A direct ingredient with a 'ml' unit must convert via physical_density.

        Regression guard: the field is ``physical_density`` (not ``density``); a
        wrong attribute name raised AttributeError at runtime for every ml-unit
        standalone ingredient. Also verifies the standalone branch aggregates the
        nutrient correctly (per-normportion, scaled by factor only).
        """
        meal_plan = make_meal_plan(norm_portions=10, reserve_factor=1.1)
        meal = make_meal(meal_plan=meal_plan)

        ml_unit = make_measuring_unit(name="ml", unit="ml")
        # 50 kcal/100g, density 0.8 g/ml → 200ml = 160g
        ing = make_ingredient(name="Öl", energy_kcal=50.0, physical_density=0.8)

        baker.make(
            MealItem,
            meal=meal,
            recipe=None,
            ingredient=ing,
            quantity=Decimal("200"),
            measuring_unit=ml_unit,
            factor=1.0,
        )

        totals = _aggregate_meal_values(meal)

        # weight_g = 200ml * 0.8 = 160g; energy = 50/100 * 160 * factor(1.0) = 80.0
        assert totals["energy_kcal"] == pytest.approx(80.0)

    def test_meal_event_rule_uses_day_average_not_person_division(self):
        """meal_event-scope rules average the plan total over num_days only — no person division."""
        meal_plan = make_meal_plan(norm_portions=10, reserve_factor=1.1)
        day1 = dt.date.today()
        day2 = day1 + dt.timedelta(days=1)

        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Zutat", protein_g=10.0)
        portion = make_portion(ingredient=ing, weight_g=200.0, name="200g")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        recalculate_recipe_cache(recipe)

        # One meal per day, each contributing 10g/100g * 2.0 scale = 20.0g protein.
        for day in (day1, day2):
            meal = make_meal(
                meal_plan=meal_plan,
                start_datetime=timezone.make_aware(dt.datetime.combine(day, dt.time(12, 0))),
            )
            make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        # Plan total protein = 40.0; day average over 2 days = 20.0/day.
        # Person division (norm_portions=10) would instead yield 2.0 — must NOT happen.
        make_rule(
            name="Protein pro Tag",
            parameter="protein_g",
            scope="meal_event",
            max_green=None,
            max_yellow=None,
            min_green=15.0,
            min_yellow=10.0,
            unit="g",
        )

        suggestions = _evaluate_admin_rules(meal_plan)
        protein_event = [s for s in suggestions if s.scope == "event" and "Protein" in s.scope_label]
        assert len(protein_event) == 1
        # Day average is 20.0 → green
        assert protein_event[0].current_value == 20.0
        assert protein_event[0].status == "green"

    def test_evaluate_rules_returns_target_bounds_and_midpoint(self):
        from recipe.services.nutrition_aggregation import _evaluate_rules

        rule = make_rule(
            name="Fett limit",
            parameter="fat_g",
            scope="meal",
            min_green=10.0,
            max_green=30.0,
            unit="g",
        )
        values = {"fat_g": 25.0}
        evals = _evaluate_rules("meal", values)
        assert len(evals) == 1
        ev = evals[0]
        assert ev["min_green"] == 10.0
        assert ev["max_green"] == 30.0
        assert ev["target_mid"] == 20.0

    def test_event_rules_normalized_by_days_in_suggestions(self):
        day1 = dt.date(2026, 6, 3)
        day2 = day1 + dt.timedelta(days=1)
        day3 = day1 + dt.timedelta(days=2)
        meal_plan = make_meal_plan()

        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Zutat", protein_g=10.0)
        portion = make_portion(ingredient=ing, weight_g=200.0)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        recalculate_recipe_cache(recipe)

        # Create 3 meals on 3 different days to establish a 3-day plan duration
        meal1 = make_meal(
            meal_plan=meal_plan,
            start_datetime=timezone.make_aware(dt.datetime.combine(day1, dt.time(12, 0))),
        )
        make_meal(
            meal_plan=meal_plan,
            start_datetime=timezone.make_aware(dt.datetime.combine(day2, dt.time(12, 0))),
        )
        make_meal(
            meal_plan=meal_plan,
            start_datetime=timezone.make_aware(dt.datetime.combine(day3, dt.time(12, 0))),
        )

        make_meal_item(meal=meal1, recipe=recipe, factor=1.0)

        make_rule(
            name="Protein pro Tag",
            parameter="protein_g",
            scope="meal_event",
            min_green=30.0,
            max_green=60.0,
            unit="g",
        )

        suggestions = _evaluate_admin_rules(meal_plan)
        protein_event = [s for s in suggestions if s.scope == "event" and "Protein" in s.scope_label]
        assert len(protein_event) == 1
        s = protein_event[0]
        # Thresholds remain as original per-day values, not divided by num_days
        assert s.min_green == pytest.approx(30.0)
        assert s.max_green == pytest.approx(60.0)
        assert s.target_mid == pytest.approx(45.0)


@pytest.mark.django_db
class TestExternalMealEnergy:
    """Verify external meal energy is scaled by effective_portions."""

    def test_external_energy_scaled_by_effective_portions(self):
        meal_plan = make_meal_plan(norm_portions=5)
        meal = make_meal(meal_plan=meal_plan, is_external=True, external_energy_kcal=500)
        meal.refresh_from_db()

        result = _aggregate_meal_values(meal)
        assert result["energy_kcal"] == pytest.approx(2500.0)  # 500 * 5

    def test_external_energy_with_one_portion(self):
        meal_plan = make_meal_plan(norm_portions=1)
        meal = make_meal(meal_plan=meal_plan, is_external=True, external_energy_kcal=500)
        meal.refresh_from_db()

        result = _aggregate_meal_values(meal)
        assert result["energy_kcal"] == pytest.approx(500.0)  # 500 * 1

    def test_external_energy_fallback(self):
        meal_plan = make_meal_plan()
        meal = make_meal(
            meal_plan=meal_plan,
            is_external=True,
            external_energy_kcal=None,
            day_part_factor=0.25,
        )
        meal.refresh_from_db()

        result = _aggregate_meal_values(meal)
        from supply.data.dge_reference import NORM_PERSON_DAILY_KCAL

        assert result["energy_kcal"] == pytest.approx(NORM_PERSON_DAILY_KCAL * 0.25)
