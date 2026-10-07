"""Changing unit/portion of a single ingredient keeps the grams; notes are stored per item."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.models import MealItem, MealTypeChoices
from planner.services.pdf_export import _build_item_data
from planner.tests import make_meal, make_meal_plan
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


def _patch(client: Client, plan, item, payload: dict):
    return client.patch(
        f"/api/meal-plans/{plan.id}/meal-items/{item.id}/",
        data=json.dumps(payload),
        content_type="application/json",
    )


@pytest.fixture
def setup(client: Client):
    user = baker.make(User)
    client.force_login(user)
    plan = make_meal_plan(created_by=user, norm_portions=10, reserve_factor=1.0)
    meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
    gram = make_measuring_unit(name="Gramm", unit="g")
    cheese = make_ingredient(name="Frischkäse", energy_kcal=250)
    spoon = make_portion(
        cheese, name="EL", quantity=1.0, weight_g=30.0, rank=1, weight_status="confirmed", measuring_unit=gram
    )
    item = MealItem.objects.create(meal=meal, ingredient=cheese, quantity=0.5, portion=spoon, measuring_unit=gram)
    return plan, meal, cheese, spoon, gram, item


@pytest.mark.django_db
class TestUnitChange:
    def test_portion_to_grams_keeps_grams_and_energy(self, client, setup):
        plan, _meal, _cheese, _spoon, gram, item = setup

        resp = _patch(client, plan, item, {"portion_id": None, "measuring_unit_id": gram.id})
        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["portion_id"] is None
        assert body["quantity"] == 15.0
        assert body["quantity_g"] == 15.0
        assert body["energy_kcal"] == pytest.approx(15 * 250 / 100 * 10, rel=0.01)

    def test_grams_back_to_portion(self, client, setup):
        plan, _meal, _cheese, spoon, gram, item = setup
        _patch(client, plan, item, {"portion_id": None, "measuring_unit_id": gram.id})
        resp = _patch(client, plan, item, {"portion_id": spoon.id})
        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["portion_id"] == spoon.id
        assert body["quantity"] == 0.5
        assert body["quantity_g"] == 15.0

    def test_quantity_with_unit_is_not_converted(self, client, setup):
        plan, _meal, _cheese, spoon, _gram, item = setup
        resp = _patch(client, plan, item, {"portion_id": spoon.id, "quantity": 2})
        assert resp.status_code == 200, resp.content
        assert resp.json()["quantity"] == 2.0
        assert resp.json()["quantity_g"] == 60.0

    def test_foreign_portion_rejected(self, client, setup):
        plan, _meal, _cheese, _spoon, _gram, item = setup
        other = make_ingredient(name="Butter")
        foreign = make_portion(other, name="Stück", quantity=1.0, weight_g=10.0, rank=1)
        resp = _patch(client, plan, item, {"portion_id": foreign.id})
        assert resp.status_code == 422
        item.refresh_from_db()
        assert item.quantity == 0.5 or float(item.quantity) == 0.5

    def test_undefined_unit_rejected(self, client, setup):
        plan, _meal, _cheese, _spoon, _gram, item = setup
        unit = make_measuring_unit(name="Tasse", unit="piece")
        resp = _patch(client, plan, item, {"portion_id": None, "measuring_unit_id": unit.id})
        assert resp.status_code == 422

    def test_target_without_weight_rejected(self, client, setup):
        plan, _meal, cheese, _spoon, _gram, item = setup
        unweighted = make_portion(
            cheese,
            name="Stück",
            quantity=1.0,
            weight_g=None,
            rank=2,
            measuring_unit=make_measuring_unit(name="Stück", unit="piece"),
        )
        resp = _patch(client, plan, item, {"portion_id": unweighted.id})
        assert resp.status_code == 422

    def test_recipe_item_rejected(self, client, setup):
        from recipe.tests import make_recipe

        plan, meal, *_ = setup
        recipe_item = MealItem.objects.create(meal=meal, recipe=make_recipe())
        resp = _patch(client, plan, recipe_item, {"portion_id": 1})
        assert resp.status_code == 422


@pytest.mark.django_db
class TestNote:
    def test_note_on_create_update_clear(self, client, setup):
        plan, meal, *_rest = setup
        other = make_ingredient(name="Gurke", energy_kcal=15)
        make_portion(other, name="Stück", quantity=1.0, weight_g=300.0, rank=1, weight_status="confirmed")
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
            data=json.dumps({"ingredient_id": other.id, "quantity": 100, "note": "  ohne Schale "}),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["note"] == "ohne Schale"
        item = MealItem.objects.get(id=resp.json()["id"])
        assert _patch(client, plan, item, {"note": "Bio"}).json()["note"] == "Bio"
        assert _patch(client, plan, item, {"note": ""}).json()["note"] == ""

    def test_note_too_long_rejected(self, client, setup):
        plan, *_rest, item = setup
        assert _patch(client, plan, item, {"note": "x" * 501}).status_code == 422

    def test_note_in_pdf_line(self, setup):
        _plan, _meal, _cheese, _spoon, _gram, item = setup
        item.note = "ohne Zwiebeln"
        item.save()
        data = _build_item_data(item, 10, 1.0, {})
        assert data["ingredients"][0].endswith("(ohne Zwiebeln)")
        # amount is derived from the portion weight (EL = 15 g), not labelled with the unit name
        assert data["ingredients"][0] == "Frischkäse — 150 g · à 15 g p. P. (ohne Zwiebeln)"
