"""Tests for MealPlan collaborator CRUD endpoints."""

import datetime as dt
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from planner.models import MealPlan, MealPlanCollaborator

User = get_user_model()


@pytest.mark.django_db
class TestCollaboratorList:
    def test_list_collaborators_happy_path(self, client: Client):
        """Owner can list collaborators."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="editor")

        client.login(username="owner@test.de", password="pass")
        resp = client.get(f"/api/meal-plans/{plan.id}/collaborators/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["username"] == "collab"
        assert data[0]["role"] == "editor"

    def test_list_collaborators_403_for_no_access(self, client: Client):
        """User without access gets 404 (not found, not 403)."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        other = User.objects.create_user(username="other", email="other@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))

        client.login(username="other@test.de", password="pass")
        resp = client.get(f"/api/meal-plans/{plan.id}/collaborators/")
        assert resp.status_code == 404

    def test_list_collaborators_404_non_existent(self, client: Client):
        """Non-existent plan returns 404."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        client.login(username="owner@test.de", password="pass")
        resp = client.get("/api/meal-plans/99999/collaborators/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestCollaboratorAdd:
    def test_add_collaborator(self, client: Client):
        """Owner can add a collaborator."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))

        client.login(username="owner@test.de", password="pass")
        with patch("planner.services.notification_service.send_mail") as mock_send:
            mock_send.return_value = 1
            resp = client.post(
                f"/api/meal-plans/{plan.id}/collaborators/",
                {"user_id": collab.id, "role": "editor"},
                content_type="application/json",
            )
        assert resp.status_code == 201
        assert resp.json()["username"] == "collab"

    def test_add_duplicate_collaborator_409(self, client: Client):
        """Adding the same user twice returns 409."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="viewer")

        client.login(username="owner@test.de", password="pass")
        resp = client.post(
            f"/api/meal-plans/{plan.id}/collaborators/",
            {"user_id": collab.id, "role": "editor"},
            content_type="application/json",
        )
        assert resp.status_code == 409

    def test_add_owner_as_collaborator_400(self, client: Client):
        """Adding the owner as collaborator returns 400."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))

        client.login(username="owner@test.de", password="pass")
        resp = client.post(
            f"/api/meal-plans/{plan.id}/collaborators/",
            {"user_id": owner.id, "role": "viewer"},
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_add_collaborator_non_admin_403(self, client: Client):
        """Non-admin collaborator cannot add others."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        viewer = User.objects.create_user(username="viewer", email="viewer@test.de", password="pass")
        other = User.objects.create_user(username="other", email="other@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role="viewer")

        client.login(username="viewer@test.de", password="pass")
        resp = client.post(
            f"/api/meal-plans/{plan.id}/collaborators/",
            {"user_id": other.id, "role": "viewer"},
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_add_collaborator_editor_also_403(self, client: Client):
        """Editor (not admin) cannot add others."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        editor = User.objects.create_user(username="editor", email="editor@test.de", password="pass")
        other = User.objects.create_user(username="other", email="other@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=editor, role="editor")

        client.login(username="editor@test.de", password="pass")
        resp = client.post(
            f"/api/meal-plans/{plan.id}/collaborators/",
            {"user_id": other.id, "role": "viewer"},
            content_type="application/json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestCollaboratorUpdate:
    def test_update_role(self, client: Client):
        """Owner can change a collaborator's role."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        mc = MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="viewer")

        client.login(username="owner@test.de", password="pass")
        resp = client.patch(
            f"/api/meal-plans/{plan.id}/collaborators/{mc.id}/",
            {"role": "editor"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "editor"
        mc.refresh_from_db()
        assert mc.role == "editor"

    def test_update_role_non_admin_403(self, client: Client):
        """Viewer cannot change roles."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        viewer = User.objects.create_user(username="viewer", email="viewer@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role="viewer")
        mc = MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="viewer")

        client.login(username="viewer@test.de", password="pass")
        resp = client.patch(
            f"/api/meal-plans/{plan.id}/collaborators/{mc.id}/",
            {"role": "editor"},
            content_type="application/json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestCollaboratorRemove:
    def test_remove_collaborator(self, client: Client):
        """Owner can remove a collaborator."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        mc = MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="viewer")

        client.login(username="owner@test.de", password="pass")
        resp = client.delete(f"/api/meal-plans/{plan.id}/collaborators/{mc.id}/")
        assert resp.status_code == 200
        assert not MealPlanCollaborator.objects.filter(id=mc.id).exists()

    def test_remove_collaborator_non_admin_403(self, client: Client):
        """Viewer cannot remove collaborators."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        viewer = User.objects.create_user(username="viewer", email="viewer@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role="viewer")
        mc = MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="viewer")

        client.login(username="viewer@test.de", password="pass")
        resp = client.delete(f"/api/meal-plans/{plan.id}/collaborators/{mc.id}/")
        assert resp.status_code == 403
        assert MealPlanCollaborator.objects.filter(id=mc.id).exists()


@pytest.mark.django_db
class TestIsOwner:
    def test_owner_sees_is_owner_true_in_detail(self, client: Client):
        """Owner sees is_owner=True in detail response."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))

        client.login(username="owner@test.de", password="pass")
        resp = client.get(f"/api/meal-plans/{plan.id}/")
        assert resp.status_code == 200
        assert resp.json()["is_owner"] is True

    def test_collaborator_sees_is_owner_false_in_detail(self, client: Client):
        """Collaborator sees is_owner=False in detail response."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="editor")

        client.login(username="collab@test.de", password="pass")
        resp = client.get(f"/api/meal-plans/{plan.id}/")
        assert resp.status_code == 200
        assert resp.json()["is_owner"] is False

    def test_collaborator_sees_is_owner_false_in_list(self, client: Client):
        """Collaborator sees is_owner=False in list response."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab = User.objects.create_user(username="collab", email="collab@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))
        MealPlanCollaborator.objects.create(meal_plan=plan, user=collab, role="viewer")

        client.login(username="collab@test.de", password="pass")
        resp = client.get("/api/meal-plans/")
        assert resp.status_code == 200
        plan_data = next((p for p in resp.json() if p["id"] == plan.id), None)
        assert plan_data is not None
        assert plan_data["is_owner"] is False

    def test_owner_sees_is_owner_true_in_list(self, client: Client):
        """Owner sees is_owner=True in list response."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        plan = MealPlan.objects.create(name="Plan", slug="plan", norm_portions=10, created_by=owner, start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)))

        client.login(username="owner@test.de", password="pass")
        resp = client.get("/api/meal-plans/")
        assert resp.status_code == 200
        plan_data = next((p for p in resp.json() if p["id"] == plan.id), None)
        assert plan_data is not None
        assert plan_data["is_owner"] is True
