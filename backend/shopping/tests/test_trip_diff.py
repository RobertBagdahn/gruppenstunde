"""Plan changes after „Liste erstellen“ (openspec `shopping-trip-planning`, „Differenz nach Planänderung übernehmen“)."""

import datetime as dt
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client
from model_bakery import baker

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealItem
from planner.services.plan_touch import touch_meal_plan
from planner.tests import make_meal, make_meal_plan
from shopping.models import ShoppingList, ShoppingListItem, SourceType, Store
from supply.models import Ingredient, MeasuringUnit
from supply.tests import make_ingredient

User = get_user_model()
BERLIN = ZoneInfo("Europe/Berlin")


def berlin(day, hour):
    return dt.datetime(2026, 10, day, hour, 0, tzinfo=BERLIN)


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def lead():
    return User.objects.create_user(username="lead", email="lead@example.com", password="x")


@pytest.fixture
def client(lead):
    c = Client()
    c.force_login(lead)
    return c


@pytest.fixture
def event(lead):
    return make_event(created_by=lead)


@pytest.fixture
def plan(event, lead):
    p = make_meal_plan(created_by=lead, norm_portions=10, reserve_factor=1.0)
    EventMealPlanRelation.objects.create(event=event, meal_plan=p)
    return p


@pytest.fixture
def metro(lead, event):
    store = Store.objects.create(owner=lead, name="Metro")
    return ShoppingList.objects.create(
        name="Metro Sa", owner=lead, event=event, store=store, scheduled_at=berlin(17, 9),
        source_type=SourceType.EVENT_TRIP,
    )  # fmt: skip


def add_meal(plan, name, when, quantity="200", meal_type="lunch"):
    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"quantity": 1.0, "unit": "g"})
    meal = make_meal(
        meal_plan=plan, meal_type=meal_type, start_datetime=when, end_datetime=when + dt.timedelta(hours=1)
    )
    item = baker.make(
        MealItem, meal=meal, recipe=None,
        ingredient=Ingredient.objects.filter(name=name).first() or make_ingredient(name=name),
        quantity=Decimal(quantity), measuring_unit=unit, factor=1.0,
    )  # fmt: skip
    return meal, item


def change_quantity(plan, item, quantity):
    item.quantity = Decimal(quantity)
    item.save()
    touch_meal_plan(plan.id)


def created(client, trip):
    assert client.post(f"/api/shopping-lists/{trip.id}/materialize/").status_code == 200


def diff(client, trip):
    return client.get(f"/api/shopping-lists/{trip.id}/plan-diff/")


def apply(client, trip):
    return client.post(f"/api/shopping-lists/{trip.id}/plan-diff/apply/")


