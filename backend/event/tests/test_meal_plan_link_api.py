"""Linking an existing meal plan to an event (openspec `event-mealplan-relation`)."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from event.models import Event, EventMealPlanRelation
from event.tests import make_event
from planner.models import MealPlanCollaborator, MealPlanCollaboratorRole
from planner.tests import make_meal_plan

User = get_user_model()


def make_user(name):
    return User.objects.create_user(username=name, email=f"{name}@example.com", password="x")


def client_for(user):
    c = Client()
    c.force_login(user)
    return c


def put_link(client, plan, event_id):
    return client.put(
        f"/api/meal-plans/{plan.id}/event/", json.dumps({"event_id": event_id}), content_type="application/json"
    )


@pytest.fixture
def anna():
    return make_user("anna")


@pytest.fixture
def plan(anna):
    return make_meal_plan(created_by=anna, name="Herbstfahrt")


@pytest.mark.django_db
class TestLinkPlanToEvent:
    def test_links_and_reports_event(self, anna, plan):
        event = make_event(name="Herbstfahrt 2026", created_by=anna)

        response = put_link(client_for(anna), plan, event.id)

        assert response.status_code == 200, response.content
        assert response.json()["event_id"] == event.id and response.json()["event_name"] == "Herbstfahrt 2026"
        assert EventMealPlanRelation.objects.get(meal_plan=plan).event_id == event.id

    def test_same_event_again_is_confirmed(self, anna, plan):
        event = make_event(created_by=anna)
        client = client_for(anna)
        assert put_link(client, plan, event.id).status_code == 200
        assert put_link(client, plan, event.id).status_code == 200
        assert EventMealPlanRelation.objects.filter(meal_plan=plan).count() == 1

    def test_other_event_conflicts(self, anna, plan):
        first, second = make_event(created_by=anna), make_event(created_by=anna)
        client = client_for(anna)
        put_link(client, plan, first.id)

        response = put_link(client, plan, second.id)

        assert response.status_code == 409
        assert response.json()["detail"] == "Dieser Essensplan gehört schon zu einem Event"
        assert EventMealPlanRelation.objects.get(meal_plan=plan).event_id == first.id

    def test_foreign_event_is_403(self, anna, plan):
        foreign = make_event(created_by=make_user("other"))
        assert put_link(client_for(anna), plan, foreign.id).status_code == 403
        assert not EventMealPlanRelation.objects.filter(meal_plan=plan).exists()

    def test_plan_viewer_is_403_and_stranger_404(self, anna, plan):
        event = make_event(created_by=anna)
        viewer = make_user("viewer")
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        assert put_link(client_for(viewer), plan, event.id).status_code == 403
        assert put_link(client_for(make_user("stranger")), plan, event.id).status_code == 404

    def test_anonymous_is_401(self, anna, plan):
        assert put_link(Client(), plan, make_event(created_by=anna).id).status_code == 401

    def test_unknown_event_is_404(self, plan, anna):
        assert put_link(client_for(anna), plan, 999_999).status_code == 404


@pytest.mark.django_db
class TestCreateEventForPlan:
    def payload(self, plan, name="Pfingstlager"):
        now = timezone.now()
        return {
            "name": name,
            "description": "x",
            "location": "Wald",
            "start_date": now.isoformat(),
            "end_date": now.isoformat(),
            "meal_plan_id": plan.id,
            "is_public": False,
        }

    def test_creates_and_links(self, anna, plan):
        response = client_for(anna).post(
            "/api/events/", json.dumps(self.payload(plan)), content_type="application/json"
        )
        assert response.status_code == 200, response.content
        assert EventMealPlanRelation.objects.get(meal_plan=plan).event.name == "Pfingstlager"

    def test_already_linked_plan_creates_no_event(self, anna, plan):
        EventMealPlanRelation.objects.create(event=make_event(created_by=anna), meal_plan=plan)
        before = Event.objects.count()

        response = client_for(anna).post(
            "/api/events/", json.dumps(self.payload(plan, "Zweites Event")), content_type="application/json"
        )

        assert response.status_code == 409
        assert response.json()["detail"] == "Dieser Essensplan gehört schon zu einem Event"
        assert Event.objects.count() == before
