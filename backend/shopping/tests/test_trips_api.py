"""Plan and trip endpoints of an event (openspec `shopping-trip-planning`)."""

import datetime as dt
import json
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client
from model_bakery import baker

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealItem, MealPlanCollaborator, MealPlanCollaboratorRole
from planner.tests import make_meal, make_meal_plan
from shopping.models import ShoppingList, SourceType, Store
from supply.models import MeasuringUnit
from supply.tests import make_ingredient

User = get_user_model()
BERLIN = ZoneInfo("Europe/Berlin")


def make_user(name: str):
    return User.objects.create_user(username=name, email=f"{name}@example.com", password="x")


def client_for(user) -> Client:
    client = Client()
    client.force_login(user)
    return client


def berlin(day: int, hour: int, minute: int = 0, month: int = 10) -> dt.datetime:
    return dt.datetime(2026, month, day, hour, minute, tzinfo=BERLIN)


def send(client: Client, method: str, url: str, body: dict | None = None):
    kwargs = {"data": json.dumps(body, default=str), "content_type": "application/json"} if body is not None else {}
    return getattr(client, method)(url, **kwargs)


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def lead():
    return make_user("lead")


@pytest.fixture
def event(lead):
    return make_event(name="Sommerlager", created_by=lead)


@pytest.fixture
def plan(event, lead):
    meal_plan = make_meal_plan(created_by=lead, norm_portions=10, reserve_factor=1.0)
    EventMealPlanRelation.objects.create(event=event, meal_plan=meal_plan)
    return meal_plan


@pytest.fixture
def metro(lead):
    return Store.objects.create(owner=lead, name="Metro")


def add_demand(plan, ingredient_name="Kartoffeln", when=None, meal_type="lunch"):
    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"quantity": 1.0, "unit": "g"})
    meal = make_meal(
        meal_plan=plan,
        meal_type=meal_type,
        start_datetime=when or berlin(18, 12),
        end_datetime=(when or berlin(18, 12)) + dt.timedelta(hours=1),
    )
    baker.make(
        MealItem,
        meal=meal,
        recipe=None,
        ingredient=make_ingredient(name=ingredient_name),
        quantity=Decimal("100"),
        measuring_unit=unit,
        factor=1.0,
    )
    return meal


@pytest.mark.django_db
class TestCreateTrip:
    def url(self, event):
        return f"/api/shopping-events/{event.slug}/trips/"

    def test_creates_trip_with_berlin_name(self, lead, event, metro):
        response = send(
            client_for(lead), "post", self.url(event), {"store_id": metro.id, "scheduled_at": berlin(17, 9).isoformat()}
        )

        assert response.status_code == 201, response.content
        body = response.json()
        assert body["name"] == "Metro · Sa 17.10. 09:00"
        assert body["trip_status"] == "planned" and body["event_slug"] == event.slug and body["store_name"] == "Metro"
        trip = ShoppingList.objects.get(id=body["id"])
        assert trip.event_id == event.id and trip.source_type == SourceType.EVENT_TRIP and trip.owner_id == lead.id
        assert trip.scheduled_at == berlin(17, 9)

    def test_winter_time_name_uses_local_clock(self, lead, event, metro):
        when = dt.datetime(2026, 10, 26, 8, 0, tzinfo=dt.UTC)  # 09:00 in Berlin after the clocks went back
        body = send(
            client_for(lead), "post", self.url(event), {"store_id": metro.id, "scheduled_at": when.isoformat()}
        ).json()
        assert body["name"] == "Metro · Mo 26.10. 09:00"

    def test_missing_time_is_422_with_message(self, lead, event, metro):
        response = send(client_for(lead), "post", self.url(event), {"store_id": metro.id})
        assert response.status_code == 422
        assert response.json()["detail"] == "Bitte gib an, wann eingekauft wird."

    def test_missing_store_is_422(self, lead, event):
        response = send(client_for(lead), "post", self.url(event), {"scheduled_at": berlin(17, 9).isoformat()})
        assert response.status_code == 422

    def test_foreign_store_is_422(self, lead, event):
        foreign = Store.objects.create(owner=make_user("other"), name="Aldi")
        response = send(
            client_for(lead),
            "post",
            self.url(event),
            {"store_id": foreign.id, "scheduled_at": berlin(17, 9).isoformat()},
        )
        assert response.status_code == 422

    def test_plan_editor_may_create(self, event, plan, metro, lead):
        editor = make_user("editor")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=editor, role=MealPlanCollaboratorRole.EDITOR)
        store = Store.objects.create(owner=editor, name="Rewe")
        response = send(
            client_for(editor),
            "post",
            self.url(event),
            {"store_id": store.id, "scheduled_at": berlin(17, 9).isoformat()},
        )
        assert response.status_code == 201

    def test_plan_viewer_gets_403(self, event, plan):
        viewer = make_user("viewer")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        store = Store.objects.create(owner=viewer, name="Rewe")
        response = send(
            client_for(viewer),
            "post",
            self.url(event),
            {"store_id": store.id, "scheduled_at": berlin(17, 9).isoformat()},
        )
        assert response.status_code == 403

    def test_stranger_gets_404(self, event, plan):
        stranger = make_user("stranger")
        store = Store.objects.create(owner=stranger, name="Rewe")
        response = send(
            client_for(stranger),
            "post",
            self.url(event),
            {"store_id": store.id, "scheduled_at": berlin(17, 9).isoformat()},
        )
        assert response.status_code == 404

    def test_anonymous_gets_401(self, event):
        assert send(Client(), "post", self.url(event), {}).status_code == 401


