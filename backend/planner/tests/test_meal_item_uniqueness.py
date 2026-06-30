"""Tests for duplicate prevention of recipes and ingredients within a Meal."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.models import Meal, MealItem, MealTypeChoices
from planner.tests import make_meal, make_meal_plan

User = get_user_model()


@pytest.mark.django_db
class TestAddMealItemUniqueness:
    def test_add_unique_recipe_success(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
        recipe = baker.make("recipe.Recipe", title="Pfannkuchen")

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"recipe_id": recipe.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content

    def test_add_duplicate_recipe_returns_422(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
        recipe = baker.make("recipe.Recipe", title="Pfannkuchen")
        baker.make(MealItem, meal=meal, recipe=recipe, factor=1.0)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"recipe_id": recipe.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content
        assert "bereits in dieser Mahlzeit enthalten" in resp.json()["detail"]

    def test_add_duplicate_ingredient_returns_422(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
        ingredient = baker.make("supply.Ingredient", name="Tomate")
        baker.make(MealItem, meal=meal, ingredient=ingredient, factor=1.0)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"ingredient_id": ingredient.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content
        assert "bereits in dieser Mahlzeit enthalten" in resp.json()["detail"]
        assert "Tomate" in resp.json()["detail"]

    def test_add_recipe_and_same_ingredient_standalone_allowed(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
        ingredient = baker.make("supply.Ingredient")
        recipe = baker.make("recipe.Recipe", title="Pasta")

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"recipe_id": recipe.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"ingredient_id": ingredient.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_add_same_recipe_to_different_meals_allowed(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal_a = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        meal_b = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
        recipe = baker.make("recipe.Recipe", title="Pfannkuchen")

        resp_a = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal_a.id}/items/",
            data=json.dumps({"recipe_id": recipe.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp_a.status_code == 200

        resp_b = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal_b.id}/items/",
            data=json.dumps({"recipe_id": recipe.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp_b.status_code == 200


@pytest.mark.django_db
class TestWizardItemsUniqueness:
    def test_wizard_with_duplicate_recipe_in_input_returns_422(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        recipe = baker.make("recipe.Recipe", title="Rührei")

        payload = {"items": [{"recipe_id": recipe.id, "factor": 1.0}, {"recipe_id": recipe.id, "factor": 2.0}]}
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/wizard-items/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content
        assert "mehrfach angegeben" in resp.json()["detail"]


@pytest.mark.django_db
class TestRefMealCreateUniqueness:
    def test_create_ref_meal_with_duplicate_recipe_in_items_returns_422(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        recipe = baker.make("recipe.Recipe", title="Porridge")

        payload = {
            "meal_type": MealTypeChoices.BREAKFAST,
            "items": [
                {"recipe_id": recipe.id, "factor": 1.0},
                {"recipe_id": recipe.id, "factor": 2.0},
            ],
        }
        resp = client.post(
            f"/api/meal-plans/{plan.id}/ref-meals/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content
        assert "mehrfach angegeben" in resp.json()["detail"]


@pytest.mark.django_db
class TestUpdateRefMealUniqueness:
    def _make_ref_meal(self, meal_plan, meal_type=MealTypeChoices.BREAKFAST):
        return Meal.objects.create(
            meal_plan=meal_plan,
            meal_type=meal_type,
            day_part_factor=0.25,
            is_reference=True,
            start_datetime=None,
            end_datetime=None,
        )

    def test_update_ref_meal_with_duplicate_recipe_returns_422(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        ref = self._make_ref_meal(plan)
        recipe = baker.make("recipe.Recipe", title="Porridge")

        payload = {
            "items": [
                {"recipe_id": recipe.id, "factor": 1.0},
                {"recipe_id": recipe.id, "factor": 2.0},
            ],
        }
        resp = client.put(
            f"/api/meal-plans/{plan.id}/ref-meals/{ref.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content
        assert "mehrfach angegeben" in resp.json()["detail"]


@pytest.mark.django_db
class TestCopyItemsFromPlanUniqueness:
    def test_copy_items_into_meal_with_existing_recipe_returns_422(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        source = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
        target = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        recipe = baker.make("recipe.Recipe", title="Pfannkuchen")

        baker.make(MealItem, meal=source, recipe=recipe, factor=1.0)
        baker.make(MealItem, meal=target, recipe=recipe, factor=1.0)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{target.id}/copy-items-from/",
            data=json.dumps({"source_plan_id": plan.id, "source_meal_id": source.id}),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content
        assert "bereits in dieser Mahlzeit enthalten" in resp.json()["detail"]

    def test_copy_between_different_plans_allowed(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan_a = make_meal_plan(created_by=user)
        plan_b = make_meal_plan(created_by=user)
        source = make_meal(meal_plan=plan_a, meal_type=MealTypeChoices.LUNCH)
        target = make_meal(meal_plan=plan_b, meal_type=MealTypeChoices.DINNER)
        recipe = baker.make("recipe.Recipe", title="Pfannkuchen")

        baker.make(MealItem, meal=source, recipe=recipe, factor=1.0)

        resp = client.post(
            f"/api/meal-plans/{plan_b.id}/meals/{target.id}/copy-items-from/",
            data=json.dumps({"source_plan_id": plan_a.id, "source_meal_id": source.id}),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content


@pytest.mark.django_db
class TestDuplicateMealItemsAllowed:
    def test_duplicate_recipes_now_allowed(self, client: Client):
        """Without unique_recipe_per_meal constraint, duplicates are allowed."""
        from planner.api.meal_plan import _create_meal_item

        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan)
        recipe = baker.make("recipe.Recipe", title="Test")

        first = _create_meal_item(meal=meal, recipe=recipe, factor=1.0)
        assert first is not None

        second = _create_meal_item(meal=meal, recipe=recipe, factor=1.0)
        assert second is not None
        assert second.id != first.id
