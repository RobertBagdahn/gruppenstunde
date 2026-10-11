# Pyright cannot infer Django model fields in tests; backend static analysis uses django-stubs via mypy.
# pyright: reportAttributeAccessIssue=false
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

    def test_item_portion_can_be_changed_after_adding(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        bread = make_ingredient(name="Burger Buns Brioche vegan")
        gram_unit = baker.make("supply.MeasuringUnit", name="Gramm", unit="g", quantity=1.0)
        piece = make_portion(bread, name="Stück", quantity=1.0, weight_g=55.0, rank=2, weight_status="confirmed")
        item = MealItem.objects.create(meal=meal, ingredient=bread, quantity=55, measuring_unit=gram_unit)

        response = client.patch(
            f"/api/meal-plans/{plan.id}/meal-items/{item.id}/",
            data=json.dumps({"portion_id": piece.id, "note": "Für die Kinder halbieren"}),
            content_type="application/json",
        )

        assert response.status_code == 200, response.content
        assert response.json()["portion_id"] == piece.id
        assert response.json()["portion_name"] == "Stück"
        assert response.json()["quantity_g"] == 55.0
        assert response.json()["note"] == "Für die Kinder halbieren"
        item.refresh_from_db()
        assert float(item.quantity) == pytest.approx(1.0)
        assert item.measuring_unit_id is None
        assert item.note == "Für die Kinder halbieren"

        clear_response = client.patch(
            f"/api/meal-plans/{plan.id}/meal-items/{item.id}/",
            data=json.dumps({"note": ""}),
            content_type="application/json",
        )
        assert clear_response.status_code == 200
        assert clear_response.json()["note"] == ""

    def test_cannot_change_item_to_a_portion_from_another_ingredient(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        bread = make_ingredient(name="Burger Bun")
        other = make_ingredient(name="Apfel")
        foreign_portion = make_portion(other, name="Stück", quantity=1.0, weight_g=55.0, rank=2)
        item = MealItem.objects.create(meal=meal, ingredient=bread, quantity=1)

        response = client.patch(
            f"/api/meal-plans/{plan.id}/meal-items/{item.id}/",
            data=json.dumps({"portion_id": foreign_portion.id}),
            content_type="application/json",
        )

        assert response.status_code == 422
        item.refresh_from_db()
        assert item.portion_id is None
        assert item.quantity == 1

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
