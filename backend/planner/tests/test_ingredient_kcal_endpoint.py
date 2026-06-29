"""Tests for the ingredient kcal calculation endpoint."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.tests import make_meal_plan
from supply.models import Ingredient

User = get_user_model()


@pytest.mark.django_db
class TestCalculateIngredientKcal:
    def test_calculate_single_ingredient_kcal(self, client: Client):
        """Test calculating kcal for a single ingredient."""
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)

        # Create an ingredient with known energy_kcal (per 100g)
        ingredient = baker.make(Ingredient, energy_kcal=200.0)

        # Request: 50g of the ingredient (should give 100 kcal)
        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps({"items": [{"ingredient_id": ingredient.id, "quantity_g": 50}]}),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        result = resp.json()
        assert "items" in result
        assert len(result["items"]) == 1
        assert result["items"][0]["ingredient_id"] == ingredient.id
        assert result["items"][0]["energy_kcal"] == 100.0

    def test_calculate_multiple_ingredients_kcal(self, client: Client):
        """Test calculating kcal for multiple ingredients at once."""
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)

        # Create two ingredients
        ing1 = baker.make(Ingredient, energy_kcal=200.0)
        ing2 = baker.make(Ingredient, energy_kcal=150.0)

        # Request: 50g and 100g respectively
        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps(
                {
                    "items": [
                        {"ingredient_id": ing1.id, "quantity_g": 50},
                        {"ingredient_id": ing2.id, "quantity_g": 100},
                    ]
                }
            ),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        result = resp.json()
        assert len(result["items"]) == 2

        # ing1: 200 * 50 / 100 = 100 kcal
        assert result["items"][0]["ingredient_id"] == ing1.id
        assert result["items"][0]["energy_kcal"] == 100.0

        # ing2: 150 * 100 / 100 = 150 kcal
        assert result["items"][1]["ingredient_id"] == ing2.id
        assert result["items"][1]["energy_kcal"] == 150.0

    def test_ingredient_not_found_returns_none(self, client: Client):
        """Test that non-existent ingredient returns None for energy_kcal."""
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps({"items": [{"ingredient_id": 99999, "quantity_g": 50}]}),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        result = resp.json()
        assert result["items"][0]["ingredient_id"] == 99999
        assert result["items"][0]["energy_kcal"] is None

    def test_ingredient_with_no_energy_kcal(self, client: Client):
        """Test ingredient with null energy_kcal."""
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)

        ingredient = baker.make(Ingredient, energy_kcal=None)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps({"items": [{"ingredient_id": ingredient.id, "quantity_g": 50}]}),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        result = resp.json()
        assert result["items"][0]["energy_kcal"] is None

    def test_empty_items_list(self, client: Client):
        """Test with empty items list."""
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps({"items": []}),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        result = resp.json()
        assert result["items"] == []

    def test_unauthenticated_user_denied(self, client: Client):
        """Test that unauthenticated user gets 403."""
        plan = baker.make("planner.MealPlan")

        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps({"items": [{"ingredient_id": 1, "quantity_g": 50}]}),
            content_type="application/json",
        )

        assert resp.status_code == 403, resp.content

    def test_meal_plan_not_found(self, client: Client):
        """Test that non-existent meal plan returns 404."""
        user = baker.make(User)
        client.force_login(user)

        resp = client.post(
            f"/api/meal-plans/99999/calculate-ingredient-kcal/",
            data=json.dumps({"items": [{"ingredient_id": 1, "quantity_g": 50}]}),
            content_type="application/json",
        )

        assert resp.status_code == 404, resp.content

    def test_user_without_access_denied(self, client: Client):
        """Test that user without access to meal plan gets 404 (hidden)."""
        user1 = baker.make(User)
        user2 = baker.make(User)
        client.force_login(user2)

        # Create meal plan by another user
        plan = make_meal_plan(created_by=user1)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps({"items": [{"ingredient_id": 1, "quantity_g": 50}]}),
            content_type="application/json",
        )

        assert resp.status_code == 404, resp.content

    def test_rounding_to_two_decimals(self, client: Client):
        """Test that result is rounded to 2 decimal places."""
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)

        # Create ingredient with energy_kcal that will produce decimal result
        ingredient = baker.make(Ingredient, energy_kcal=333.0)  # 333 * 33 / 100 = 109.89

        resp = client.post(
            f"/api/meal-plans/{plan.id}/calculate-ingredient-kcal/",
            data=json.dumps({"items": [{"ingredient_id": ingredient.id, "quantity_g": 33}]}),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        result = resp.json()
        assert result["items"][0]["energy_kcal"] == 109.89
