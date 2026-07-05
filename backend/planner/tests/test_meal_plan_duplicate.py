"""Tests for the smart meal plan duplicate endpoint."""

import datetime as dt

import pytest
from django.test import Client
from django.utils import timezone
from model_bakery import baker
from planner.models import MealPlan, MealTypeChoices
from planner.tests import make_meal, make_meal_plan

UTC = dt.timezone.utc


@pytest.mark.django_db
class TestMealPlanDuplicate:
    def _duplicate(self, client: Client, plan_id: int, start: str, end: str, name: str = "Kopie", portions: int = 10):
        return client.post(
            f"/api/meal-plans/{plan_id}/duplicate/",
            {"name": name, "start_datetime": start, "end_datetime": end, "norm_portions": portions},
            content_type="application/json",
        )

    def test_successful_duplicate_day_mapping(self, client: Client):
        user = baker.make("auth.User")
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        plan.start_datetime = dt.datetime(2026, 7, 10, 8, 0, tzinfo=UTC)
        plan.end_datetime = dt.datetime(2026, 7, 12, 20, 0, tzinfo=UTC)
        plan.save()

        make_meal(
            meal_plan=plan,
            start_datetime=dt.datetime(2026, 7, 10, 8, 0, tzinfo=UTC),
            end_datetime=dt.datetime(2026, 7, 10, 9, 0, tzinfo=UTC),
            meal_type=MealTypeChoices.BREAKFAST,
        )
        make_meal(
            meal_plan=plan,
            start_datetime=dt.datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
            end_datetime=dt.datetime(2026, 7, 11, 13, 0, tzinfo=UTC),
            meal_type=MealTypeChoices.LUNCH,
        )

        resp = self._duplicate(
            client,
            plan.id,
            "2026-08-01T08:00:00",
            "2026-08-03T20:00:00",
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Kopie"
        assert data["meals_copied"] == 2
        assert data["items_copied"] == 0
        assert data["overrides_copied"] == 0

        new_plan = MealPlan.objects.get(id=data["id"])
        meals = list(new_plan.meals.all().order_by("start_datetime"))
        assert len(meals) == 2

        assert meals[0].start_datetime == dt.datetime(2026, 8, 1, 6, 0, tzinfo=UTC)
        assert meals[0].end_datetime == dt.datetime(2026, 8, 1, 7, 0, tzinfo=UTC)
        assert meals[1].start_datetime == dt.datetime(2026, 8, 2, 10, 0, tzinfo=UTC)
        assert meals[1].end_datetime == dt.datetime(2026, 8, 2, 11, 0, tzinfo=UTC)

    def test_duplicate_preserves_times(self, client: Client):
        user = baker.make("auth.User")
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        plan.start_datetime = dt.datetime(2026, 7, 10, 8, 0, tzinfo=UTC)
        plan.end_datetime = dt.datetime(2026, 7, 12, 20, 0, tzinfo=UTC)
        plan.save()

        make_meal(
            meal_plan=plan,
            start_datetime=dt.datetime(2026, 7, 10, 8, 0, tzinfo=UTC),
            end_datetime=dt.datetime(2026, 7, 10, 9, 0, tzinfo=UTC),
            meal_type=MealTypeChoices.BREAKFAST,
        )

        resp = self._duplicate(
            client,
            plan.id,
            "2026-08-15T10:00:00",
            "2026-08-17T22:00:00",
        )
        assert resp.status_code == 200
        data = resp.json()
        new_plan = MealPlan.objects.get(id=data["id"])
        meal = new_plan.meals.first()
        assert meal.start_datetime.hour == 6
        assert meal.start_datetime.minute == 0

    def test_duplicate_rejects_day_mismatch(self, client: Client):
        user = baker.make("auth.User")
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        plan.start_datetime = dt.datetime(2026, 7, 10, 8, 0, tzinfo=UTC)
        plan.end_datetime = dt.datetime(2026, 7, 12, 20, 0, tzinfo=UTC)
        plan.save()

        resp = self._duplicate(
            client,
            plan.id,
            "2026-08-01T08:00:00",
            "2026-08-02T20:00:00",
        )
        assert resp.status_code == 400
        assert "Tagesanzahl" in resp.json()["detail"]

    def test_duplicate_requires_auth(self, client: Client):
        plan = make_meal_plan()
        plan.start_datetime = dt.datetime(2026, 7, 10, 8, 0, tzinfo=UTC)
        plan.end_datetime = dt.datetime(2026, 7, 12, 20, 0, tzinfo=UTC)
        plan.save()

        resp = self._duplicate(
            client,
            plan.id,
            "2026-08-01T08:00:00",
            "2026-08-03T20:00:00",
        )
        assert resp.status_code == 403

    def test_duplicate_requires_end_datetime_on_source(self, client: Client):
        user = baker.make("auth.User")
        client.force_login(user)
        plan = make_meal_plan(created_by=user)
        plan.start_datetime = dt.datetime(2026, 7, 10, 8, 0, tzinfo=UTC)
        plan.end_datetime = None
        plan.save()

        resp = self._duplicate(
            client,
            plan.id,
            "2026-08-01T08:00:00",
            "2026-08-03T20:00:00",
        )
        assert resp.status_code == 400
        assert "Enddatum" in resp.json()["detail"]
