"""Cached shopping plan of an event (openspec `shopping-trip-planning`)."""

import datetime as dt
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from model_bakery import baker

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealItem
from planner.services.plan_touch import touch_meal_plan
from planner.tests import make_meal, make_meal_plan
from shopping.models import ShoppingAllocationRule, ShoppingList, SourceType, Store
from shopping.services.trips import plan as plan_module
from shopping.services.trips.plan import build_shopping_plan
from supply.models import MeasuringUnit
from supply.tests import make_ingredient

User = get_user_model()


def at(day: int, hour: int, month: int = 10) -> dt.datetime:
    return timezone.make_aware(dt.datetime(2026, month, day, hour, 0))


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def owner():
    return User.objects.create_user(username="planner", email="planner@example.com", password="x")


@pytest.fixture
def gram():
    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"quantity": 1.0, "unit": "g"})
    return unit


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


def add_trip(owner, event, store_name, when) -> ShoppingList:
    store, _ = Store.objects.get_or_create(owner=owner, name=store_name)
    return ShoppingList.objects.create(
        name=f"{store_name} Einkauf",
        owner=owner,
        event=event,
        store=store,
        scheduled_at=when,
        source_type=SourceType.EVENT_TRIP,
    )


@pytest.fixture
def event_with_plan(owner, gram):
    event = make_event()
    plan = make_meal_plan(norm_portions=10, reserve_factor=1.0, created_by=owner)
    EventMealPlanRelation.objects.create(event=event, meal_plan=plan)
    lunch = make_meal(meal_plan=plan, meal_type="lunch", start_datetime=at(18, 12), end_datetime=at(18, 13))
    add_ingredient(lunch, make_ingredient(name="Kartoffeln"), gram)
    return event, plan, lunch


@pytest.mark.django_db
class TestShoppingPlan:
    def test_preview_assigns_demand_to_the_trip_by_date(self, owner, event_with_plan):
        event, _plan, _lunch = event_with_plan
        early = add_trip(owner, event, "Metro", at(17, 9))
        add_trip(owner, event, "Rewe", at(19, 9))

        plan = build_shopping_plan(event)

        assert plan.trips[0].list_id == early.id
        first, second = plan.trips
        assert [(r.name, r.ingredient.total_quantity_g) for r in first.rows] == [("Kartoffeln", 1000.0)]
        assert second.rows == []
        assert plan.uncovered == []

    def test_event_without_trips_is_uncovered(self, event_with_plan):
        event, _plan, _lunch = event_with_plan
        plan = build_shopping_plan(event)
        assert plan.trips == []
        assert [(u.name, u.reason) for u in plan.uncovered] == [("Kartoffeln", "no_trips")]

    def test_cache_hit_does_not_recompute(self, owner, event_with_plan, monkeypatch):
        event, _plan, _lunch = event_with_plan
        add_trip(owner, event, "Metro", at(17, 9))
        first = build_shopping_plan(event)
        monkeypatch.setattr(plan_module, "compute_state", lambda e: pytest.fail("recomputed on cache hit"))

        second = build_shopping_plan(event)

        assert second.stamp == first.stamp
        assert [t.list_id for t in second.trips] == [t.list_id for t in first.trips]

    def test_plan_change_invalidates(self, owner, event_with_plan, gram):
        event, plan, lunch = event_with_plan
        add_trip(owner, event, "Metro", at(17, 9))
        before = build_shopping_plan(event)
        add_ingredient(lunch, make_ingredient(name="Möhren"), gram)
        touch_meal_plan(plan.id)

        after = build_shopping_plan(event)

        assert after.stamp != before.stamp
        assert {r.name for r in after.trips[0].rows} == {"Kartoffeln", "Möhren"}

    def test_new_trip_invalidates(self, owner, event_with_plan):
        event, _plan, _lunch = event_with_plan
        add_trip(owner, event, "Metro", at(17, 9))
        before = build_shopping_plan(event)
        add_trip(owner, event, "Rewe", at(18, 10))

        after = build_shopping_plan(event)

        assert after.stamp != before.stamp
        assert [len(t.rows) for t in after.trips] == [0, 1]

    def test_rule_change_invalidates(self, owner, event_with_plan):
        event, _plan, _lunch = event_with_plan
        metro = add_trip(owner, event, "Metro", at(17, 9))
        rewe = add_trip(owner, event, "Rewe", at(18, 10))
        before = build_shopping_plan(event)
        potatoes = before.trips[1].rows[0]
        rule = ShoppingAllocationRule.objects.create(
            event=event, target=metro, ingredient_id=potatoes.subject_id, created_by=owner
        )

        moved = build_shopping_plan(event)
        assert [len(t.rows) for t in moved.trips] == [1, 0]
        assert moved.trips[0].rows[0].rule_ids == [rule.id]

        rule.delete()
        restored = build_shopping_plan(event)
        assert [len(t.rows) for t in restored.trips] == [0, 1]
        assert rewe.id == restored.trips[1].list_id

    def test_partial_rule_splits_quantity(self, owner, event_with_plan):
        event, _plan, _lunch = event_with_plan
        metro = add_trip(owner, event, "Metro", at(17, 9))
        add_trip(owner, event, "Rewe", at(18, 10))
        potatoes = build_shopping_plan(event).trips[1].rows[0]
        ShoppingAllocationRule.objects.create(
            event=event, target=metro, ingredient_id=potatoes.subject_id, quantity=300.0, created_by=owner
        )

        plan = build_shopping_plan(event)

        assert plan.trips[0].rows[0].ingredient.total_quantity_g == pytest.approx(300.0)
        assert plan.trips[1].rows[0].ingredient.total_quantity_g == pytest.approx(700.0)
        assert plan.trips[0].rows[0].spread_count == 2

    def test_query_count_is_bounded_regardless_of_meals(self, owner, event_with_plan, gram):
        event, plan_obj, _lunch = event_with_plan
        add_trip(owner, event, "Metro", at(1, 6))
        ingredient = make_ingredient(name="Hafer")
        for index in range(2, 12):
            meal = make_meal(
                meal_plan=plan_obj,
                meal_type=("breakfast", "dinner")[index % 2],
                start_datetime=at(index, 8 if index % 2 == 0 else 18),
                end_datetime=at(index, 9 if index % 2 == 0 else 19),
            )
            add_ingredient(meal, ingredient, gram)
        with CaptureQueriesContext(connection) as many:
            build_shopping_plan(event)
        cache.clear()

        for extra in range(12, 25):
            meal = make_meal(
                meal_plan=plan_obj,
                meal_type=("breakfast", "dinner")[extra % 2],
                start_datetime=at(extra, 8 if extra % 2 == 0 else 18),
                end_datetime=at(extra, 9 if extra % 2 == 0 else 19),
            )
            add_ingredient(meal, ingredient, gram)
        with CaptureQueriesContext(connection) as more:
            build_shopping_plan(event)

        assert len(more) == len(many)
        assert len(more) <= 40

    def test_cache_hit_needs_only_the_stamp_queries(self, owner, event_with_plan):
        event, _plan, _lunch = event_with_plan
        add_trip(owner, event, "Metro", at(17, 9))
        build_shopping_plan(event)
        with CaptureQueriesContext(connection) as hit:
            build_shopping_plan(event)
        assert len(hit) <= 5
