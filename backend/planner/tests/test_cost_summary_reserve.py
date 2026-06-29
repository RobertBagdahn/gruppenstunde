"""Tests for the meal plan cost summary API (reserve factor handling)."""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.models import MealItem
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


@pytest.mark.django_db
class TestMealPlanCostSummaryAPI:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

    def _build_plan_with_cost(self, reserve_factor: float):
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=reserve_factor)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=1)
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

    def test_cost_summary_includes_standalone_ingredient(self):
        """Standalone ingredients (no recipe) must be included in the cost."""
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        ing = make_ingredient(name="Butter", price_per_kg=Decimal("5.00"))
        # Use name="g" so _resolve_ingredient_weight_g takes the direct-gram path
        mu = make_measuring_unit(name="g", unit="g", quantity=1.0)
        # No portion needed for g-path: weight_g = quantity directly
        # 0.2 kg per person * 10 persons * 5.00 EUR/kg = 10.00 EUR
        MealItem.objects.create(
            meal=meal,
            ingredient=ing,
            quantity=200.0,  # 200g per person
            measuring_unit=mu,
            factor=1.0,
        )
        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["total_cost"]) == pytest.approx(10.0, abs=0.01)
        assert data["total_ingredients"] == 1
        assert data["priced_ingredients"] == 1

    def test_cost_summary_standalone_matches_shopping_list(self):
        """Cost summary and shopping list totals should match for same data."""
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.15)
        meal = make_meal(meal_plan=plan)

        # Recipe-based item
        recipe = make_recipe(portions=4)
        ing1 = make_ingredient(name="Mehl", price_per_kg=Decimal("2.00"))
        mu1 = make_measuring_unit(unit="g", quantity=1.0)
        portion1 = make_portion(ingredient=ing1, measuring_unit=mu1, weight_g=500.0, name="500g")
        make_recipe_item(recipe=recipe, portion=portion1, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        # Standalone ingredient — use name="g" for direct gram path
        ing2 = make_ingredient(name="Eier", price_per_kg=Decimal("4.00"))
        mu2 = make_measuring_unit(name="g", unit="g", quantity=1.0)
        # 12g per person * 10 persons * 1.15 reserve = 138g, 4.00 €/kg → 0.552 €
        MealItem.objects.create(
            meal=meal,
            ingredient=ing2,
            quantity=12.0,
            measuring_unit=mu2,
            factor=1.0,
        )

        # Fetch cost summary
        resp_cost = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert resp_cost.status_code == 200
        cost_data = resp_cost.json()

        # Fetch shopping list
        resp_shop = self.client.get(f"/api/meal-plans/{plan.id}/shopping-list/")
        assert resp_shop.status_code == 200
        shop_data = resp_shop.json()

        # Shopping list returns a flat list of items
        shop_total = sum(item.get("estimated_price_eur", 0) or 0 for item in shop_data)

        # With reserve_factor=1.0 both should match
        assert float(cost_data["total_cost_with_reserve"]) == pytest.approx(shop_total, abs=0.01), (
            f"Cost summary (with reserve): {cost_data['total_cost_with_reserve']}, "
            f"Shopping list total: {shop_total}"
        )
