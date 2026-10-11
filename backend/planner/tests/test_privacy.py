"""Privacy tests: meal plan and planner responses never expose e-mail addresses or usernames."""

import json
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from planner.models import MealPlanCollaborator, PlannerCollaborator
from planner.tests import make_meal_plan, make_planner
from profiles.tests import make_user_profile

User = get_user_model()

OWNER_EMAIL = "owner.secret@example.com"
COLLABORATOR_EMAIL = "collab.secret@example.com"
INVITEE_EMAIL = "invitee.secret@example.com"


def _assert_no_email(payload: str) -> None:
    assert OWNER_EMAIL not in payload
    assert COLLABORATOR_EMAIL not in payload
    assert INVITEE_EMAIL not in payload
    assert "@" not in payload


@pytest.fixture
def owner(db):
    # No profile and no name: the fallback must still not reveal the e-mail.
    return User.objects.create_user(username=OWNER_EMAIL, email=OWNER_EMAIL, password="test123")


@pytest.fixture
def collaborator(db):
    user = User.objects.create_user(username=COLLABORATOR_EMAIL, email=COLLABORATOR_EMAIL, password="test123")
    make_user_profile(user=user, scout_name="Eule")
    return user


@pytest.fixture
def invitee(db):
    return User.objects.create_user(username=INVITEE_EMAIL, email=INVITEE_EMAIL, password="test123")


@pytest.fixture
def shared_plan(owner, collaborator):
    plan = make_meal_plan(created_by=owner, name="Herbstlager")
    MealPlanCollaborator.objects.create(meal_plan=plan, user=collaborator, role="editor")
    return plan


def _client(user) -> Client:
    client = Client()
    client.force_login(user)
    return client


@pytest.mark.django_db
class TestMealPlanPrivacy:
    def test_detail_shows_display_names_without_email(self, shared_plan, owner, collaborator):
        res = _client(collaborator).get(f"/api/meal-plans/{shared_plan.id}/")

        assert res.status_code == 200
        data = res.json()
        assert data["owner_name"] == f"Inspi-Nutzer #{owner.id}"
        assert data["collaborators"][0]["display_name"] == "Eule"
        assert "username" not in data["collaborators"][0]
        _assert_no_email(res.content.decode())

    def test_list_shows_owner_display_name_without_email(self, shared_plan, owner, collaborator):
        res = _client(collaborator).get("/api/meal-plans/")

        assert res.status_code == 200
        _assert_no_email(res.content.decode())

    def test_collaborator_endpoints_have_no_email(self, shared_plan, owner, invitee):
        client = _client(owner)

        listed = client.get(f"/api/meal-plans/{shared_plan.id}/collaborators/")
        with patch("planner.services.notification_service.send_mail", return_value=1):
            added = client.post(
                f"/api/meal-plans/{shared_plan.id}/collaborators/",
                {"user_id": invitee.id, "role": "viewer"},
                content_type="application/json",
            )

        assert listed.status_code == 200
        assert [c["display_name"] for c in listed.json()] == ["Eule"]
        assert added.status_code == 201
        assert added.json()["display_name"] == f"Inspi-Nutzer #{invitee.id}"
        _assert_no_email(listed.content.decode())
        _assert_no_email(added.content.decode())


@pytest.mark.django_db
class TestPlannerPrivacy:
    def test_planner_detail_and_invite_have_no_email(self, owner, collaborator, invitee):
        planner = make_planner(owner=owner)
        PlannerCollaborator.objects.create(planner=planner, user=collaborator, role=PlannerCollaborator.Role.EDITOR)
        client = _client(owner)

        detail = client.get(f"/api/planner/{planner.id}/")
        invited = client.post(
            f"/api/planner/{planner.id}/invite/",
            data=json.dumps({"user_id": invitee.id, "role": "viewer"}),
            content_type="application/json",
        )

        assert detail.status_code == 200
        assert detail.json()["collaborators"][0]["display_name"] == "Eule"
        assert "username" not in detail.json()["collaborators"][0]
        assert invited.status_code == 200
        assert invited.json()["message"] == f"Inspi-Nutzer #{invitee.id} eingeladen als viewer"
        _assert_no_email(detail.content.decode())
        _assert_no_email(invited.content.decode())
