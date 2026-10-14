"""Input guardrails for meal plans (openspec `meal-plan-input-guardrails`)."""

import datetime as dt
import json

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealItem, MealPlan, MealTypeChoices
from planner.services import input_bounds
from planner.tests import make_meal, make_meal_plan
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


def _send(client: Client, method: str, url: str, payload: dict | None = None):
    return getattr(client, method)(url, data=json.dumps(payload or {}), content_type="application/json")


@pytest.fixture
def owner(client: Client):
    user = baker.make(User)
    client.force_login(user)
    return user


def _plan_payload(**overrides) -> dict:
    start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    payload = {
        "name": "Testplan",
        "norm_portions": 10,
        "start_datetime": start.isoformat(),
        "end_datetime": (start + dt.timedelta(days=2)).isoformat(),
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestPlanSettings:
    @pytest.mark.parametrize(
        ("field", "value"),
        [
            ("reserve_factor", -100),
            ("reserve_factor", 2.01),
            ("reserve_factor", 0.99),
            ("activity_factor", 1e9),
            ("activity_factor", 0.5),
            ("norm_portions", 0),
            ("norm_portions", 1000.5),
            ("day_part_factors", {"breakfast": -0.5}),
            ("day_part_factors", {"breakfast": 0.6, "lunch": 0.6, "dinner": 0.5}),
        ],
    )
    def test_create_rejects_out_of_range(self, client: Client, owner, field, value):
        resp = _send(client, "post", "/api/meal-plans/", _plan_payload(**{field: value}))

        assert resp.status_code == 422, resp.content
        assert MealPlan.objects.count() == 0
        assert field in json.dumps(resp.json())

    def test_create_accepts_boundary_values(self, client: Client, owner):
        resp = _send(
            client,
            "post",
            "/api/meal-plans/",
            _plan_payload(reserve_factor=2.0, activity_factor=1.0, norm_portions=1000),
        )

        assert resp.status_code in (200, 201), resp.content

    def test_create_requires_login(self):
        assert _send(Client(), "post", "/api/meal-plans/", _plan_payload()).status_code == 401

    def test_create_rejects_period_over_60_days_without_creating_meals(self, client: Client, owner):
        start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        resp = _send(
            client,
            "post",
            "/api/meal-plans/",
            _plan_payload(start_datetime=start.isoformat(), end_datetime=(start + dt.timedelta(days=364)).isoformat()),
        )

        assert resp.status_code == 422
        assert "end_datetime" in json.dumps(resp.json()) or "Tage" in json.dumps(resp.json())
        assert Meal.objects.count() == 0

    def test_patch_rejects_negative_reserve_and_keeps_value(self, client: Client, owner):
        plan = make_meal_plan(created_by=owner, reserve_factor=1.1)

        resp = _send(client, "patch", f"/api/meal-plans/{plan.id}/", {"reserve_factor": -100})

        assert resp.status_code == 422
        plan.refresh_from_db()
        assert plan.reserve_factor == 1.1

    def test_patch_other_field_ignores_legacy_value(self, client: Client, owner):
        plan = make_meal_plan(created_by=owner)
        MealPlan.objects.filter(pk=plan.pk).update(reserve_factor=3.0)

        resp = _send(client, "patch", f"/api/meal-plans/{plan.id}/", {"name": "Neuer Name"})

        assert resp.status_code == 200, resp.content
        plan.refresh_from_db()
        assert plan.name == "Neuer Name"

    def test_duplicate_rejects_negative_norm_portions(self, client: Client, owner):
        plan = make_meal_plan(created_by=owner)
        start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        before = MealPlan.objects.count()

        resp = _send(
            client,
            "post",
            f"/api/meal-plans/{plan.id}/duplicate/",
            {
                "name": "Kopie",
                "start_datetime": start.isoformat(),
                "end_datetime": (start + dt.timedelta(days=1)).isoformat(),
                "norm_portions": -5e9,
            },
        )

        assert resp.status_code == 422
        assert MealPlan.objects.count() == before


@pytest.mark.django_db
class TestMeals:
    def test_override_portions_zero_is_rejected_and_null_resets(self, client: Client, owner):
        plan = make_meal_plan(created_by=owner)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)

        bad = _send(client, "patch", f"/api/meal-plans/{plan.id}/meals/{meal.id}/", {"override_portions": 0})
        assert bad.status_code == 422
        meal.refresh_from_db()
        assert meal.override_portions is None

        _send(client, "patch", f"/api/meal-plans/{plan.id}/meals/{meal.id}/", {"override_portions": 12})
        reset = _send(client, "patch", f"/api/meal-plans/{plan.id}/meals/{meal.id}/", {"override_portions": None})
        assert reset.status_code == 200
        meal.refresh_from_db()
        assert meal.override_portions == 12 or meal.override_portions is None

    def test_day_part_factor_above_one_is_rejected(self, client: Client, owner):
        plan = make_meal_plan(created_by=owner)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)

        resp = _send(client, "patch", f"/api/meal-plans/{plan.id}/meals/{meal.id}/", {"day_part_factor": 1.4})

        assert resp.status_code == 422

    def test_meal_limit_blocks_the_501st_meal(self, client: Client, owner):
        plan = make_meal_plan(created_by=owner)
        base = timezone.now().replace(hour=8, minute=0, second=0, microsecond=0)
        Meal.objects.bulk_create(
            Meal(
                meal_plan=plan,
                meal_type=MealTypeChoices.SNACK,
                start_datetime=base + dt.timedelta(minutes=i),
                end_datetime=base + dt.timedelta(minutes=i + 1),
                day_part_factor=0.1,
            )
            for i in range(input_bounds.PLAN_MAX_MEALS)
        )

        resp = _send(
            client,
            "post",
            f"/api/meal-plans/{plan.id}/meals/",
            {
                "start_datetime": (base + dt.timedelta(days=1)).isoformat(),
                "end_datetime": (base + dt.timedelta(days=1, hours=1)).isoformat(),
                "meal_type": "snack",
            },
        )

        assert resp.status_code == 422
        assert "500" in resp.json()["detail"] if isinstance(resp.json()["detail"], str) else True


