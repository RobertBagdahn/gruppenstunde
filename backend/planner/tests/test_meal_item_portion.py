"""A single ingredient added with a chosen portion is measured by that portion everywhere."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.models import MealItem, MealTypeChoices
from planner.tests import make_meal, make_meal_plan
from supply.tests import make_ingredient, make_portion

User = get_user_model()


def _post_item(client: Client, plan, meal, payload: dict):
    return client.post(
        f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
        data=json.dumps(payload),
        content_type="application/json",
    )


@pytest.mark.django_db
class TestMealItemPortion:
    def test_portion_is_stored_and_weight_uses_portion(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user, norm_portions=12, reserve_factor=1.1)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        toast = make_ingredient(name="Toastbrot", energy_kcal=260)
        slice_portion = make_portion(
            toast, name="Scheibe", quantity=1.0, weight_g=30.0, rank=1, weight_status="confirmed"
        )

        resp = _post_item(
            client,
            plan,
            meal,
            {"ingredient_id": toast.id, "portion_id": slice_portion.id, "quantity": 1},
        )

        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["portion_id"] == slice_portion.id
        assert body["portion_name"] == "Scheibe"
        assert body["quantity_g"] == 30.0
        assert body["energy_kcal"] == pytest.approx(30 * 260 / 100 * 12, rel=0.01)

    def test_shopping_list_uses_portion_weight(self, client: Client):
        from supply.services.shopping_service import generate_shopping_list

        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user, norm_portions=12, reserve_factor=1.1)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        toast = make_ingredient(name="Toastbrot")
        slice_portion = make_portion(
            toast, name="Scheibe", quantity=1.0, weight_g=30.0, rank=1, weight_status="confirmed"
        )
        assert (
            _post_item(
                client, plan, meal, {"ingredient_id": toast.id, "portion_id": slice_portion.id, "quantity": 1}
            ).status_code
            == 200
        )

        items = generate_shopping_list(plan)

        toast_item = next(i for i in items if i.ingredient_id == toast.id)
        assert toast_item.total_quantity_g == pytest.approx(30 * 12 * 1.1, rel=0.01)

    def test_portion_of_another_ingredient_is_rejected(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        toast = make_ingredient(name="Toastbrot")
        zimt = make_ingredient(name="Zimt")
        zimt_portion = make_portion(zimt, name="1 TL", quantity=1.0, weight_g=5.0, rank=1)

        resp = _post_item(client, plan, meal, {"ingredient_id": toast.id, "portion_id": zimt_portion.id, "quantity": 1})

        assert resp.status_code == 422
        assert resp.json()["detail"] == "Die Portion gehört nicht zu dieser Zutat"
        assert not MealItem.objects.filter(meal=meal).exists()

    def test_item_without_portion_keeps_direct_grams(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        butter = make_ingredient(name="Butter")
        gram = baker.make("supply.MeasuringUnit", name="Gramm", unit="g", quantity=1.0)

        resp = _post_item(
            client, plan, meal, {"ingredient_id": butter.id, "measuring_unit_id": gram.id, "quantity": 20}
        )

        assert resp.status_code == 200, resp.content
        assert resp.json()["quantity_g"] == 20.0
        assert resp.json()["portion_id"] is None

    def test_anonymous_cannot_add_item(self, client: Client):
        user = baker.make(User)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        toast = make_ingredient(name="Toastbrot")

        resp = _post_item(client, plan, meal, {"ingredient_id": toast.id, "quantity": 1})

        assert resp.status_code in (401, 403)
        assert not MealItem.objects.filter(meal=meal).exists()
