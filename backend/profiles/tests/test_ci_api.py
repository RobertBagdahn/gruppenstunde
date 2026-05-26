"""Tests for Corporate Identity API endpoints."""

import json

import pytest

from profiles.choices import MembershipRoleChoices
from profiles.tests import make_corporate_identity, make_group_membership, make_user_group


@pytest.mark.django_db
class TestGetCorporateIdentity:
    def test_get_ci_returns_defaults_when_none(self, auth_client):
        group = make_user_group(name="No-CI-Gruppe")
        resp = auth_client.get(f"/api/groups/{group.slug}/corporate-identity/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["primary_color"] == "#4a3a6b"
        assert data["secondary_color"] == "#e8e4f0"
        assert data["logo_url"] == ""

    def test_get_ci_returns_configured(self, auth_client):
        group = make_user_group(name="CI-Gruppe")
        make_corporate_identity(group=group, primary_color="#FF0000", slogan="Test Slogan")
        resp = auth_client.get(f"/api/groups/{group.slug}/corporate-identity/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["primary_color"] == "#FF0000"
        assert data["slogan"] == "Test Slogan"

    def test_get_ci_unauthenticated(self, api_client):
        group = make_user_group(name="Auth-Test-Gruppe")
        resp = api_client.get(f"/api/groups/{group.slug}/corporate-identity/")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestUpdateCorporateIdentity:
    def test_put_creates_ci(self, auth_client):
        group = make_user_group(name="PUT-Gruppe")
        make_group_membership(user=auth_client._user, group=group, role=MembershipRoleChoices.ADMIN)
        payload = {
            "primary_color": "#123456",
            "secondary_color": "#654321",
            "slogan": "Neuer Slogan",
        }
        resp = auth_client.put(
            f"/api/groups/{group.slug}/corporate-identity/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["primary_color"] == "#123456"
        assert data["slogan"] == "Neuer Slogan"

    def test_put_updates_existing(self, auth_client):
        group = make_user_group(name="Update-Gruppe")
        make_group_membership(user=auth_client._user, group=group, role=MembershipRoleChoices.ADMIN)
        make_corporate_identity(group=group, slogan="Alt")
        payload = {"slogan": "Neu"}
        resp = auth_client.put(
            f"/api/groups/{group.slug}/corporate-identity/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["slogan"] == "Neu"

    def test_put_forbidden_for_non_admin(self, auth_client):
        group = make_user_group(name="Forbidden-Gruppe")
        make_group_membership(user=auth_client._user, group=group, role=MembershipRoleChoices.MEMBER)
        payload = {"slogan": "Nope"}
        resp = auth_client.put(
            f"/api/groups/{group.slug}/corporate-identity/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_put_invalid_color(self, auth_client):
        group = make_user_group(name="Invalid-Color-Gruppe")
        make_group_membership(user=auth_client._user, group=group, role=MembershipRoleChoices.ADMIN)
        payload = {"primary_color": "not-a-color"}
        resp = auth_client.put(
            f"/api/groups/{group.slug}/corporate-identity/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 422


@pytest.mark.django_db
class TestDeleteLogo:
    def test_delete_logo_no_ci(self, auth_client):
        group = make_user_group(name="No-CI-Logo-Gruppe")
        make_group_membership(user=auth_client._user, group=group, role=MembershipRoleChoices.ADMIN)
        resp = auth_client.delete(f"/api/groups/{group.slug}/corporate-identity/logo/")
        assert resp.status_code == 404
