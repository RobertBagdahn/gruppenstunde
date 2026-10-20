"""Demand of an event over all linked meal plans (openspec `shopping-trip-planning`)."""

import datetime as dt
from decimal import Decimal

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from model_bakery import baker

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealItem
from planner.tests import make_meal, make_meal_plan
from shopping.services.trips.demand import build_event_demand
from supply.models import MeasuringUnit
from supply.tests import make_ingredient


@pytest.fixture
def gram():
    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"quantity": 1.0, "unit": "g"})
    return unit


def at(day: int, hour: int) -> dt.datetime:
    return timezone.make_aware(dt.datetime(2026, 10, day, hour, 0))


def add_ingredient(meal, ingredient, gram, quantity=100.0):
    return baker.make(
        MealItem,
        meal=meal,
        recipe=None,
        ingredient=ingredient,
        quantity=Decimal(str(quantity)),
        measuring_unit=gram,
        factor=1.0,
    )


def plan_for(event, **kwargs):
    plan = make_meal_plan(norm_portions=10, reserve_factor=1.0, **kwargs)
    EventMealPlanRelation.objects.create(event=event, meal_plan=plan)
    return plan


@pytest.mark.django_db
class TestEventDemand:
    def test_two_plans_yield_units_per_plan_and_meal(self, gram):
        event = make_event()
        noodles = make_ingredient(name="Nudeln")
        plan_a, plan_b = plan_for(event), plan_for(event)
        meal_a = make_meal(meal_plan=plan_a, start_datetime=at(24, 12), end_datetime=at(24, 13))
        meal_b = make_meal(meal_plan=plan_b, start_datetime=at(24, 12), end_datetime=at(24, 13))
        add_ingredient(meal_a, noodles, gram)
        add_ingredient(meal_b, noodles, gram)

        units = build_event_demand(event)

        assert sorted((u.plan_id, u.meal_id) for u in units) == sorted([(plan_a.id, meal_a.id), (plan_b.id, meal_b.id)])
        assert all(u.kind == "ingredient" and u.subject_id == noodles.id for u in units)
        assert all(u.need_at == at(24, 12) for u in units)
        assert sum(u.quantity for u in units) == pytest.approx(2000.0)

    def test_external_meal_creates_no_demand(self, gram):
        event = make_event()
        plan = plan_for(event)
        external = make_meal(meal_plan=plan, is_external=True)
        add_ingredient(external, make_ingredient(name="Pizza"), gram)

        assert build_event_demand(event) == []

    def test_meal_without_start_time_has_no_need_at(self, gram):
        event = make_event()
        plan = plan_for(event)
        meal = make_meal(meal_plan=plan, start_datetime=None, end_datetime=None)
        add_ingredient(meal, make_ingredient(name="Reis"), gram)

        (unit,) = build_event_demand(event)

        assert unit.need_at is None
        assert unit.meal_id == meal.id

    def test_query_count_does_not_grow_with_meals(self, gram):
        event = make_event()
        plan = plan_for(event)
        meal_types = ["breakfast", "lunch", "dinner"]
        ingredient = make_ingredient(name="Hafer")
        for index, meal_type in enumerate(meal_types):
            meal = make_meal(
                meal_plan=plan, meal_type=meal_type, start_datetime=at(1 + index, 8), end_datetime=at(1 + index, 9)
            )
            add_ingredient(meal, ingredient, gram)
        with CaptureQueriesContext(connection) as small:
            build_event_demand(event)

        for index in range(3, 9):
            meal = make_meal(
                meal_plan=plan,
                meal_type=meal_types[index % 3],
                start_datetime=at(1 + index, 8),
                end_datetime=at(1 + index, 9),
            )
            add_ingredient(meal, ingredient, gram)
        with CaptureQueriesContext(connection) as large:
            build_event_demand(event)

        assert len(large) <= len(small) + 1
