"""API-level tests for meal-plan integrity (task group 2 of the
meal-plan-integrity-and-number-formatting OpenSpec change):
- HTTP 400 on duplicate/out-of-range meal saves via _save_meal_or_400
- HTTP 422 when an ingredient item has no quantity
- HTTP 403 for anonymous requests
- reference meals are served separately from regular meals
"""

import json
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.models import Meal, MealTypeChoices
from planner.tests import make_meal, make_meal_plan

User = get_user_model()


@pytest.fixture
def user(db):
    return baker.make(User)


@pytest.fixture
def plan(user):
    return make_meal_plan(created_by=user)


@pytest.mark.django_db
class TestAddMealIntegrity:
    def test_second_breakfast_same_day_returns_400(self, client: Client, user, plan):
        client.force_login(user)
        day = plan.start_datetime
        make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=day)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/",
            data=json.dumps(
                {
                    "meal_type": "breakfast",
                    "start_datetime": day.isoformat(),
                    "end_datetime": (day + timedelta(hours=1)).isoformat(),
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400, resp.content
        assert "existiert bereits" in resp.json()["detail"]

    def test_meal_outside_range_returns_400(self, client: Client, user, plan):
        client.force_login(user)
        outside = plan.start_datetime - timedelta(days=30)

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/",
            data=json.dumps(
                {
                    "meal_type": "dinner",
                    "start_datetime": outside.isoformat(),
                    "end_datetime": (outside + timedelta(hours=1)).isoformat(),
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400, resp.content
        assert "außerhalb des Planzeitraums" in resp.json()["detail"]

    def test_meal_inside_range_returns_200(self, client: Client, user, plan):
        client.force_login(user)
        day = plan.start_datetime

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/",
            data=json.dumps(
                {
                    "meal_type": "dinner",
                    "start_datetime": day.isoformat(),
                    "end_datetime": (day + timedelta(hours=1)).isoformat(),
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content

    def test_anonymous_add_meal_returns_401(self, client: Client, plan):
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/",
            data=json.dumps(
                {
                    "meal_type": "dinner",
                    "start_datetime": plan.start_datetime.isoformat(),
                    "end_datetime": (plan.start_datetime + timedelta(hours=1)).isoformat(),
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_moving_meal_outside_range_via_reorder_returns_400(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)
        target_date = (plan.start_datetime - timedelta(days=30)).date()

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/reorder/",
            data=json.dumps({"source_meal_id": meal.id, "target_date": target_date.isoformat()}),
            content_type="application/json",
        )
        assert resp.status_code == 400, resp.content
        assert "außerhalb des Planzeitraums" in resp.json()["detail"]


@pytest.mark.django_db
class TestMealItemQuantityRequired:
    def test_ingredient_item_without_quantity_returns_422(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan)
        ingredient = baker.make("supply.Ingredient", name="Mehl")

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"ingredient_id": ingredient.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content

    def test_ingredient_item_with_zero_quantity_returns_422(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan)
        ingredient = baker.make("supply.Ingredient", name="Mehl")

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"ingredient_id": ingredient.id, "quantity": 0, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content

    def test_ingredient_item_with_quantity_returns_200(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan)
        ingredient = baker.make("supply.Ingredient", name="Mehl")

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"ingredient_id": ingredient.id, "quantity": 100, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content

    def test_recipe_item_without_quantity_is_unaffected(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan)
        recipe = baker.make("recipe.Recipe", title="Pfannkuchen")

        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"recipe_id": recipe.id, "factor": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content

    def test_update_meal_item_quantity_to_zero_returns_422(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan)
        ingredient = baker.make("supply.Ingredient", name="Mehl")
        create_resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"ingredient_id": ingredient.id, "quantity": 100, "factor": 1.0}),
            content_type="application/json",
        )
        item_id = create_resp.json()["id"]

        resp = client.patch(
            f"/api/meal-plans/{plan.id}/meal-items/{item_id}/",
            data=json.dumps({"quantity": 0}),
            content_type="application/json",
        )
        assert resp.status_code == 422, resp.content


@pytest.mark.django_db
class TestReferenceMealsSeparatedFromDetail:
    def test_reference_meal_not_in_meals_list(self, client: Client, user, plan):
        client.force_login(user)
        Meal.objects.create(
            meal_plan=plan,
            meal_type=MealTypeChoices.BREAKFAST,
            day_part_factor=0.25,
            is_reference=True,
        )
        regular = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)

        resp = client.get(f"/api/meal-plans/{plan.id}/")
        assert resp.status_code == 200, resp.content
        data = resp.json()
        meal_ids = [m["id"] for m in data["meals"]]
        assert regular.id in meal_ids
        assert all(not m.get("is_reference", False) for m in data["meals"])

    def test_reference_meal_appears_in_ref_meals(self, client: Client, user, plan):
        client.force_login(user)
        ref = Meal.objects.create(
            meal_plan=plan,
            meal_type=MealTypeChoices.BREAKFAST,
            day_part_factor=0.25,
            is_reference=True,
        )

        resp = client.get(f"/api/meal-plans/{plan.id}/")
        assert resp.status_code == 200, resp.content
        data = resp.json()
        ref_ids = [m["id"] for m in data["ref_meals"]]
        assert ref.id in ref_ids
        assert ref.id not in [m["id"] for m in data["meals"]]

    def test_plan_without_reference_meals_has_empty_ref_meals(self, client: Client, user, plan):
        client.force_login(user)
        make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)

        resp = client.get(f"/api/meal-plans/{plan.id}/")
        assert resp.status_code == 200, resp.content
        assert resp.json()["ref_meals"] == []
