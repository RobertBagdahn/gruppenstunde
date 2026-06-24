"""Tests for `is_invited` field in event list API response."""

import pytest
from model_bakery import baker

from event.tests import make_event
from profiles.models import GroupMembership, UserGroup


@pytest.mark.django_db
class TestEventListIsInvited:
    def _find(self, items: list[dict], name: str) -> dict | None:
        for item in items:
            if item.get("name") == name:
                return item
        return None

    def test_is_invited_true_for_direct_invite(self, auth_client):
        user = auth_client._user
        event = make_event(name="Direct Invite", is_public=False)
        event.invited_users.add(user)

        resp = auth_client.get("/api/events/")
        assert resp.status_code == 200
        item = self._find(resp.json()["items"], "Direct Invite")
        assert item is not None
        assert item["is_invited"] is True

    def test_is_invited_true_for_group_invite(self, auth_client):
        user = auth_client._user
        group = baker.make(UserGroup)
        GroupMembership.objects.create(user=user, group=group, is_active=True)
        event = make_event(name="Group Invite", is_public=False)
        event.invited_groups.add(group)

        resp = auth_client.get("/api/events/")
        assert resp.status_code == 200
        item = self._find(resp.json()["items"], "Group Invite")
        assert item is not None
        assert item["is_invited"] is True

    def test_is_invited_false_for_manager_only(self, auth_client):
        """Responsible person without personal invite → is_invited=False."""
        user = auth_client._user
        event = make_event(name="Managed Only", is_public=False)
        event.responsible_persons.add(user)

        resp = auth_client.get("/api/events/")
        assert resp.status_code == 200
        item = self._find(resp.json()["items"], "Managed Only")
        assert item is not None
        assert item["is_invited"] is False

    def test_is_invited_false_for_public_event_without_invite(self, auth_client):
        make_event(name="Public No Invite", is_public=True)

        resp = auth_client.get("/api/events/")
        assert resp.status_code == 200
        item = self._find(resp.json()["items"], "Public No Invite")
        assert item is not None
        assert item["is_invited"] is False

    def test_is_invited_false_for_anonymous(self, api_client):
        make_event(name="Public Anon", is_public=True)

        resp = api_client.get("/api/events/")
        assert resp.status_code == 200
        item = self._find(resp.json()["items"], "Public Anon")
        assert item is not None
        assert item["is_invited"] is False
