"""Tests for arrival-/departure-day handling as partial days.

Covers:
- `create_meals_for_date_timeaware` skip logic (first/last day).
- Event-based meal plan creation uses sensible default arrival/departure
  times instead of 00:00.
- `meal_default_times` is respected consistently (with fallback).
"""

import datetime

import pytest
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from django.contrib.auth import get_user_model

from event.models import Event
from planner.models import Meal, MealTypeChoices
from planner.tests import make_meal_plan

User = get_user_model()


def _aware(date: datetime.date, time_: datetime.time) -> datetime.datetime:
    return timezone.make_aware(datetime.datetime.combine(date, time_))


@pytest.mark.django_db
class TestCreateMealsForDateTimeaware:
    def test_arrival_at_1700_skips_breakfast_and_lunch(self):
        plan = make_meal_plan()
        date = datetime.date(2026, 8, 1)
        plan.start_datetime = _aware(date, datetime.time(17, 0))
        plan.end_datetime = _aware(date + datetime.timedelta(days=1), datetime.time(11, 0))
        plan.save()

        meals = plan.create_meals_for_date_timeaware(date, is_first=True, is_last=False)
        meal_types = {m.meal_type for m in meals}

        assert MealTypeChoices.BREAKFAST not in meal_types
        assert MealTypeChoices.LUNCH not in meal_types
        assert MealTypeChoices.DINNER in meal_types

    def test_departure_at_1100_skips_lunch_and_dinner(self):
        plan = make_meal_plan()
        date = datetime.date(2026, 8, 3)
        plan.start_datetime = _aware(date - datetime.timedelta(days=1), datetime.time(17, 0))
        plan.end_datetime = _aware(date, datetime.time(11, 0))
        plan.save()

        meals = plan.create_meals_for_date_timeaware(date, is_first=False, is_last=True)
        meal_types = {m.meal_type for m in meals}

        assert MealTypeChoices.LUNCH not in meal_types
        assert MealTypeChoices.DINNER not in meal_types
        assert MealTypeChoices.BREAKFAST in meal_types

    def test_middle_day_has_all_meals(self):
        plan = make_meal_plan()
        date = datetime.date(2026, 8, 2)
        plan.start_datetime = _aware(date - datetime.timedelta(days=1), datetime.time(17, 0))
        plan.end_datetime = _aware(date + datetime.timedelta(days=1), datetime.time(11, 0))
        plan.save()

        meals = plan.create_meals_for_date_timeaware(date, is_first=False, is_last=False)
        meal_types = {m.meal_type for m in meals}

        assert MealTypeChoices.BREAKFAST in meal_types
        assert MealTypeChoices.LUNCH in meal_types
        assert MealTypeChoices.DINNER in meal_types

    def test_custom_meal_default_times_change_skip_decision(self):
        plan = make_meal_plan()
        plan.meal_default_times = {"breakfast": ["09:00", "09:30"]}
        date = datetime.date(2026, 8, 5)
        plan.start_datetime = _aware(date, datetime.time(10, 0))
        plan.end_datetime = _aware(date + datetime.timedelta(days=1), datetime.time(11, 0))
        plan.save()

        meals = plan.create_meals_for_date_timeaware(date, is_first=True, is_last=False)
        meal_types = {m.meal_type for m in meals}

        # Breakfast (09:00-09:30) ends before plan start (10:00) -> skipped
        assert MealTypeChoices.BREAKFAST not in meal_types
        assert MealTypeChoices.LUNCH in meal_types

    def test_no_meal_default_times_falls_back_to_hardcoded(self):
        plan = make_meal_plan()
        plan.meal_default_times = {}
        date = datetime.date(2026, 8, 6)
        plan.start_datetime = _aware(date, datetime.time(17, 0))
        plan.end_datetime = _aware(date + datetime.timedelta(days=1), datetime.time(11, 0))
        plan.save()

        meals = plan.create_meals_for_date_timeaware(date, is_first=True, is_last=False)
        meal_types = {m.meal_type for m in meals}

        assert MealTypeChoices.BREAKFAST not in meal_types
        assert MealTypeChoices.LUNCH not in meal_types
        assert MealTypeChoices.DINNER in meal_types


@pytest.mark.django_db
class TestEventMealPlanDefaultTimes:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

    def _make_event(self, start_date: datetime.date, end_date: datetime.date) -> Event:
        # Use noon (not midnight) so the UTC-stored DateTimeField keeps the same
        # calendar date after timezone conversion, avoiding off-by-one shifts.
        return baker.make(
            Event,
            start_date=_aware(start_date, datetime.time(12, 0)),
            end_date=_aware(end_date, datetime.time(12, 0)),
        )

    def test_event_plan_without_explicit_times_gets_arrival_departure_defaults(self):
        start_date = datetime.date(2026, 8, 10)
        end_date = datetime.date(2026, 8, 12)
        event = self._make_event(start_date, end_date)

        resp = self.client.post(
            "/api/meal-plans/",
            data={
                "name": "Sommerlager",
                "event_id": event.id,
            },
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        plan_id = data["id"]

        from planner.models import MealPlan

        plan = MealPlan.objects.get(id=plan_id)
        assert plan.start_datetime.astimezone(timezone.get_current_timezone()).time() != datetime.time(0, 0)
        assert plan.end_datetime.astimezone(timezone.get_current_timezone()).time() != datetime.time(0, 0)

        arrival_meals = Meal.objects.filter(
            meal_plan=plan, is_reference=False, start_datetime__date=start_date
        )
        arrival_types = set(arrival_meals.values_list("meal_type", flat=True))
        assert MealTypeChoices.BREAKFAST not in arrival_types
        assert MealTypeChoices.LUNCH not in arrival_types

        departure_meals = Meal.objects.filter(
            meal_plan=plan, is_reference=False, start_datetime__date=end_date
        )
        departure_types = set(departure_meals.values_list("meal_type", flat=True))
        assert MealTypeChoices.LUNCH not in departure_types
        assert MealTypeChoices.DINNER not in departure_types
