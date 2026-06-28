"""Tests for collaborator email notification."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from planner.models import MealPlan, MealPlanCollaborator

User = get_user_model()


@pytest.mark.django_db
class TestCollaboratorNotification:
    def _create_plan(self, owner):
        return MealPlan.objects.create(
            name="Testplan",
            slug="testplan",
            norm_portions=10,
            created_by=owner,
        )

    def test_email_sent_on_add(self, client: Client):
        """Adding a collaborator sends an email notification."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab_user = User.objects.create_user(
            username="collab", email="collab@test.de", password="pass"
        )
        plan = self._create_plan(owner)

        client.login(username="owner@test.de", password="pass")

        with patch("planner.services.notification_service.send_mail") as mock_send:
            mock_send.return_value = 1
            resp = client.post(
                f"/api/meal-plans/{plan.id}/collaborators/",
                {"user_id": collab_user.id, "role": "editor"},
                content_type="application/json",
            )
            assert resp.status_code == 201
            mock_send.assert_called_once()
            args, kwargs = mock_send.call_args
            assert collab_user.email in kwargs["recipient_list"]
            assert "Testplan" in kwargs["subject"]

    def test_email_not_sent_on_role_update(self, client: Client):
        """Updating a collaborator role does NOT send an email."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab_user = User.objects.create_user(
            username="collab", email="collab@test.de", password="pass"
        )
        plan = self._create_plan(owner)
        collab = MealPlanCollaborator.objects.create(
            meal_plan=plan, user=collab_user, role="viewer"
        )

        client.login(username="owner@test.de", password="pass")

        with patch("planner.services.notification_service.send_mail") as mock_send:
            resp = client.patch(
                f"/api/meal-plans/{plan.id}/collaborators/{collab.id}/",
                {"role": "editor"},
                content_type="application/json",
            )
            assert resp.status_code == 200
            mock_send.assert_not_called()

    def test_graceful_failure_on_email_error(self, client: Client):
        """If email sending fails, the API still returns success."""
        owner = User.objects.create_user(username="owner", email="owner@test.de", password="pass")
        collab_user = User.objects.create_user(
            username="collab", email="collab@test.de", password="pass"
        )
        plan = self._create_plan(owner)

        client.login(username="owner@test.de", password="pass")

        with patch("planner.services.notification_service.send_mail") as mock_send:
            mock_send.side_effect = Exception("SMTP failure")
            resp = client.post(
                f"/api/meal-plans/{plan.id}/collaborators/",
                {"user_id": collab_user.id, "role": "viewer"},
                content_type="application/json",
            )
            # API should still succeed despite email failure
            assert resp.status_code == 201
            # Collaborator should still be created
            assert MealPlanCollaborator.objects.filter(
                meal_plan=plan, user=collab_user
            ).exists()
