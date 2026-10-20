"""Event list of the shopping overview (openspec `shopping-list-overview`)."""

import datetime as dt

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealPlanCollaborator, MealPlanCollaboratorRole
from planner.tests import make_meal_plan
from shopping.models import ShoppingList, SourceType, Store

User = get_user_model()
URL = "/api/shopping-events/"


def make_user(name: str, **kwargs):
    return User.objects.create_user(username=name, email=f"{name}@example.com", password="x", **kwargs)


def client_for(user) -> Client:
    client = Client()
    client.force_login(user)
    return client


def event_with_plan(creator, name, start_offset_days, length_days=2):
    now = timezone.now()
    start = now + dt.timedelta(days=start_offset_days)
    event = make_event(name=name, created_by=creator, start_date=start, end_date=start + dt.timedelta(days=length_days))
    EventMealPlanRelation.objects.create(event=event, meal_plan=make_meal_plan(created_by=creator))
    return event


@pytest.fixture
def anna():
    return make_user("anna")


@pytest.mark.django_db
class TestListShoppingEvents:
    def test_running_before_upcoming_and_past_is_hidden_by_default(self, anna):
        event_with_plan(anna, "Vergangen", -30)
        event_with_plan(anna, "Kommend", 10)
        event_with_plan(anna, "Laufend", -1, length_days=3)

        body = client_for(anna).get(URL).json()

        assert [e["name"] for e in body["items"]] == ["Laufend", "Kommend"]
        assert body["total"] == 2

    def test_include_past_appends_past_events_most_recent_first(self, anna):
        event_with_plan(anna, "Alt", -60)
        event_with_plan(anna, "Letzte Woche", -8)
        event_with_plan(anna, "Kommend", 10)

        body = client_for(anna).get(f"{URL}?include_past=true").json()

        assert [e["name"] for e in body["items"]] == ["Kommend", "Letzte Woche", "Alt"]

    def test_events_without_meal_plan_are_left_out(self, anna):
        make_event(name="Ohne Plan", created_by=anna)
        assert client_for(anna).get(URL).json()["total"] == 0

    def test_card_shows_trip_count_and_next_trip(self, anna):
        event = event_with_plan(anna, "Sommerlager", 10)
        rewe = Store.objects.create(owner=anna, name="Rewe")
        metro = Store.objects.create(owner=anna, name="Metro")
        soon = timezone.now() + dt.timedelta(days=11)
        for store, when in (
            (metro, soon + dt.timedelta(days=1)),
            (rewe, soon),
            (metro, timezone.now() - dt.timedelta(days=1)),
        ):
            ShoppingList.objects.create(
                name="Einkauf",
                owner=anna,
                event=event,
                store=store,
                scheduled_at=when,
                source_type=SourceType.EVENT_TRIP,
            )

        (card,) = client_for(anna).get(URL).json()["items"]

        assert card["trips_count"] == 3
        assert card["next_trip"]["store_name"] == "Rewe"
        assert card["can_manage"] is True

    def test_plan_viewer_sees_the_event_read_only(self, anna):
        event = event_with_plan(anna, "Sommerlager", 10)
        viewer = make_user("viewer")
        plan = event.meal_plan_relations.get().meal_plan
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)

        (card,) = client_for(viewer).get(URL).json()["items"]

        assert card["name"] == "Sommerlager" and card["can_manage"] is False

    def test_plan_editor_can_manage(self, anna):
        event = event_with_plan(anna, "Sommerlager", 10)
        editor = make_user("editor")
        plan = event.meal_plan_relations.get().meal_plan
        MealPlanCollaborator.objects.create(meal_plan=plan, user=editor, role=MealPlanCollaboratorRole.EDITOR)

        assert client_for(editor).get(URL).json()["items"][0]["can_manage"] is True

    def test_strangers_see_nothing(self, anna):
        event_with_plan(anna, "Privat", 10)
        assert client_for(make_user("stranger")).get(URL).json()["total"] == 0

    def test_responsible_person_sees_the_event(self, anna):
        event = event_with_plan(anna, "Sommerlager", 10)
        responsible = make_user("responsible")
        event.responsible_persons.add(responsible)
        assert client_for(responsible).get(URL).json()["items"][0]["can_manage"] is True

    def test_pagination(self, anna):
        for index in range(5):
            event_with_plan(anna, f"Event {index}", 10 + index)

        body = client_for(anna).get(f"{URL}?page=2&page_size=2").json()

        assert (body["page"], body["page_size"], body["total"], body["total_pages"]) == (2, 2, 5, 3)
        assert [e["name"] for e in body["items"]] == ["Event 2", "Event 3"]

    def test_anonymous_gets_401(self):
        assert Client().get(URL).status_code == 401

    def test_query_count_is_independent_of_event_count(self, anna):
        for index in range(2):
            event_with_plan(anna, f"A{index}", 10 + index)
        client = client_for(anna)
        with CaptureQueriesContext(connection) as few:
            client.get(URL)
        for index in range(8):
            event_with_plan(anna, f"B{index}", 20 + index)
        with CaptureQueriesContext(connection) as many:
            client.get(URL)
        assert len(many) == len(few)


@pytest.mark.django_db
class TestManageableEvents:
    URL = "/api/shopping-events/manageable/"

    def test_lists_only_managed_events_with_search_and_pagination(self, anna):
        mine = make_event(name="Pfingstlager", created_by=anna)
        responsible = make_event(name="Herbstfahrt", created_by=make_user("other"))
        responsible.responsible_persons.add(anna)
        make_event(name="Fremd", created_by=make_user("third"))
        client = client_for(anna)

        body = client.get(self.URL).json()
        assert sorted(e["name"] for e in body["items"]) == ["Herbstfahrt", "Pfingstlager"]
        assert [e["id"] for e in client.get(f"{self.URL}?search=pfing").json()["items"]] == [mine.id]
        assert client.get(f"{self.URL}?page_size=1").json()["total_pages"] == 2

    def test_anonymous_gets_401(self):
        assert Client().get(self.URL).status_code == 401
