"""Tests for MealPlan contiguity validation, smart merge, and day management."""

import datetime as dt
import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealTypeChoices
from planner.services.contiguity import (
    shrink_range_on_delete,
    smart_merge_days,
    validate_meal_plan_contiguity,
)
from planner.tests import make_meal, make_meal_plan

User = get_user_model()

# ---------------------------------------------------------------------------
# Unit Tests: validate_meal_plan_contiguity
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestValidateContiguity:
    def test_full_coverage_passes(self):
        plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 12, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 11, 12, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 12, 0)),
        )

        validate_meal_plan_contiguity(plan)

    def test_gap_in_middle_raises(self):
        plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 12, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 12, 0)),
        )

        with pytest.raises(Exception) as exc:
            validate_meal_plan_contiguity(plan)
        assert "Lücke" in str(exc.value)
        assert "11.07.2026" in str(exc.value)

    def test_no_meals_skips_validation(self):
        plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 20, 0)),
        )
        validate_meal_plan_contiguity(plan)

    def test_no_meals_at_all_is_valid(self):
        plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 20, 0)),
        )
        validate_meal_plan_contiguity(plan)


# ---------------------------------------------------------------------------
# Unit Tests: smart_merge_days
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSmartMergeDays:
    def setup_method(self):
        self.plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        for day in (10, 11, 12):
            make_meal(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.LUNCH,
                start_datetime=timezone.make_aware(dt.datetime(2026, 7, day, 12, 0)),
            )

    def test_extend_range_at_end(self):
        new_end = timezone.make_aware(dt.datetime(2026, 7, 14, 20, 0))
        smart_merge_days(self.plan, self.plan.start_datetime, new_end)

        self.plan.refresh_from_db()
        assert self.plan.end_datetime == new_end
        dates = set(Meal.objects.filter(meal_plan=self.plan).values_list("start_datetime__date", flat=True).distinct())
        assert {dt.date(2026, 7, d) for d in (10, 11, 12, 13, 14)}.issubset(dates)

    def test_shrink_range_at_both_ends(self):
        new_start = timezone.make_aware(dt.datetime(2026, 7, 11, 8, 0))
        new_end = timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0))
        smart_merge_days(self.plan, new_start, new_end)

        self.plan.refresh_from_db()
        assert self.plan.start_datetime == new_start
        assert self.plan.end_datetime == new_end
        dates = set(Meal.objects.filter(meal_plan=self.plan).values_list("start_datetime__date", flat=True).distinct())
        assert dt.date(2026, 7, 10) not in dates
        assert dt.date(2026, 7, 11) in dates
        assert dt.date(2026, 7, 12) in dates

    def test_shift_range_entirely(self):
        new_start = timezone.make_aware(dt.datetime(2026, 7, 20, 8, 0))
        new_end = timezone.make_aware(dt.datetime(2026, 7, 22, 20, 0))
        smart_merge_days(self.plan, new_start, new_end)

        self.plan.refresh_from_db()
        assert self.plan.start_datetime == new_start
        assert self.plan.end_datetime == new_end
        dates = set(Meal.objects.filter(meal_plan=self.plan).values_list("start_datetime__date", flat=True).distinct())
        assert dt.date(2026, 7, 10) not in dates
        assert dt.date(2026, 7, 22) in dates

    def test_noop_when_same_range(self):
        old_start = self.plan.start_datetime
        old_end = self.plan.end_datetime
        smart_merge_days(self.plan, old_start, old_end)

        self.plan.refresh_from_db()
        assert self.plan.start_datetime == old_start
        assert self.plan.end_datetime == old_end


# ---------------------------------------------------------------------------
# Unit Tests: shrink_range_on_delete
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestShrinkRangeOnDelete:
    def test_delete_first_day_shrinks_start(self):
        plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 12, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 11, 12, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 12, 0)),
        )

        Meal.objects.filter(meal_plan=plan, start_datetime__date=dt.date(2026, 7, 10)).delete()
        shrink_range_on_delete(plan, dt.date(2026, 7, 10))

        plan.refresh_from_db()
        assert plan.start_datetime.date() == dt.date(2026, 7, 11)

    def test_delete_last_day_shrinks_end(self):
        plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 12, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 11, 12, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 12, 0)),
        )

        Meal.objects.filter(meal_plan=plan, start_datetime__date=dt.date(2026, 7, 12)).delete()
        shrink_range_on_delete(plan, dt.date(2026, 7, 12))

        plan.refresh_from_db()
        assert plan.end_datetime.date() == dt.date(2026, 7, 11)

    def test_delete_only_day_sets_both_null(self):
        plan = make_meal_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 20, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 12, 0)),
        )

        Meal.objects.filter(meal_plan=plan).delete()
        shrink_range_on_delete(plan, dt.date(2026, 7, 10))

        plan.refresh_from_db()
        assert plan.start_datetime == dt.datetime(2026, 7, 10, 0, 0).replace(tzinfo=dt.UTC)
        assert plan.end_datetime == dt.datetime(2026, 7, 10, 0, 0).replace(tzinfo=dt.UTC)


