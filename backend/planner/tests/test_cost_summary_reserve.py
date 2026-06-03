"""Tests for the meal plan cost summary API (reserve factor handling)."""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.tests import make_meal_plan, make_meal, make_meal_item
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion

User = get_user_model()


@pytest.mark.django_db
class TestMealPlanCostSummaryAPI:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

    def _build_plan_with_cost(self, reserve_factor: float):
        plan = make_meal_plan(
            created_by=self.user, norm_portions=10, reserve_factor=reserve_factor
        )
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(servings=1)
        ing = make_ingredient(name="Kosten-Zutat", price_per_kg=Decimal("10.00"))
        portion = make_portion(ingredient=ing, weight_g=100.0, name="100g")
        make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)
        return plan

    def test_cost_summary_includes_reserve(self):
        plan = self._build_plan_with_cost(reserve_factor=1.2)
        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()

        assert data["reserve_factor"] == pytest.approx(1.2)
        total = Decimal(str(data["total_cost"]))
        total_with_reserve = Decimal(str(data["total_cost_with_reserve"]))
        assert total > 0
        # cost_with_reserve == cost_without_reserve * reserve_factor
        assert total_with_reserve == pytest.approx(float(total) * 1.2)

    def test_cost_summary_reserve_one_is_equal(self):
        plan = self._build_plan_with_cost(reserve_factor=1.0)
        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["total_cost"]) == pytest.approx(float(data["total_cost_with_reserve"]))

    def test_cost_summary_requires_access(self):
        plan = self._build_plan_with_cost(reserve_factor=1.1)
        other = baker.make(User)
        other_client = Client()
        other_client.force_login(other)
        resp = other_client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert resp.status_code == 404