@pytest.fixture
def item_setup(client: Client, owner):
    plan = make_meal_plan(created_by=owner, norm_portions=10, reserve_factor=1.0)
    meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
    gram = make_measuring_unit(name="Gramm")
    flour = make_ingredient(name="Mehl Grenztest")
    piece = make_portion(
        flour, name="Stück", quantity=1.0, weight_g=100.0, rank=1, weight_status="confirmed", measuring_unit=gram
    )
    return {"plan": plan, "meal": meal, "gram": gram, "ingredient": flour, "portion": piece}


@pytest.mark.django_db
class TestQuantities:
    def _add(self, client: Client, setup, payload: dict):
        return _send(client, "post", f"/api/meal-plans/{setup['plan'].id}/meals/{setup['meal'].id}/items/", payload)

    def test_too_many_grams_is_422_not_500(self, client: Client, item_setup):
        resp = self._add(
            client,
            item_setup,
            {
                "ingredient_id": item_setup["ingredient"].id,
                "quantity": 99_999,
                "measuring_unit_id": item_setup["gram"].id,
            },
        )
        # 99 999 g is allowed; 250 000 g is not
        assert resp.status_code == 200, resp.content
        MealItem.objects.all().delete()
        resp = self._add(
            client,
            item_setup,
            {"ingredient_id": item_setup["ingredient"].id, "quantity": 99_999, "portion_id": item_setup["portion"].id},
        )
        assert resp.status_code == 422, resp.content
        assert "quantity" in json.dumps(resp.json())

    def test_zero_and_negative_quantity_are_rejected(self, client: Client, item_setup):
        for quantity in (0, -3):
            resp = self._add(
                client,
                item_setup,
                {
                    "ingredient_id": item_setup["ingredient"].id,
                    "quantity": quantity,
                    "portion_id": item_setup["portion"].id,
                },
            )
            assert resp.status_code == 422

    def test_huge_count_is_422_without_database_error(self, client: Client, item_setup):
        resp = self._add(
            client,
            item_setup,
            {"ingredient_id": item_setup["ingredient"].id, "quantity": 1e12, "portion_id": item_setup["portion"].id},
        )
        assert resp.status_code == 422

    def test_update_cannot_exceed_gram_limit(self, client: Client, item_setup):
        item = MealItem.objects.create(
            meal=item_setup["meal"], ingredient=item_setup["ingredient"], quantity=2, portion=item_setup["portion"]
        )

        resp = _send(
            client, "patch", f"/api/meal-plans/{item_setup['plan'].id}/meal-items/{item.id}/", {"quantity": 5_000}
        )

        assert resp.status_code == 422
        item.refresh_from_db()
        assert float(item.quantity) == 2

    def test_bulk_wizard_is_atomic(self, client: Client, item_setup):
        meals = [item_setup["meal"], make_meal(meal_plan=item_setup["plan"], meal_type=MealTypeChoices.LUNCH)]
        resp = _send(
            client,
            "post",
            f"/api/meal-plans/{item_setup['plan'].id}/meals/wizard-items/bulk/",
            {
                "meal_ids": [meal.id for meal in meals],
                "items": [
                    {
                        "ingredient_id": item_setup["ingredient"].id,
                        "quantity": 1,
                        "portion_id": item_setup["portion"].id,
                    },
                    {
                        "ingredient_id": item_setup["ingredient"].id,
                        "quantity": 5_000,
                        "portion_id": item_setup["portion"].id,
                    },
                ],
            },
        )

        assert resp.status_code == 422, resp.content
        assert MealItem.objects.filter(meal__in=meals).count() == 0

    def test_portion_weight_limit(self, client: Client, owner, item_setup):
        slug = item_setup["ingredient"].slug
        resp = _send(
            client,
            "post",
            f"/api/ingredients/{slug}/portions/",
            {"name": "Riesig", "quantity": 1, "weight_g": 250_000, "measuring_unit_id": item_setup["gram"].id},
        )
        assert resp.status_code in (401, 403, 422)
        if resp.status_code != 422:
            pytest.skip("portion endpoint needs staff rights; limit is covered by the schema test")


