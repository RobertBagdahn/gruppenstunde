"""Explicit unit model for ingredient MealItems (openspec `switchable-quantity-units`)."""

import json
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client
from model_bakery import baker

from planner.models import MealItem, MealTypeChoices
from planner.tests import make_meal, make_meal_plan
from supply.services.quantity_units import GramResult, UnitInfo, format_amount
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()

FORMAT_CASES = json.loads(
    (Path(__file__).resolve().parents[2] / "supply" / "tests" / "fixtures" / "quantity_format_cases.json").read_text()
)


def _post_item(client: Client, plan, meal, payload: dict):
    return client.post(
        f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
        data=json.dumps(payload),
        content_type="application/json",
    )


def _patch_item(client: Client, plan, item, payload: dict):
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
    gram = make_measuring_unit(name="Gramm")
    cheese = make_ingredient(name="Frischkäse Doppelrahmstufe", energy_kcal=250)
    cheese_portion = make_portion(
        cheese, name="Portion", quantity=1.0, weight_g=30.0, rank=1, weight_status="confirmed", measuring_unit=gram
    )
    roll = make_ingredient(name="Brötchen", energy_kcal=270)
    roll_piece = make_portion(
        roll, name="Stück", quantity=1.0, weight_g=60.0, rank=1, weight_status="confirmed", measuring_unit=gram
    )
    return {
        "user": user,
        "plan": plan,
        "meal": meal,
        "gram": gram,
        "cheese": cheese,
        "cheese_portion": cheese_portion,
        "roll": roll,
        "roll_piece": roll_piece,
    }


@pytest.mark.parametrize("case", FORMAT_CASES, ids=[case["expected"] for case in FORMAT_CASES])
def test_format_amount_matches_shared_fixtures(case):
    result = GramResult(case["grams"], case["is_approx"], case["missing"])
    unit = UnitInfo(case["unit_kind"], case["unit_label"])
    assert format_amount(quantity=case["quantity"], unit=unit, result=result) == case["expected"]


