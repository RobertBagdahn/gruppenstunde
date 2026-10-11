"""Changing unit/portion of a single ingredient keeps the grams; notes are stored per item."""

import json
from decimal import Decimal

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
    item = MealItem.objects.create(meal=meal, ingredient=cheese, quantity=0.5, portion=spoon)
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
        # Named kitchen measures are valid standard units, even when their legacy
        # MeasuringUnit row is selected by an older client.
        assert resp.status_code == 200, resp.content
        assert resp.json()["unit_kind"] == "standard"
        assert resp.json()["standard_measure_key"] == "tasse"

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
class TestConstantWeightUnitSwitch:
    """Switching the unit without a new amount converts the count and keeps the grams."""

    def test_grams_to_piece(self, client, setup):
        plan, meal, _cheese, _spoon, gram, _item = setup
        bread = make_ingredient(name="Brot", energy_kcal=250)
        piece = make_portion(bread, name="Stück", quantity=1.0, weight_g=100.0, rank=1, weight_status="confirmed")
        item = MealItem.objects.create(meal=meal, ingredient=bread, quantity=55, measuring_unit=gram)
        before = _patch(client, plan, item, {"quantity": 55}).json()

        body = _patch(client, plan, item, {"portion_id": piece.id}).json()

        assert body["portion_id"] == piece.id
        assert body["unit_label"] == "Stück"
        assert body["quantity"] == pytest.approx(0.55)
        assert body["quantity_g"] == pytest.approx(55)
        assert body["energy_kcal"] == pytest.approx(before["energy_kcal"])
        item.refresh_from_db()
        assert item.measuring_unit_id is None

    def test_standard_measure_to_grams(self, client, setup):
        plan, meal, _cheese, _spoon, gram, _item = setup
        oil = make_ingredient(name="Rapsöl", energy_kcal=900, physical_density=0.95)
        item = MealItem.objects.create(meal=meal, ingredient=oil, quantity=3, standard_measure_key="el")

        body = _patch(
            client, plan, item, {"portion_id": None, "standard_measure_key": None, "measuring_unit_id": gram.id}
        ).json()

        assert body["unit_kind"] == "grams"
        assert body["standard_measure_key"] == ""
        assert body["quantity"] == pytest.approx(42.75)
        assert body["quantity_g"] == pytest.approx(42.75)

    def test_portion_to_standard_measure_to_grams(self, client, setup):
        plan, _meal, _cheese, _spoon, gram, item = setup

        as_spoon = _patch(client, plan, item, {"portion_id": None, "standard_measure_key": "el"}).json()
        assert as_spoon["unit_kind"] == "standard"
        assert as_spoon["quantity"] == pytest.approx(1)
        assert as_spoon["quantity_g"] == pytest.approx(15)

        as_grams = _patch(client, plan, item, {"standard_measure_key": None, "measuring_unit_id": gram.id}).json()
        assert as_grams["unit_kind"] == "grams"
        assert as_grams["quantity"] == pytest.approx(15)

    def test_uneven_conversion_keeps_grams_within_rounding(self, client, setup):
        plan, meal, _cheese, _spoon, gram, _item = setup
        oil = make_ingredient(name="Sonnenblumenöl", energy_kcal=900, physical_density=0.95)
        item = MealItem.objects.create(meal=meal, ingredient=oil, quantity=50, measuring_unit=gram)

        as_spoon = _patch(client, plan, item, {"measuring_unit_id": None, "standard_measure_key": "el"}).json()
        assert as_spoon["quantity"] == pytest.approx(3.509)
        assert as_spoon["quantity_g"] == pytest.approx(50, abs=0.01)

        as_grams = _patch(client, plan, item, {"standard_measure_key": None, "measuring_unit_id": gram.id}).json()
        assert as_grams["quantity"] == pytest.approx(50, abs=0.01)
        item.refresh_from_db()
        assert item.quantity == Decimal("50.003")

    def test_source_without_weight_is_rejected(self, client, setup):
        plan, meal, _cheese, _spoon, gram, _item = setup
        yogurt = make_ingredient(name="Joghurt", energy_kcal=60)
        unweighted = make_portion(
            yogurt,
            name="Stück",
            quantity=1.0,
            weight_g=None,
            rank=2,
            measuring_unit=make_measuring_unit(name="Stück", unit="piece"),
        )
        item = MealItem.objects.create(meal=meal, ingredient=yogurt, quantity=2, portion=unweighted)

        resp = _patch(client, plan, item, {"portion_id": None, "measuring_unit_id": gram.id})

        assert resp.status_code == 422
        item.refresh_from_db()
        assert item.portion_id == unweighted.id
        assert item.quantity == 2

    def test_requires_edit_rights(self, client, setup):
        plan, _meal, _cheese, spoon, gram, item = setup
        client.force_login(baker.make(User))

        resp = _patch(client, plan, item, {"portion_id": None, "measuring_unit_id": gram.id})

        assert resp.status_code in (403, 404)
        item.refresh_from_db()
        assert item.portion_id == spoon.id


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
        # shared UI amount text: portion count first, grams from the portion weight (EL = 15 g)
        assert data["ingredients"][0] == "Frischkäse — 5 EL (150 g) · à 0,5 EL (15 g) p. P. (ohne Zwiebeln)"