@pytest.mark.django_db
class TestGetPlan:
    def url(self, event):
        return f"/api/shopping-events/{event.slug}/plan/"

    def make_trip(self, lead, event, store, when, name):
        return ShoppingList.objects.create(
            name=name, owner=lead, event=event, store=store, scheduled_at=when, source_type=SourceType.EVENT_TRIP
        )

    def test_three_trips_in_time_order_with_their_demand(self, lead, event, plan, metro):
        add_demand(plan, "Kartoffeln", berlin(17, 12), "lunch")
        add_demand(plan, "Nudeln", berlin(19, 12), "lunch")
        add_demand(plan, "Reis", berlin(22, 12), "lunch")
        self.make_trip(lead, event, metro, berlin(22, 10), "Di")
        self.make_trip(lead, event, metro, berlin(17, 9), "Fr")
        self.make_trip(lead, event, metro, berlin(19, 10), "So")

        body = client_for(lead).get(self.url(event)).json()

        assert [t["name"] for t in body["trips"]] == ["Fr", "So", "Di"]
        assert [[r["name"] for r in t["rows"]] for t in body["trips"]] == [["Kartoffeln"], ["Nudeln"], ["Reis"]]
        assert body["can_manage"] is True and body["uncovered"] == []
        first_row = body["trips"][0]["rows"][0]
        assert first_row["total_quantity_g"] == 1000 and first_row["sources"][0]["meal_id"] is not None

    def test_uncovered_demand_is_reported(self, lead, event, plan, metro):
        add_demand(plan, "Kartoffeln", berlin(17, 19), "dinner")
        self.make_trip(lead, event, metro, berlin(18, 10), "Sa")

        body = client_for(lead).get(self.url(event)).json()

        assert [(u["name"], u["reason"]) for u in body["uncovered"]] == [("Kartoffeln", "before_first_trip")]

    def test_plan_viewer_reads_but_cannot_manage(self, lead, event, plan, metro):
        viewer = make_user("viewer")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        response = client_for(viewer).get(self.url(event))
        assert response.status_code == 200 and response.json()["can_manage"] is False

    def test_stranger_gets_404_and_anonymous_401(self, event, plan):
        assert client_for(make_user("stranger")).get(self.url(event)).status_code == 404
        assert Client().get(self.url(event)).status_code == 401

    def test_invited_co_shopper_gets_404(self, lead, event, plan, metro):
        trip = self.make_trip(lead, event, metro, berlin(17, 9), "Rewe Sa")
        ben = make_user("ben")
        from shopping.models import ShoppingListCollaborator

        ShoppingListCollaborator.objects.create(shopping_list=trip, user=ben, role="editor")
        client = client_for(ben)
        assert client.get(self.url(event)).status_code == 404
        assert client.get(f"/api/shopping-lists/{trip.id}/").status_code == 200

    def test_unknown_event_is_404(self, lead):
        assert client_for(lead).get("/api/shopping-events/gibt-es-nicht/plan/").status_code == 404