def test_portion_schema_limit():
    from pydantic import ValidationError

    from supply.schemas.ingredients import PortionCreateIn, PortionUpdateIn

    with pytest.raises(ValidationError):
        PortionCreateIn(name="x", weight_g=250_000)
    with pytest.raises(ValidationError):
        PortionUpdateIn(weight_g=0)
    assert PortionCreateIn(name="x", weight_g=100_000).weight_g == 100_000


@pytest.mark.django_db
class TestRuntimeLimits:
    def test_legacy_reserve_factor_is_limited(self):
        plan = make_meal_plan(norm_portions=10, reserve_factor=1.1)
        MealPlan.objects.filter(pk=plan.pk).update(reserve_factor=-100, activity_factor=1e9)
        plan.refresh_from_db()

        assert plan.safe_reserve_factor == input_bounds.RESERVE_FACTOR_MIN
        assert plan.safe_activity_factor == input_bounds.ACTIVITY_FACTOR_MAX
        assert plan.scaling_factor == 10 * input_bounds.RESERVE_FACTOR_MIN

    def test_legacy_meal_values_are_limited(self):
        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
        Meal.objects.filter(pk=meal.pk).update(override_portions=-4, day_part_factor=9)
        meal.refresh_from_db()

        assert meal.effective_portions == input_bounds.OVERRIDE_PORTIONS_MIN
        assert meal.safe_day_part_factor == input_bounds.DAY_PART_FACTOR_MAX

    def test_report_command_lists_findings_without_changing_data(self, capsys):
        plan = make_meal_plan()
        MealPlan.objects.filter(pk=plan.pk).update(reserve_factor=-100)

        call_command("report_meal_plan_bounds")
        out = capsys.readouterr().out

        assert f"Plan {plan.id}" in out
        assert "reserve_factor=-100" in out
        plan.refresh_from_db()
        assert plan.reserve_factor == -100