# ---------------------------------------------------------------------------
# API Tests: add_day endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAddDayContiguity:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(
            created_by=self.user,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        for day in (10, 11, 12):
            make_meal(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.LUNCH,
                start_datetime=timezone.make_aware(dt.datetime(2026, 7, day, 12, 0)),
            )

    def _add_day(self, date: dt.date):
        return self.client.post(
            f"/api/meal-plans/{self.plan.id}/days/",
            data=json.dumps({"date": date.isoformat()}),
            content_type="application/json",
        )

    def test_add_day_before_current_start_extends_range(self):
        resp = self._add_day(dt.date(2026, 7, 9))
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.start_datetime.date() == dt.date(2026, 7, 9)

    def test_add_day_after_current_end_extends_range(self):
        resp = self._add_day(dt.date(2026, 7, 13))
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.end_datetime.date() == dt.date(2026, 7, 13)

    def test_add_day_in_range_duplicate_returns_400(self):
        resp = self._add_day(dt.date(2026, 7, 10))
        assert resp.status_code == 400
        assert "existiert bereits" in resp.json().get("detail", "")

    def test_add_day_outside_creates_meals_and_validates(self):
        self._add_day(dt.date(2026, 7, 14))

        meals = Meal.objects.filter(meal_plan=self.plan, start_datetime__date=dt.date(2026, 7, 14))
        assert meals.count() > 0


# ---------------------------------------------------------------------------
# API Tests: remove_day endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRemoveDayContiguity:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(
            created_by=self.user,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        for day in (10, 11, 12):
            make_meal(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.LUNCH,
                start_datetime=timezone.make_aware(dt.datetime(2026, 7, day, 12, 0)),
            )

    def test_delete_first_day_succeeds(self):
        resp = self.client.delete(f"/api/meal-plans/{self.plan.id}/days/?date=2026-07-10")
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.start_datetime.date() == dt.date(2026, 7, 11)

    def test_delete_last_day_succeeds(self):
        resp = self.client.delete(f"/api/meal-plans/{self.plan.id}/days/?date=2026-07-12")
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.end_datetime.date() == dt.date(2026, 7, 11)

    def test_delete_middle_day_returns_400(self):
        resp = self.client.delete(f"/api/meal-plans/{self.plan.id}/days/?date=2026-07-11")
        assert resp.status_code == 400
        assert "Mitte" in resp.json().get("detail", "")

    def test_delete_single_day_plan_sets_range_null(self):
        plan = make_meal_plan(
            created_by=self.user,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 20, 0)),
        )
        make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 12, 0)),
        )

        resp = self.client.delete(f"/api/meal-plans/{plan.id}/days/?date=2026-07-10")
        assert resp.status_code == 200

        plan.refresh_from_db()
        assert plan.start_datetime == dt.datetime(2026, 7, 10, 0, 0).replace(tzinfo=dt.UTC)
        assert plan.end_datetime == dt.datetime(2026, 7, 10, 0, 0).replace(tzinfo=dt.UTC)