@pytest.mark.django_db
class TestRules:
    def rules_url(self, event):
        return f"/api/shopping-events/{event.slug}/rules/"

    def plan_url(self, event):
        return f"/api/shopping-events/{event.slug}/plan/"

    @pytest.fixture
    def setup(self, lead, event, plan, metro):
        meal = add_demand(plan, "Hackfleisch", berlin(18, 12))
        rewe = ShoppingList.objects.create(
            name="Rewe Sa", owner=lead, event=event, store=Store.objects.create(owner=lead, name="Rewe"),
            scheduled_at=berlin(17, 9), source_type=SourceType.EVENT_TRIP,
        )  # fmt: skip
        butcher = ShoppingList.objects.create(
            name="Metzger Sa", owner=lead, event=event, store=Store.objects.create(owner=lead, name="Metzger"),
            scheduled_at=berlin(17, 10), source_type=SourceType.EVENT_TRIP,
        )  # fmt: skip
        ingredient_id = meal.items.get().ingredient_id
        return meal, rewe, butcher, ingredient_id

    def names(self, client, event):
        return {t["name"]: [r["name"] for r in t["rows"]] for t in client.get(self.plan_url(event)).json()["trips"]}

    def test_create_moves_ingredient_and_delete_restores_default(self, lead, event, setup):
        _meal, rewe, _butcher, ingredient_id = setup
        client = client_for(lead)
        # By date the meal belongs to the later trip (Metzger, 10:00)
        assert self.names(client, event) == {"Rewe Sa": [], "Metzger Sa": ["Hackfleisch"]}

        response = send(client, "post", self.rules_url(event), {"target_id": rewe.id, "ingredient_id": ingredient_id})
        assert response.status_code == 201, response.content
        rule = response.json()
        assert rule["name"] == "Hackfleisch" and rule["quantity"] is None
        assert self.names(client, event) == {"Rewe Sa": ["Hackfleisch"], "Metzger Sa": []}

        assert client.delete(f"/api/shopping-rules/{rule['id']}/").status_code == 204
        assert self.names(client, event) == {"Rewe Sa": [], "Metzger Sa": ["Hackfleisch"]}

    def test_listing_rules(self, lead, event, setup):
        _meal, _rewe, butcher, ingredient_id = setup
        client = client_for(lead)
        send(client, "post", self.rules_url(event), {"target_id": butcher.id, "ingredient_id": ingredient_id})
        assert [r["target_id"] for r in client.get(self.rules_url(event)).json()] == [butcher.id]

    def test_second_full_move_replaces_the_first(self, lead, event, setup):
        _meal, rewe, butcher, ingredient_id = setup
        client = client_for(lead)
        send(client, "post", self.rules_url(event), {"target_id": butcher.id, "ingredient_id": ingredient_id})
        send(client, "post", self.rules_url(event), {"target_id": rewe.id, "ingredient_id": ingredient_id})
        assert [r["target_id"] for r in client.get(self.rules_url(event)).json()] == [rewe.id]

    def test_partial_rule_is_kept_next_to_others(self, lead, event, setup):
        _meal, rewe, butcher, ingredient_id = setup
        client = client_for(lead)
        send(
            client,
            "post",
            self.rules_url(event),
            {"target_id": butcher.id, "ingredient_id": ingredient_id, "quantity": 300},
        )
        send(
            client,
            "post",
            self.rules_url(event),
            {"target_id": rewe.id, "ingredient_id": ingredient_id, "quantity": 200},
        )
        assert len(client.get(self.rules_url(event)).json()) == 2

    def test_exactly_one_of_ingredient_and_material(self, lead, event, setup):
        _meal, _rewe, butcher, ingredient_id = setup
        client = client_for(lead)
        both = send(
            client,
            "post",
            self.rules_url(event),
            {"target_id": butcher.id, "ingredient_id": ingredient_id, "material_id": 1},
        )
        neither = send(client, "post", self.rules_url(event), {"target_id": butcher.id})
        assert both.status_code == 422 and neither.status_code == 422

    def test_target_must_belong_to_the_event(self, lead, event, setup):
        _meal, _rewe, _butcher, ingredient_id = setup
        foreign = ShoppingList.objects.create(name="Fremd", owner=lead)
        response = send(
            client_for(lead), "post", self.rules_url(event), {"target_id": foreign.id, "ingredient_id": ingredient_id}
        )
        assert response.status_code == 422

    def test_meal_must_belong_to_the_event(self, lead, event, setup):
        _meal, _rewe, butcher, ingredient_id = setup
        other_meal = make_meal(meal_plan=make_meal_plan(created_by=lead))
        response = send(
            client_for(lead), "post", self.rules_url(event),
            {"target_id": butcher.id, "ingredient_id": ingredient_id, "meal_id": other_meal.id},
        )  # fmt: skip
        assert response.status_code == 422

    def test_non_positive_quantity_is_rejected(self, lead, event, setup):
        _meal, _rewe, butcher, ingredient_id = setup
        response = send(
            client_for(lead),
            "post",
            self.rules_url(event),
            {"target_id": butcher.id, "ingredient_id": ingredient_id, "quantity": 0},
        )
        assert response.status_code == 422

    def test_deleting_target_trip_removes_its_rules(self, lead, event, setup):
        from shopping.models import ShoppingAllocationRule

        _meal, _rewe, butcher, ingredient_id = setup
        send(client_for(lead), "post", self.rules_url(event), {"target_id": butcher.id, "ingredient_id": ingredient_id})
        butcher.delete()
        assert ShoppingAllocationRule.objects.count() == 0
        assert client_for(lead).get(self.rules_url(event)).json() == []

    def test_viewer_cannot_change_rules_stranger_gets_404(self, lead, event, plan, setup):
        _meal, _rewe, butcher, ingredient_id = setup
        viewer = make_user("viewer")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        body = {"target_id": butcher.id, "ingredient_id": ingredient_id}
        assert send(client_for(viewer), "post", self.rules_url(event), body).status_code == 403
        assert client_for(viewer).get(self.rules_url(event)).status_code == 200
        assert send(client_for(make_user("stranger")), "post", self.rules_url(event), body).status_code == 404
        assert send(Client(), "post", self.rules_url(event), body).status_code == 401

        rule = send(client_for(lead), "post", self.rules_url(event), body).json()
        assert client_for(viewer).delete(f"/api/shopping-rules/{rule['id']}/").status_code == 403
        assert client_for(make_user("other")).delete(f"/api/shopping-rules/{rule['id']}/").status_code == 404
        assert Client().delete(f"/api/shopping-rules/{rule['id']}/").status_code == 401


