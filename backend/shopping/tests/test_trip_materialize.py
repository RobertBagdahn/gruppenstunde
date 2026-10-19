"""Freezing a planned trip (openspec `shopping-trip-planning`, „Liste erstellen friert den Einkauf ein“)."""

import datetime as dt
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.test import Client
from model_bakery import baker

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealItem
from planner.services.plan_touch import touch_meal_plan
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import Recipe
from recipe.tests import make_recipe
from shopping.models import ShoppingList, ShoppingListItem, SourceType, Store
from supply.models import ContentMaterialItem, Ingredient, Material, MeasuringUnit
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


def trip(lead, event, name, when, store_name="Metro"):
    store, _ = Store.objects.get_or_create(owner=lead, name=store_name)
    return ShoppingList.objects.create(
        name=name, owner=lead, event=event, store=store, scheduled_at=when, source_type=SourceType.EVENT_TRIP
    )


def add_ingredient_meal(plan, name, when, meal_type="lunch", quantity="100"):
    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"quantity": 1.0, "unit": "g"})
    meal = make_meal(
        meal_plan=plan, meal_type=meal_type, start_datetime=when, end_datetime=when + dt.timedelta(hours=1)
    )
    baker.make(
        MealItem, meal=meal, recipe=None, ingredient=Ingredient.objects.filter(name=name).first() or make_ingredient(name=name),
        quantity=Decimal(quantity), measuring_unit=unit, factor=1.0,
    )  # fmt: skip
    return meal


def materialize(client, trip_obj):
    return client.post(f"/api/shopping-lists/{trip_obj.id}/materialize/")


@pytest.mark.django_db
class TestMaterialize:
    def test_creates_entries_with_sources_and_status(self, lead, client, event, plan):
        meal = add_ingredient_meal(plan, "Kartoffeln", berlin(18, 12))
        metro = trip(lead, event, "Metro Sa", berlin(17, 9))

        response = materialize(client, metro)

        assert response.status_code == 200, response.content
        body = response.json()
        assert body["trip_status"] == "created" and body["materialized_at"] and body["plan_synced_at"]
        (item,) = body["items"]
        assert item["name"] == "Kartoffeln" and item["quantity_g"] == 1000
        assert [s["meal_id"] for s in item["sources"]] == [meal.id]
        metro.refresh_from_db()
        assert metro.materialized_at is not None and metro.plan_synced_at == metro.materialized_at

    def test_second_call_conflicts(self, lead, client, event, plan):
        add_ingredient_meal(plan, "Kartoffeln", berlin(18, 12))
        metro = trip(lead, event, "Metro Sa", berlin(17, 9))
        assert materialize(client, metro).status_code == 200

        again = materialize(client, metro)

        assert again.status_code == 409
        assert metro.items.count() == 1

    def test_manual_entries_stay(self, lead, client, event, plan):
        add_ingredient_meal(plan, "Kartoffeln", berlin(18, 12))
        metro = trip(lead, event, "Metro Sa", berlin(17, 9))
        ShoppingListItem.objects.create(shopping_list=metro, name="Kaffee", sort_order=0)

        names = [i["name"] for i in materialize(client, metro).json()["items"]]

        assert sorted(names) == ["Kaffee", "Kartoffeln"]

    def test_only_the_allocated_share_is_frozen(self, lead, client, event, plan):
        add_ingredient_meal(plan, "Kartoffeln", berlin(18, 12), "lunch")
        add_ingredient_meal(plan, "Kartoffeln", berlin(20, 12), "dinner")
        early = trip(lead, event, "Metro Sa", berlin(17, 9))
        trip(lead, event, "Rewe Mo", berlin(19, 9), "Rewe")

        items = materialize(client, early).json()["items"]

        assert [i["quantity_g"] for i in items] == [1000]

    def test_plan_change_afterwards_does_not_touch_created_trip(self, lead, client, event, plan):
        meal = add_ingredient_meal(plan, "Kartoffeln", berlin(18, 12))
        metro = trip(lead, event, "Metro Sa", berlin(17, 9))
        materialize(client, metro)

        meal.delete()
        touch_meal_plan(plan.id)

        assert [i.quantity_g for i in metro.items.all()] == [1000]

    def test_created_trip_keeps_its_demand_when_a_new_trip_appears(self, lead, client, event, plan):
        add_ingredient_meal(plan, "Kartoffeln", berlin(18, 12))
        metro = trip(lead, event, "Metro Sa", berlin(17, 9))
        materialize(client, metro)
        later = trip(lead, event, "Rewe 18:00", berlin(17, 18), "Rewe")

        body = client.get(f"/api/shopping-events/{event.slug}/plan/").json()
        rows = {t["list_id"]: [r["name"] for r in t["rows"]] for t in body["trips"]}

        assert rows[metro.id] == ["Kartoffeln"] and rows[later.id] == []

    def test_materials_become_piece_entries_with_meal_sources(self, lead, client, event, plan):
        recipe = make_recipe(title="Nudeln")
        plate = Material.objects.create(name="Pappteller", is_consumable=True)
        ContentMaterialItem.objects.create(
            content_type=ContentType.objects.get_for_model(Recipe, for_concrete_model=False),
            object_id=recipe.pk, material=plate, amount=1, quantity_mode="per_portion",
        )  # fmt: skip
        meal = make_meal(meal_plan=plan, start_datetime=berlin(18, 12), end_datetime=berlin(18, 13))
        make_meal_item(meal=meal, recipe=recipe)
        metro = trip(lead, event, "Metro Sa", berlin(17, 9))

        materialize(client, metro)

        item = metro.items.get(material=plate)
        assert item.unit == "Stück" and item.quantity_g == 10
        assert list(item.sources.values_list("meal_id", flat=True)) == [meal.id]

    def test_viewer_and_stranger_are_refused_and_anonymous_is_401(self, lead, event, plan):
        from planner.models import MealPlanCollaborator, MealPlanCollaboratorRole

        metro = trip(lead, event, "Metro Sa", berlin(17, 9))
        viewer = User.objects.create_user(username="viewer", email="v@example.com", password="x")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        stranger = User.objects.create_user(username="stranger", email="s@example.com", password="x")
        viewer_client, stranger_client = Client(), Client()
        viewer_client.force_login(viewer)
        stranger_client.force_login(stranger)

        assert materialize(viewer_client, metro).status_code == 403
        assert materialize(stranger_client, metro).status_code == 404
        assert materialize(Client(), metro).status_code == 401

    def test_list_without_event_is_rejected(self, lead, client):
        plain = ShoppingList.objects.create(name="Frei", owner=lead)
        assert materialize(client, plain).status_code == 422
