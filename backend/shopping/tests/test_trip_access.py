"""Planning rights of the event team (openspec `shopping-trip-planning`, requirement „Planungsrecht des Event-Teams“)."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.models import MealPlanCollaborator, MealPlanCollaboratorRole
from planner.tests import make_meal_plan
from shopping.models import ShoppingList, ShoppingListCollaborator, SourceType
from shopping.services.trip_access import event_shopping_role

User = get_user_model()
BASE = "/api/shopping-lists"


def make_user(name: str, **kwargs):
    return User.objects.create_user(username=name, email=f"{name}@example.com", password="x", **kwargs)


def client_for(user) -> Client:
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def creator():
    return make_user("creator")


@pytest.fixture
def event(creator):
    return make_event(created_by=creator)


@pytest.fixture
def plan(event, creator):
    meal_plan = make_meal_plan(created_by=make_user("plan-owner"))
    EventMealPlanRelation.objects.create(event=event, meal_plan=meal_plan)
    return meal_plan


@pytest.fixture
def trip(event, creator):
    return ShoppingList.objects.create(name="Rewe Sa", owner=creator, event=event, source_type=SourceType.EVENT_TRIP)


@pytest.mark.django_db
class TestEventShoppingRole:
    def test_creator_responsible_and_staff_manage(self, event, plan, creator):
        responsible = make_user("responsible")
        event.responsible_persons.add(responsible)
        staff = make_user("staff", is_staff=True)

        assert event_shopping_role(event, creator) == "manage"
        assert event_shopping_role(event, responsible) == "manage"
        assert event_shopping_role(event, staff) == "manage"

    def test_plan_owner_admin_and_editor_manage(self, event, plan):
        admin, editor = make_user("padmin"), make_user("peditor")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=admin, role=MealPlanCollaboratorRole.ADMIN)
        MealPlanCollaborator.objects.create(meal_plan=plan, user=editor, role=MealPlanCollaboratorRole.EDITOR)

        assert event_shopping_role(event, plan.created_by) == "manage"
        assert event_shopping_role(event, admin) == "manage"
        assert event_shopping_role(event, editor) == "manage"

    def test_plan_viewer_reads_only(self, event, plan):
        viewer = make_user("pviewer")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        assert event_shopping_role(event, viewer) == "read"

    def test_strangers_and_anonymous_get_nothing(self, event, plan):
        from django.contrib.auth.models import AnonymousUser

        assert event_shopping_role(event, make_user("stranger")) is None
        assert event_shopping_role(event, AnonymousUser()) is None

    def test_public_plan_does_not_grant_access(self, event, plan, monkeypatch):
        monkeypatch.setattr("content.services.food_access.is_public_meal_plan", lambda _plan: True)
        assert event_shopping_role(event, make_user("visitor")) is None

    def test_plan_of_another_event_does_not_count(self, event, plan):
        other_event = make_event(created_by=make_user("other-creator"))
        other_plan = make_meal_plan(created_by=make_user("other-plan-owner"))
        EventMealPlanRelation.objects.create(event=other_event, meal_plan=other_plan)
        assert event_shopping_role(event, other_plan.created_by) is None


@pytest.mark.django_db
class TestEventTeamAccessToTrips:
    def test_event_team_opens_detail_and_board_without_invitation(self, trip, creator):
        client = client_for(creator)

        detail = client.get(f"{BASE}/{trip.id}/")
        board = client.get(f"{BASE}/{trip.id}/board/")

        assert detail.status_code == 200, detail.content
        assert board.status_code == 200, board.content
        assert detail.json()["can_edit"] is True

    def test_plan_viewer_can_read_but_not_edit(self, trip, plan):
        viewer = make_user("pviewer")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        client = client_for(viewer)

        assert client.get(f"{BASE}/{trip.id}/").status_code == 200
        assert client.get(f"{BASE}/{trip.id}/").json()["can_edit"] is False

    def test_stranger_gets_404(self, trip):
        client = client_for(make_user("stranger"))
        assert client.get(f"{BASE}/{trip.id}/").status_code == 404
        assert client.get(f"{BASE}/{trip.id}/board/").status_code == 404

    def test_role_is_computed_once_per_request(self, trip, creator, monkeypatch):
        from django.test import RequestFactory

        from shopping.services import access

        calls = []
        import shopping.services.trip_access as trip_access

        real = trip_access.event_shopping_role
        monkeypatch.setattr(trip_access, "event_shopping_role", lambda e, u: calls.append(1) or real(e, u))
        request = RequestFactory().get("/")
        request.user = creator
        access.resolve_actor(request, trip)
        access.resolve_actor(request, trip)
        assert len(calls) == 1

    def test_explicit_collaborator_keeps_own_role_when_stronger_than_event_read(self, trip, plan):
        member = make_user("both")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=member, role=MealPlanCollaboratorRole.VIEWER)
        ShoppingListCollaborator.objects.create(shopping_list=trip, user=member, role="editor")
        body = client_for(member).get(f"{BASE}/{trip.id}/").json()
        assert body["can_edit"] is True