@pytest.mark.django_db
class TestUpdateTrip:
    @pytest.fixture
    def trips(self, lead, event, plan, metro):
        add_demand(plan, "Nudeln", berlin(18, 12))
        rewe = Store.objects.create(owner=lead, name="Rewe")
        early = ShoppingList.objects.create(
            name="Metro · Sa 17.10. 09:00", owner=lead, event=event, store=metro,
            scheduled_at=berlin(17, 9), source_type=SourceType.EVENT_TRIP,
        )  # fmt: skip
        late = ShoppingList.objects.create(
            name="Rewe · So 25.10. 10:00", owner=lead, event=event, store=rewe,
            scheduled_at=berlin(25, 10), source_type=SourceType.EVENT_TRIP,
        )  # fmt: skip
        return early, late

    def rows(self, client, event):
        trips = client.get(f"/api/shopping-events/{event.slug}/plan/").json()["trips"]
        return {t["list_id"]: [r["name"] for r in t["rows"]] for t in trips}

    def test_moving_a_date_reassigns_demand(self, lead, event, trips):
        early, late = trips
        client = client_for(lead)
        assert self.rows(client, event) == {early.id: ["Nudeln"], late.id: []}

        response = send(
            client, "patch", f"/api/shopping-lists/{late.id}/", {"scheduled_at": berlin(18, 10).isoformat()}
        )

        assert response.status_code == 200, response.content
        assert response.json()["name"] == "Rewe · So 18.10. 10:00"
        assert self.rows(client, event) == {early.id: [], late.id: ["Nudeln"]}

    def test_change_store_keeps_custom_name(self, lead, event, trips):
        early, _late = trips
        early.name = "Großeinkauf"
        early.save()
        new_store = Store.objects.create(owner=lead, name="Edeka")

        body = send(client_for(lead), "patch", f"/api/shopping-lists/{early.id}/", {"store_id": new_store.id}).json()

        assert body["name"] == "Großeinkauf" and body["store_name"] == "Edeka"

    def test_event_team_member_may_edit_without_invitation(self, lead, event, plan, trips):
        editor = make_user("editor")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=editor, role=MealPlanCollaboratorRole.EDITOR)
        response = send(client_for(editor), "patch", f"/api/shopping-lists/{trips[0].id}/", {"name": "Neu"})
        assert response.status_code == 200

    def test_viewer_cannot_edit_and_unknown_store_is_422(self, lead, event, plan, trips):
        viewer = make_user("viewer")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        assert (
            send(client_for(viewer), "patch", f"/api/shopping-lists/{trips[0].id}/", {"name": "x"}).status_code == 403
        )
        assert (
            send(client_for(lead), "patch", f"/api/shopping-lists/{trips[0].id}/", {"store_id": 999999}).status_code
            == 422
        )

    def test_event_team_may_delete_trip(self, lead, event, plan, trips):
        editor = make_user("editor")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=editor, role=MealPlanCollaboratorRole.EDITOR)
        assert client_for(editor).delete(f"/api/shopping-lists/{trips[1].id}/").status_code == 200
        assert not ShoppingList.objects.filter(id=trips[1].id).exists()

    def test_detail_reports_checked_count_for_delete_confirmation(self, lead, event, trips):
        from django.utils import timezone

        from shopping.models import ShoppingListItem

        early, _late = trips
        early.materialized_at = timezone.now()
        early.save()
        for index in range(3):
            ShoppingListItem.objects.create(shopping_list=early, name=f"A{index}", is_checked=index < 2)

        body = client_for(lead).get(f"/api/shopping-lists/{early.id}/").json()

        assert (body["trip_status"], body["items_count"], body["checked_count"]) == ("created", 3, 2)


@pytest.mark.django_db
class TestPlannedTripDetail:
    def test_detail_carries_preview_until_the_list_is_created(self, lead, event, plan, metro):
        add_demand(plan, "Kartoffeln", berlin(18, 12))
        planned = ShoppingList.objects.create(
            name="Metro Sa", owner=lead, event=event, store=metro, scheduled_at=berlin(17, 9),
            source_type=SourceType.EVENT_TRIP,
        )  # fmt: skip
        client = client_for(lead)

        body = client.get(f"/api/shopping-lists/{planned.id}/").json()

        assert body["trip_status"] == "planned" and body["can_plan"] is True and body["items"] == []
        assert [r["name"] for r in body["preview"]["rows"]] == ["Kartoffeln"]

        client.post(f"/api/shopping-lists/{planned.id}/materialize/")
        created = client.get(f"/api/shopping-lists/{planned.id}/").json()
        assert created["preview"] is None and [i["name"] for i in created["items"]] == ["Kartoffeln"]
