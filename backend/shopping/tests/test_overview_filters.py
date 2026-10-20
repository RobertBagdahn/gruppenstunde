"""Overview sections: lists without event and invited trips (openspec `shopping-list-overview`)."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealPlanCollaborator, MealPlanCollaboratorRole
from planner.tests import make_meal_plan
from shopping.models import ShoppingList, ShoppingListCollaborator, SourceType

User = get_user_model()
URL = "/api/shopping-lists/"


def make_user(name):
    return User.objects.create_user(username=name, email=f"{name}@example.com", password="x")


def client_for(user):
    c = Client()
    c.force_login(user)
    return c


@pytest.fixture
def anna():
    return make_user("anna")


@pytest.fixture
def event(anna):
    ev = make_event(name="Sommerlager", created_by=anna)
    EventMealPlanRelation.objects.create(event=ev, meal_plan=make_meal_plan(created_by=anna))
    return ev


def names(client, query):
    return sorted(i["name"] for i in client.get(f"{URL}?{query}").json()["items"])


@pytest.mark.django_db
class TestWithoutEvent:
    def test_free_and_recipe_lists_only(self, anna, event):
        ShoppingList.objects.create(name="Grillabend", owner=anna)
        ShoppingList.objects.create(name="Stockbrot", owner=anna, source_type=SourceType.RECIPE, source_id=1)
        ShoppingList.objects.create(name="Rewe Sa", owner=anna, event=event, source_type=SourceType.EVENT_TRIP)
        ShoppingList.objects.create(name="Alt", owner=anna, source_type=SourceType.EVENT_TRIP)  # event was deleted

        client = client_for(anna)

        assert names(client, "without_event=true") == ["Grillabend", "Stockbrot"]
        assert len(names(client, "")) == 4

    def test_trip_of_which_the_user_is_member_is_not_listed(self, anna, event):
        ben = make_user("ben")
        trip = ShoppingList.objects.create(name="Rewe Sa", owner=anna, event=event, source_type=SourceType.EVENT_TRIP)
        ShoppingListCollaborator.objects.create(shopping_list=trip, user=ben, role="editor")
        assert names(client_for(ben), "without_event=true") == []


@pytest.mark.django_db
class TestInvitedTrips:
    def test_only_trips_of_events_without_plan_rights(self, anna, event):
        ben = make_user("ben")
        invited = ShoppingList.objects.create(
            name="Rewe Sa", owner=anna, event=event, source_type=SourceType.EVENT_TRIP
        )
        ShoppingListCollaborator.objects.create(shopping_list=invited, user=ben, role="editor")
        ShoppingList.objects.create(name="Frei", owner=ben)

        body = client_for(ben).get(f"{URL}?invited_trips=true").json()

        assert [i["name"] for i in body["items"]] == ["Rewe Sa"]
        assert body["items"][0]["event_name"] == "Sommerlager"

    def test_team_members_do_not_see_trips_in_the_invited_section(self, anna, event):
        trip = ShoppingList.objects.create(name="Rewe Sa", owner=anna, event=event, source_type=SourceType.EVENT_TRIP)
        carla = make_user("carla")
        plan = event.meal_plan_relations.get().meal_plan
        MealPlanCollaborator.objects.create(meal_plan=plan, user=carla, role=MealPlanCollaboratorRole.EDITOR)
        ShoppingListCollaborator.objects.create(shopping_list=trip, user=carla, role="editor")

        assert names(client_for(carla), "invited_trips=true") == []
        assert names(client_for(anna), "invited_trips=true") == []
