"""Price coverage tests for the meal plan cost summary API."""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.models import MealItem
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from supply.models import IngredientPriceProposal
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


@pytest.mark.django_db
class TestMealPlanCostSummaryCoverage:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

    def _plan_with_recipe_items(self, priced_count: int, missing_count: int, portions: int = 10):
        plan = make_meal_plan(created_by=self.user, norm_portions=portions, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=1)
        for idx in range(priced_count):
            ing = make_ingredient(name=f"Bepreist {idx}", price_per_kg=Decimal("2.00"))
            portion = make_portion(ingredient=ing, weight_g=100.0, name="100g")
            make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)
        for idx in range(missing_count):
            ing = make_ingredient(name=f"Unbepreist {idx}", price_per_kg=None)
            portion = make_portion(ingredient=ing, weight_g=100.0, name="100g")
            make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)
        return plan

    def test_complete_coverage(self):
        plan = self._plan_with_recipe_items(priced_count=3, missing_count=0)
        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_ingredients"] == 3
        assert data["priced_ingredients"] == 3
        assert data["missing_ingredients"] == 0
        assert data["coverage"] == 1.0

    def test_partial_coverage(self):
        plan = self._plan_with_recipe_items(priced_count=2, missing_count=2)
        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        data = resp.json()
        assert data["total_ingredients"] == 4
        assert data["priced_ingredients"] == 2
        assert data["missing_ingredients"] == 2
        assert data["coverage"] == 0.5
        assert float(data["total_cost"]) > 0

    def test_absent_coverage(self):
        plan = self._plan_with_recipe_items(priced_count=0, missing_count=2)
        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        data = resp.json()
        assert data["total_ingredients"] == 2
        assert data["priced_ingredients"] == 0
        assert data["missing_ingredients"] == 2
        assert data["coverage"] == 0.0
        assert float(data["total_cost"]) == 0.0

    def test_empty_plan_returns_null_coverage(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        make_meal(meal_plan=plan)
        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        data = resp.json()
        assert data["total_ingredients"] == 0
        assert data["coverage"] is None

    def test_pending_proposal_counts_as_missing(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Pending-Zutat", price_per_kg=None)
        portion = make_portion(ingredient=ing, weight_g=100.0, name="100g")
        make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)
        IngredientPriceProposal.objects.create(
            ingredient=ing,
            proposed_price_per_kg="1.99",
            confidence=0.8,
            rationale="Test",
        )

        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        data = resp.json()
        assert data["total_ingredients"] == 1
        assert data["priced_ingredients"] == 0
        assert data["missing_ingredients"] == 1
        assert data["coverage"] == 0.0

    def test_variant_selection_counts_active_items_once(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=1)
        priced = make_ingredient(name="Aktive Zutat", price_per_kg=Decimal("2.00"))
        priced_portion = make_portion(ingredient=priced, weight_g=100.0, name="100g")
        active_item = make_recipe_item(recipe=recipe, portion=priced_portion, quantity=1.0)
        other = make_ingredient(name="Alternative", price_per_kg=Decimal("3.00"))
        other_portion = make_portion(ingredient=other, weight_g=100.0, name="100g-alt")
        alt_item = make_recipe_item(recipe=recipe, portion=other_portion, quantity=1.0)
        alt_item.exchange_group = baker.make("recipe.RecipeItemExchangeGroup", recipe=recipe)
        alt_item.exchange_position = 1
        alt_item.save(update_fields=["exchange_group", "exchange_position"])
        make_meal_item(meal=meal, recipe=recipe, factor=1.0, active_recipe_item_ids=[active_item.id])

        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        data = resp.json()
        assert data["total_ingredients"] == 1
        assert data["priced_ingredients"] == 1
        assert data["missing_ingredients"] == 0
        assert data["coverage"] == 1.0

    def test_direct_ingredient_without_price_counts_as_missing(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        ing = make_ingredient(name="Direktzutat", price_per_kg=None)
        mu = make_measuring_unit(name="g", unit="g", quantity=1.0)
        MealItem.objects.create(meal=meal, ingredient=ing, quantity=200.0, measuring_unit=mu, factor=1.0)

        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        data = resp.json()
        assert data["total_ingredients"] == 1
        assert data["priced_ingredients"] == 0
        assert data["missing_ingredients"] == 1
        assert data["coverage"] == 0.0

    def test_accepting_proposal_updates_coverage(self):
        from supply.services.ingredient_price_proposal_service import accept_proposal

        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Wasser", price_per_kg=None)
        portion = make_portion(ingredient=ing, weight_g=100.0, name="100g")
        make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)
        proposal = IngredientPriceProposal.objects.create(
            ingredient=ing,
            proposed_price_per_kg="0.10",
            confidence=0.7,
            rationale="Test",
        )

        before = self.client.get(f"/api/meal-plans/{plan.id}/costs/").json()
        assert before["priced_ingredients"] == 0
        assert before["missing_ingredients"] == 1

        accept_proposal(proposal, self.user)

        after = self.client.get(f"/api/meal-plans/{plan.id}/costs/").json()
        assert after["priced_ingredients"] == 1
        assert after["missing_ingredients"] == 0
        assert after["coverage"] == 1.0
        assert float(after["total_cost"]) == pytest.approx(0.1, abs=0.01)

    def test_cross_consumer_recipe_detail_and_costs_agree(self):
        """Recipe detail coverage and meal plan cost summary must agree after acceptance."""
        from recipe.services.recipe_checks import recalculate_recipe_cache
        from supply.services.ingredient_price_proposal_service import accept_proposal

        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=1, created_by=self.user)
        priced = make_ingredient(name="Mehl", price_per_kg=Decimal("2.00"))
        priced_portion = make_portion(ingredient=priced, weight_g=500.0, name="500g")
        make_recipe_item(recipe=recipe, portion=priced_portion, quantity=1.0)
        unpriced = make_ingredient(name="Salz", price_per_kg=None)
        unpriced_portion = make_portion(ingredient=unpriced, weight_g=5.0, name="5g")
        make_recipe_item(recipe=recipe, portion=unpriced_portion, quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)
        recalculate_recipe_cache(recipe)

        detail = self.client.get(f"/api/recipes/{recipe.id}/").json()
        assert detail["price_coverage"]["total_ingredients"] == 2
        assert detail["price_coverage"]["priced_ingredients"] == 1
        assert detail["price_coverage"]["missing_ingredients"] == 1

        costs = self.client.get(f"/api/meal-plans/{plan.id}/costs/").json()
        assert costs["total_ingredients"] == 2
        assert costs["priced_ingredients"] == 1
        assert costs["missing_ingredients"] == 1
        assert costs["coverage"] == 0.5

        proposal = IngredientPriceProposal.objects.create(
            ingredient=unpriced,
            proposed_price_per_kg="1.00",
            confidence=0.8,
            rationale="Test",
        )
        accept_proposal(proposal, self.user)

        detail = self.client.get(f"/api/recipes/{recipe.id}/").json()
        costs = self.client.get(f"/api/meal-plans/{plan.id}/costs/").json()
        assert detail["price_coverage"]["priced_ingredients"] == 2
        assert detail["price_coverage"]["missing_ingredients"] == 0
        assert costs["priced_ingredients"] == 2
        assert costs["missing_ingredients"] == 0
        assert costs["coverage"] == 1.0