# ---------------------------------------------------------------------------
# API Tests: PATCH with range change (smart merge)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUpdateMealPlanRangeChange:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(
            created_by=self.user,
            name="Testplan",
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        for day in (10, 11, 12):
            make_meal(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.LUNCH,
                start_datetime=timezone.make_aware(dt.datetime(2026, 7, day, 12, 0)),
            )

    def test_extend_end_triggers_smart_merge(self):
        resp = self.client.patch(
            f"/api/meal-plans/{self.plan.id}/",
            data=json.dumps(
                {
                    "end_datetime": "2026-07-14T20:00:00",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.end_datetime.date() == dt.date(2026, 7, 14)

        dates = set(Meal.objects.filter(meal_plan=self.plan).values_list("start_datetime__date", flat=True).distinct())
        assert dt.date(2026, 7, 13) in dates
        assert dt.date(2026, 7, 14) in dates

    def test_shrink_start_triggers_smart_merge(self):
        resp = self.client.patch(
            f"/api/meal-plans/{self.plan.id}/",
            data=json.dumps(
                {
                    "start_datetime": "2026-07-11T08:00:00",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.start_datetime.date() == dt.date(2026, 7, 11)

        dates = set(Meal.objects.filter(meal_plan=self.plan).values_list("start_datetime__date", flat=True).distinct())
        assert dt.date(2026, 7, 10) not in dates

    def test_noop_when_same_start_end(self):
        # Changing only name should not trigger merge
        resp = self.client.patch(
            f"/api/meal-plans/{self.plan.id}/",
            data=json.dumps({"name": "New Name"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.name == "New Name"
        assert self.plan.start_datetime.date() == dt.date(2026, 7, 10)
        assert self.plan.end_datetime.date() == dt.date(2026, 7, 12)

    def test_shift_range_entirely(self):
        resp = self.client.patch(
            f"/api/meal-plans/{self.plan.id}/",
            data=json.dumps(
                {
                    "start_datetime": "2026-08-01T08:00:00",
                    "end_datetime": "2026-08-03T20:00:00",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.start_datetime.date() == dt.date(2026, 8, 1)
        assert self.plan.end_datetime.date() == dt.date(2026, 8, 3)

        dates = set(Meal.objects.filter(meal_plan=self.plan).values_list("start_datetime__date", flat=True).distinct())
        assert dt.date(2026, 7, 10) not in dates
        assert dt.date(2026, 8, 1) in dates


# ---------------------------------------------------------------------------
# API Tests: add_day_before / add_day_after maintain contiguity
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAddDayEdgeContiguity:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(
            created_by=self.user,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        for day in (10, 11, 12):
            make_meal(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.LUNCH,
                start_datetime=timezone.make_aware(dt.datetime(2026, 7, day, 12, 0)),
            )

    def test_add_day_before_shifts_start(self):
        old_start = self.plan.start_datetime.date()
        resp = self.client.post(f"/api/meal-plans/{self.plan.id}/add-day-before/")
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.start_datetime.date() == old_start - dt.timedelta(days=1)

    def test_add_day_after_shifts_end(self):
        old_end = self.plan.end_datetime.date()
        resp = self.client.post(f"/api/meal-plans/{self.plan.id}/add-day-after/")
        assert resp.status_code == 200

        self.plan.refresh_from_db()
        assert self.plan.end_datetime.date() == old_end + dt.timedelta(days=1)

    def test_add_day_after_creates_meals_for_new_day(self):
        self.client.post(f"/api/meal-plans/{self.plan.id}/add-day-after/")

        new_date = self.plan.end_datetime.date()
        meals = Meal.objects.filter(meal_plan=self.plan, start_datetime__date=new_date)
        assert meals.count() > 0


# ---------------------------------------------------------------------------
# API Tests: authorization for day operations
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDayOperationsAuthorization:
    def setup_method(self):
        self.user = baker.make(User)
        self.other_user = baker.make(User)
        self.client = Client()
        self.plan = make_meal_plan(
            created_by=self.user,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 20, 0)),
        )
        for day in (10, 11, 12):
            make_meal(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.LUNCH,
                start_datetime=timezone.make_aware(dt.datetime(2026, 7, day, 12, 0)),
            )

    def test_unauthenticated_returns_403(self):
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/days/",
            data=json.dumps({"date": "2026-07-09"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_other_user_cannot_add_day(self):
        self.client.force_login(self.other_user)
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/days/",
            data=json.dumps({"date": "2026-07-09"}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_unauthenticated_cannot_remove_day(self):
        resp = self.client.delete(f"/api/meal-plans/{self.plan.id}/days/?date=2026-07-10")
        assert resp.status_code == 403

    def test_unauthenticated_cannot_add_day_before(self):
        resp = self.client.post(f"/api/meal-plans/{self.plan.id}/add-day-before/")
        assert resp.status_code == 403

    def test_unauthenticated_cannot_add_day_after(self):
        resp = self.client.post(f"/api/meal-plans/{self.plan.id}/add-day-after/")
        assert resp.status_code == 403
