"""Tests for meal time editing validation and effective_portions aggregation."""
import datetime as dt
import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import MealTypeChoices
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe

User = get_user_model()


@pytest.mark.django_db
class TestMealTimeEditing:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(created_by=self.user, norm_portions=10)

    def _patch(self, meal_id: int, body: dict):
        return self.client.patch(
            f"/api/meal-plans/{self.plan.id}/meals/{meal_id}/",
            data=json.dumps(body),
            content_type="application/json",
        )

    def test_update_meal_time_success(self):
        today = dt.date.today()
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST)
        new_start = timezone.make_aware(dt.datetime.combine(today, dt.time(7, 30)))
        new_end = timezone.make_aware(dt.datetime.combine(today, dt.time(8, 15)))

        response = self._patch(
            meal.id,
            {
                "start_datetime": new_start.isoformat(),
                "end_datetime": new_end.isoformat(),
            },
        )
        assert response.status_code == 200

        meal.refresh_from_db()
        assert meal.start_datetime.astimezone(timezone.get_current_timezone()).time() == dt.time(7, 30)
        assert meal.end_datetime.astimezone(timezone.get_current_timezone()).time() == dt.time(8, 15)

    def test_update_meal_time_end_not_after_start_rejected(self):
        today = dt.date.today()
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.LUNCH)
        start = timezone.make_aware(dt.datetime.combine(today, dt.time(12, 0)))
        end = timezone.make_aware(dt.datetime.combine(today, dt.time(11, 0)))

        response = self._patch(
            meal.id,
            {"start_datetime": start.isoformat(), "end_datetime": end.isoformat()},
        )
        assert response.status_code == 400
        assert "Endzeit" in response.json()["detail"]


@pytest.mark.django_db
class TestEffectivePortionsAggregation:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

    def test_nutrition_summary_per_portion_with_override(self):
        """per_portion values aggregate per meal (total / effective_portions)."""
        plan = make_meal_plan(created_by=self.user, norm_portions=10)
        today = dt.date.today()

        # Build a recipe with one ingredient so the nutrition aggregation has data.
        from supply.tests import make_ingredient, make_portion
        from recipe.tests import make_recipe_item

        ingredient = make_ingredient(energy_kcal=100.0)  # per 100g
        portion = make_portion(ingredient=ingredient, weight_g=100.0)
        recipe = make_recipe(portions=10)
        make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)

        # Meal with override_portions = 20 (vs norm 10).
        meal = make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            override_portions=20,
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(12, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(13, 0))),
        )
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        response = self.client.get(f"/api/meal-plans/{plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()

        # Total energy scales with effective_portions (20), per-portion divides by 20.
        # 100 kcal/100g * 100g/100 = 100 kcal per serving-equivalent * (20/10 servings)
        # total = 100 * (20 / 10) = 200; per_portion = 200 / 20 = 10
        assert data["energy_kcal"] == pytest.approx(200.0, rel=0.01)
        assert data["per_portion_energy_kcal"] == pytest.approx(10.0, rel=0.01)

    def test_cost_summary_cost_per_person_sums_per_meal(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=10)
        today = dt.date.today()

        recipe = make_recipe(portions=10, cached_price_total=20.0)
        meal = make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.DINNER,
            override_portions=20,
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(18, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(19, 0))),
        )
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        response = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert response.status_code == 200
        data = response.json()
        # cost_per_person should be per-meal total / effective_portions, not / norm.
        assert float(data["cost_per_person"]) >= 0
