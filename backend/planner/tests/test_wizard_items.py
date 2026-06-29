"""Tests for the wizard-items endpoint (batch meal item creation)."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import MealItem, MealPlan, MealTypeChoices
from planner.tests import make_meal, make_meal_plan
from supply.models import MeasuringUnit

User = get_user_model()


@pytest.mark.django_db
class TestWizardItemsEndpoint:
    def _login(self, client, user=None):
        if user is None:
            user = baker.make(User)
        client.force_login(user)
        return user

    def _url(self, plan_id, meal_id):
        return f"/api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/"

    def test_populate_empty_meal(self, client: Client):
        user = self._login(client)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        recipe = baker.make("recipe.Recipe", title="Rührei", portions=4)

        payload = {"items": [{"recipe_id": recipe.id, "factor": 1.0}]}

        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert data["meal_id"] == meal.id
        assert len(data["items"]) == 1
        assert data["items"][0]["recipe_id"] == recipe.id
        assert MealItem.objects.filter(meal=meal).count() == 1

    def test_replace_existing_items(self, client: Client):
        user = self._login(client)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        recipe1 = baker.make("recipe.Recipe", title="Rührei", portions=4)
        recipe2 = baker.make("recipe.Recipe", title="Pfannkuchen", portions=4)

        # Create existing items
        baker.make(MealItem, meal=meal, recipe=recipe1, factor=1.0)
        baker.make(MealItem, meal=meal, recipe=recipe2, factor=1.0)
        assert MealItem.objects.filter(meal=meal).count() == 2

        # Replace with one new item
        recipe3 = baker.make("recipe.Recipe", title="Porridge", portions=4)
        payload = {"items": [{"recipe_id": recipe3.id, "factor": 2.0}]}

        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["recipe_id"] == recipe3.id
        # Old items are gone
        assert MealItem.objects.filter(meal=meal).count() == 1

    def test_invalid_item_triggers_rollback(self, client: Client):
        user = self._login(client)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        recipe = baker.make("recipe.Recipe", title="Rührei", portions=4)

        # Existing item
        baker.make(MealItem, meal=meal, recipe=recipe, factor=1.0)
        old_count = MealItem.objects.filter(meal=meal).count()

        # Send one valid + one invalid item (no recipe_id, no ingredient_id, no display_name)
        payload = {
            "items": [
                {"recipe_id": recipe.id, "factor": 1.0},
                {},
            ]
        }

        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert resp.status_code == 422
        # Existing items should still be there (transaction rolled back)
        assert MealItem.objects.filter(meal=meal).count() == old_count

    def test_meal_not_found(self, client: Client):
        user = self._login(client)
        plan = make_meal_plan(created_by=user)
        resp = client.post(
            self._url(plan.id, 99999),
            data=json.dumps({"items": []}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_meal_belongs_to_different_plan(self, client: Client):
        user = self._login(client)
        plan1 = make_meal_plan(created_by=user, name="Plan A")
        plan2 = make_meal_plan(created_by=user, name="Plan B")
        meal = make_meal(meal_plan=plan2)
        resp = client.post(
            self._url(plan1.id, meal.id),
            data=json.dumps({"items": []}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_unauthenticated_user(self, client: Client):
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps({"items": []}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_unauthorized_viewer(self, client: Client):
        owner = baker.make(User)
        viewer = baker.make(User)
        plan = make_meal_plan(created_by=owner)
        meal = make_meal(meal_plan=plan)
        self._login(client, viewer)
        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps({"items": []}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_ingredient_items_with_measuring_unit(self, client: Client):
        """Ingredient items with measuring_unit_id are saved correctly."""
        user = self._login(client)
        g_unit = MeasuringUnit.objects.get_or_create(
            name="g", defaults={"quantity": 1.0, "unit": "g"}
        )[0]
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        ingredient = baker.make("supply.Ingredient", energy_kcal=250.0)

        payload = {
            "items": [
                {
                    "ingredient_id": ingredient.id,
                    "quantity": 1500,
                    "measuring_unit_id": g_unit.id,
                }
            ]
        }

        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert item["ingredient_id"] == ingredient.id
        assert item["quantity"] == 1500
        assert item["measuring_unit_id"] == g_unit.id

    def test_ingredient_energy_kcal_in_response(self, client: Client):
        """Ingredient items have energy_kcal computed in the response."""
        user = self._login(client)
        g_unit = MeasuringUnit.objects.get_or_create(
            name="g", defaults={"quantity": 1.0, "unit": "g"}
        )[0]
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan)
        ingredient = baker.make("supply.Ingredient", energy_kcal=250.0)

        payload = {
            "items": [
                {
                    "ingredient_id": ingredient.id,
                    "quantity": 200,
                    "measuring_unit_id": g_unit.id,
                    "factor": 1.0,
                }
            ]
        }

        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content
        data = resp.json()
        item = data["items"][0]
        # 250 kcal / 100g * 200g * 1.0 * 10 effPortions = 5000 kcal
        assert item["energy_kcal"] is not None
        assert item["energy_kcal"] == pytest.approx(5000.0, rel=0.01)

    def test_ingredient_energy_in_meal_total(self, client: Client):
        """Ingredient item energy contributes to the meal total."""
        user = self._login(client)
        g_unit = MeasuringUnit.objects.get_or_create(
            name="g", defaults={"quantity": 1.0, "unit": "g"}
        )[0]
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan)
        ingredient = baker.make("supply.Ingredient", energy_kcal=250.0)

        payload = {
            "items": [
                {
                    "ingredient_id": ingredient.id,
                    "quantity": 200,
                    "measuring_unit_id": g_unit.id,
                    "factor": 1.0,
                }
            ]
        }

        resp = client.post(
            self._url(plan.id, meal.id),
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()

        # Fetch the meal plan detail to check total energy
        detail_resp = client.get(f"/api/meal-plans/{plan.id}/")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        meal_data = next(m for m in detail["meals"] if m["id"] == meal.id)
        # 250 kcal / 100g * 200g * 1.0 * 10 effPortions = 5000 kcal
        assert meal_data["total_energy_kcal"] == pytest.approx(5000.0, rel=0.01)
