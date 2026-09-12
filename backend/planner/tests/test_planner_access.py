"""Authorization tests for planner group reassignment."""

import json

import pytest

from planner.models import PlannerCollaborator
from planner.tests import make_planner
from profiles.models import UserGroup


@pytest.mark.django_db
class TestPlannerGroupReassignment:
    def test_editor_collaborator_cannot_change_group(self, auth_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        planner = make_planner(owner=owner)
        PlannerCollaborator.objects.create(
            planner=planner,
            user=auth_client._user,
            role=PlannerCollaborator.Role.EDITOR,
        )
        group = UserGroup.objects.create(name="Andere Gruppe")

        resp = auth_client.patch(
            f"/api/planner/{planner.id}/",
            data=json.dumps({"group_id": group.id}),
            content_type="application/json",
        )
        assert resp.status_code == 403
        planner.refresh_from_db()
        assert planner.group_id is None

    def test_owner_can_change_group(self, auth_client, django_user_model):
        planner = make_planner(owner=auth_client._user)
        group = UserGroup.objects.create(name="Meine Gruppe")
        resp = auth_client.patch(
            f"/api/planner/{planner.id}/",
            data=json.dumps({"group_id": group.id}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        planner.refresh_from_db()
        assert planner.group_id == group.id