@pytest.mark.django_db
class TestMealItemUnits:
    def test_portion_item_has_no_measuring_unit(self, client: Client, setup):
        resp = _post_item(
            client,
            setup["plan"],
            setup["meal"],
            {
                "ingredient_id": setup["cheese"].id,
                "portion_id": setup["cheese_portion"].id,
                "measuring_unit_id": setup["gram"].id,
                "quantity": 0.5,
            },
        )

        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["unit_kind"] == "portion"
        assert body["unit_label"] == "Portion"
        assert body["measuring_unit_name"] == ""
        assert body["quantity_g"] == pytest.approx(15)
        assert MealItem.objects.get(id=body["id"]).measuring_unit_id is None

    def test_standard_measure_is_stored(self, client: Client, setup):
        oil = make_ingredient(name="Olivenöl", physical_density=0.92)

        resp = _post_item(
            client,
            setup["plan"],
            setup["meal"],
            {"ingredient_id": oil.id, "standard_measure_key": "el", "quantity": 2},
        )

        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["unit_kind"] == "standard"
        assert body["unit_label"] == "EL"
        assert body["standard_measure_key"] == "el"
        assert body["quantity_g"] == pytest.approx(27.6)
        assert body["is_weight_approx"] is False

    def test_standard_measure_without_density_is_approx(self, client: Client, setup):
        honey = make_ingredient(name="Honig", physical_density=1.0)

        resp = _post_item(
            client,
            setup["plan"],
            setup["meal"],
            {"ingredient_id": honey.id, "standard_measure_key": "tl", "quantity": 1},
        )

        body = resp.json()
        assert body["quantity_g"] == pytest.approx(5)
        assert body["is_weight_approx"] is True

    def test_portion_and_standard_measure_are_rejected(self, client: Client, setup):
        resp = _post_item(
            client,
            setup["plan"],
            setup["meal"],
            {
                "ingredient_id": setup["cheese"].id,
                "portion_id": setup["cheese_portion"].id,
                "standard_measure_key": "el",
                "quantity": 1,
            },
        )
        assert resp.status_code == 422

    def test_unknown_standard_measure_is_rejected(self, client: Client, setup):
        resp = _post_item(
            client,
            setup["plan"],
            setup["meal"],
            {"ingredient_id": setup["cheese"].id, "standard_measure_key": "becher", "quantity": 1},
        )
        assert resp.status_code == 422

    def test_switch_unit_to_piece_keeps_count_semantics(self, client: Client, setup):
        item = MealItem.objects.create(
            meal=setup["meal"], ingredient=setup["roll"], quantity=90, measuring_unit=setup["gram"]
        )

        resp = _patch_item(
            client,
            setup["plan"],
            item,
            {
                "quantity": 2,
                "portion_id": setup["roll_piece"].id,
                "measuring_unit_id": None,
                "standard_measure_key": None,
            },
        )

        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["unit_label"] == "Stück"
        assert body["quantity"] == 2
        assert body["quantity_g"] == pytest.approx(120)
        item.refresh_from_db()
        assert item.portion_id == setup["roll_piece"].id
        assert item.measuring_unit_id is None

    def test_switch_unit_to_grams(self, client: Client, setup):
        item = MealItem.objects.create(
            meal=setup["meal"], ingredient=setup["roll"], quantity=2, portion=setup["roll_piece"]
        )

        resp = _patch_item(
            client,
            setup["plan"],
            item,
            {"quantity": 120, "portion_id": None, "measuring_unit_id": setup["gram"].id, "standard_measure_key": None},
        )

        body = resp.json()
        assert body["unit_kind"] == "grams"
        assert body["quantity_g"] == pytest.approx(120)
        item.refresh_from_db()
        assert item.portion_id is None
        assert item.measuring_unit_id is not None

    def test_switch_unit_requires_edit_rights(self, client: Client, setup):
        item = MealItem.objects.create(
            meal=setup["meal"], ingredient=setup["roll"], quantity=90, measuring_unit=setup["gram"]
        )
        other = baker.make(User)
        client.force_login(other)

        resp = _patch_item(client, setup["plan"], item, {"standard_measure_key": "el"})

        assert resp.status_code in (403, 404)
        item.refresh_from_db()
        assert item.standard_measure_key == ""

    def test_switch_unit_requires_login(self, setup):
        item = MealItem.objects.create(
            meal=setup["meal"], ingredient=setup["roll"], quantity=90, measuring_unit=setup["gram"]
        )

        resp = _patch_item(Client(), setup["plan"], item, {"portion_id": setup["roll_piece"].id})

        assert resp.status_code == 401

    def test_corrected_portion_weight_applies_to_existing_items(self, client: Client, setup):
        item = MealItem.objects.create(
            meal=setup["meal"], ingredient=setup["roll"], quantity=2, portion=setup["roll_piece"]
        )
        setup["roll_piece"].weight_g = 75
        setup["roll_piece"].save(update_fields=["weight_g"])

        body = _patch_item(client, setup["plan"], item, {"quantity": 2}).json()

        assert body["quantity_g"] == pytest.approx(150)

    def test_copy_keeps_unit(self, client: Client, setup):
        source = make_meal(meal_plan=setup["plan"], meal_type=MealTypeChoices.DINNER)
        MealItem.objects.create(meal=source, ingredient=setup["roll"], quantity=2, portion=setup["roll_piece"])

        from planner.services.meal_item_units import copy_unit_fields

        copied = MealItem.objects.create(
            meal=setup["meal"], ingredient=setup["roll"], **copy_unit_fields(source.items.get())
        )

        assert copied.portion_id == setup["roll_piece"].id
        assert copied.quantity == 2