@pytest.mark.django_db
class TestPlanDiff:
    def test_no_change_gives_empty_diff(self, client, plan, metro):
        add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)

        body = diff(client, metro).json()

        assert body["rows"] == [] and body["has_changes"] is False and body["plan_synced_at"]

    def test_more_demand_updates_open_entry(self, client, plan, metro):
        _meal, item = add_meal(plan, "Nudeln", berlin(18, 12), "200")
        created(client, metro)
        change_quantity(plan, item, "300")

        (row,) = diff(client, metro).json()["rows"]
        assert (row["kind"], row["name"], row["snapshot_open"], row["snapshot_checked"], row["current"]) == (
            "changed", "Nudeln", 2000, 0, 3000,
        )  # fmt: skip

        body = apply(client, metro).json()
        assert [i["quantity_g"] for i in body["items"]] == [3000]
        assert diff(client, metro).json()["rows"] == []

    def test_checked_entry_stays_and_missing_part_gets_new_row(self, client, plan, metro):
        _meal, item = add_meal(plan, "Nudeln", berlin(18, 12), "200")
        created(client, metro)
        entry = metro.items.get()
        entry.is_checked = True
        entry.save()
        change_quantity(plan, item, "300")

        (row,) = diff(client, metro).json()["rows"]
        assert (row["snapshot_open"], row["snapshot_checked"], row["current"]) == (0, 2000, 3000)

        apply(client, metro)
        entries = list(metro.items.order_by("id"))
        assert [(e.quantity_g, e.is_checked) for e in entries] == [(2000, True), (1000, False)]
        assert entries[1].sources.count() == 1
        assert entries[1].sources.get().quantity_g == pytest.approx(1000)
        assert diff(client, metro).json()["rows"] == []

    def test_removed_demand_deletes_open_entry_but_keeps_checked(self, client, plan, metro):
        meal_a, _ = add_meal(plan, "Nudeln", berlin(18, 12), meal_type="lunch")
        meal_b, _ = add_meal(plan, "Reis", berlin(18, 18), meal_type="dinner")
        created(client, metro)
        reis = metro.items.get(name="Reis")
        nudeln = metro.items.get(name="Nudeln")
        nudeln.is_checked = True
        nudeln.save()
        meal_a.delete()
        meal_b.delete()
        touch_meal_plan(plan.id)

        rows = {r["name"]: r for r in diff(client, metro).json()["rows"]}
        assert rows["Reis"]["kind"] == "removed" and rows["Nudeln"]["kind"] == "removed"

        apply(client, metro)
        assert list(metro.items.values_list("name", flat=True)) == ["Nudeln"]
        assert not ShoppingListItem.objects.filter(id=reis.id).exists()

    def test_new_demand_creates_entry(self, client, plan, metro):
        add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)
        add_meal(plan, "Reis", berlin(18, 18), meal_type="dinner")
        touch_meal_plan(plan.id)

        (row,) = diff(client, metro).json()["rows"]
        assert (row["kind"], row["name"], row["current"]) == ("new", "Reis", 2000)

        apply(client, metro)
        assert sorted(metro.items.values_list("name", flat=True)) == ["Nudeln", "Reis"]

    def test_manual_entries_are_never_touched(self, client, plan, metro):
        _meal, item = add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)
        manual = ShoppingListItem.objects.create(shopping_list=metro, name="Nudeln", quantity_g=500)
        change_quantity(plan, item, "300")

        apply(client, metro)

        manual.refresh_from_db()
        assert manual.quantity_g == 500
        assert metro.items.filter(sources__isnull=False).get().quantity_g == 3000

    def test_open_entry_keeps_its_claim(self, client, lead, plan, metro):
        _meal, item = add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)
        entry = metro.items.get()
        entry.claimed_by = lead
        entry.save()
        change_quantity(plan, item, "300")

        apply(client, metro)

        entry.refresh_from_db()
        assert entry.quantity_g == 3000 and entry.claimed_by_id == lead.id

    def test_planned_trip_has_no_diff_and_permissions_hold(self, lead, client, plan, metro):
        assert diff(client, metro).status_code == 422
        assert apply(client, metro).status_code == 422

        from planner.models import MealPlanCollaborator, MealPlanCollaboratorRole

        add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)
        viewer = User.objects.create_user(username="viewer", email="v@example.com", password="x")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        viewer_client, stranger_client = Client(), Client()
        viewer_client.force_login(viewer)
        stranger_client.force_login(User.objects.create_user(username="s", email="s@example.com", password="x"))
        assert diff(viewer_client, metro).status_code == 200
        assert apply(viewer_client, metro).status_code == 403
        assert diff(stranger_client, metro).status_code == 404
        assert diff(Client(), metro).status_code == 401


@pytest.mark.django_db
class TestEventTripFreshness:
    def status(self, client, trip):
        body = client.get(f"/api/shopping-lists/{trip.id}/").json()
        return body["source_status"], body["source_updated_at"]

    def test_planned_trip_has_no_status(self, client, plan, metro):
        assert self.status(client, metro) == (None, None)

    def test_created_trip_is_current_then_changed_then_current_after_apply(self, client, plan, metro):
        _meal, item = add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)
        assert self.status(client, metro)[0] == "current"

        change_quantity(plan, item, "300")
        status, updated_at = self.status(client, metro)
        assert status == "changed" and updated_at is not None

        apply(client, metro)
        assert self.status(client, metro)[0] == "current"

    def test_deleted_event_keeps_entries_and_reports_deleted(self, client, event, plan, metro):
        add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)

        event.delete()

        assert self.status(client, metro) == ("deleted", None)
        assert ShoppingList.objects.get(id=metro.id).items.count() == 1

    def test_invited_co_shopper_gets_no_status(self, client, plan, metro):
        from shopping.models import ShoppingListCollaborator

        add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)
        ben = User.objects.create_user(username="ben", email="ben@example.com", password="x")
        ShoppingListCollaborator.objects.create(shopping_list=metro, user=ben, role="editor")
        ben_client = Client()
        ben_client.force_login(ben)

        assert self.status(ben_client, metro) == (None, None)

    def test_overview_needs_no_query_per_list(self, client, lead, event, plan, metro):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        add_meal(plan, "Nudeln", berlin(18, 12))
        created(client, metro)
        with CaptureQueriesContext(connection) as few:
            client.get("/api/shopping-lists/")
        store = metro.store
        for index in range(6):
            ShoppingList.objects.create(
                name=f"T{index}", owner=lead, event=event, store=store, scheduled_at=berlin(19, 9),
                source_type=SourceType.EVENT_TRIP, materialized_at=berlin(17, 8), plan_synced_at=berlin(17, 8),
            )  # fmt: skip
        with CaptureQueriesContext(connection) as many:
            client.get("/api/shopping-lists/")
        assert len(many) == len(few)