@pytest.mark.django_db
def test_unit_options_endpoint(client: Client):
    user = baker.make(User)
    client.force_login(user)
    gram = make_measuring_unit(name="Gramm")
    roll = make_ingredient(name="Brötchen")
    make_portion(
        roll, name="Stück", quantity=1.0, weight_g=60.0, rank=1, weight_status="confirmed", measuring_unit=gram
    )
    make_portion(
        roll, name="Hälfte", quantity=1.0, weight_g=30.0, rank=2, weight_status="confirmed", measuring_unit=gram
    )

    resp = client.get(f"/api/ingredients/unit-options/?ids={roll.id}")

    assert resp.status_code == 200, resp.content
    [entry] = resp.json()
    labels = [option["label"] for option in entry["options"]]
    assert labels == ["Stück", "Hälfte", "EL", "TL", "Tasse", "Prise", "Msp", "g", "ml"]
    assert entry["options"][0]["grams_per_unit"] == 60


@pytest.mark.django_db
def test_unit_options_work_without_login_for_public_ingredients():
    gram = make_measuring_unit(name="Gramm")
    roll = make_ingredient(name="Öffentliches Brötchen")
    make_portion(
        roll, name="Stück", quantity=1.0, weight_g=60.0, rank=1, weight_status="confirmed", measuring_unit=gram
    )

    resp = Client().get(f"/api/ingredients/unit-options/?ids={roll.id}")

    assert resp.status_code == 200
    assert [entry["ingredient_id"] for entry in resp.json()] == [roll.id]


@pytest.mark.django_db
class TestRefMealSyncKeepsUnits:
    def _ref(self, plan):
        from planner.models import Meal

        return Meal.objects.create(
            meal_plan=plan,
            meal_type=MealTypeChoices.BREAKFAST,
            day_part_factor=0.25,
            is_reference=True,
            start_datetime=None,
            end_datetime=None,
        )

    def test_sync_copies_portion_and_standard_measure(self, setup):
        from planner.api.ref_meal import _sync_ref_meal_to_targets

        ref = self._ref(setup["plan"])
        MealItem.objects.create(meal=ref, ingredient=setup["roll"], quantity=2, portion=setup["roll_piece"])
        MealItem.objects.create(meal=ref, ingredient=setup["cheese"], quantity=3, standard_measure_key="el")
        meal = setup["meal"]
        meal.ref_meal = ref
        meal.is_synced = True
        meal.save()

        assert _sync_ref_meal_to_targets(ref) == 1

        by_ingredient = {item.ingredient_id: item for item in meal.items.all()}
        roll_item = by_ingredient[setup["roll"].id]
        cheese_item = by_ingredient[setup["cheese"].id]
        assert roll_item.portion_id == setup["roll_piece"].id
        assert roll_item.quantity == 2
        assert roll_item.measuring_unit_id is None
        assert cheese_item.standard_measure_key == "el"
        assert cheese_item.portion_id is None
        assert cheese_item.quantity == 3


@pytest.mark.django_db
def test_unit_options_rejects_too_many_ids(client: Client):
    ids = ",".join(str(i) for i in range(1, 202))
    resp = client.get(f"/api/ingredients/unit-options/?ids={ids}")
    assert resp.status_code == 422


@pytest.mark.django_db
def test_normalize_command_maps_legacy_units():
    plan = make_meal_plan()
    meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
    el_unit = make_measuring_unit(name="EL", quantity=15, unit="g")
    slice_unit = make_measuring_unit(name="Scheibe", quantity=1, unit="g")
    bread = make_ingredient(name="Toastbrot")
    slice_portion = make_portion(
        bread, name="Scheibe", quantity=1.0, weight_g=30.0, rank=1, weight_status="confirmed", measuring_unit=slice_unit
    )
    honey = make_ingredient(name="Honig")
    by_el = MealItem.objects.create(meal=meal, ingredient=honey, quantity=1, measuring_unit=el_unit)
    by_slice = MealItem.objects.create(meal=meal, ingredient=bread, quantity=2, measuring_unit=slice_unit)

    call_command("normalize_meal_item_units")
    by_el.refresh_from_db()
    assert by_el.standard_measure_key == ""

    call_command("normalize_meal_item_units", "--apply")
    by_el.refresh_from_db()
    by_slice.refresh_from_db()
    assert by_el.standard_measure_key == "el"
    assert by_el.measuring_unit_id is None
    assert by_slice.portion_id == slice_portion.id
    assert by_slice.quantity == 2
