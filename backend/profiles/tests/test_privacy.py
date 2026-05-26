"""Tests for privacy API endpoints (GDPR data overview, export, account deletion)."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from profiles.models import GroupMembership, UserGroup, UserProfile

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def privacy_user(db) -> User:
    """Create a user with profile data for privacy tests."""
    user = User.objects.create_user(
        username="privacyuser",
        email="privacy@inspi.dev",
        password="testpass123",
        first_name="Max",
        last_name="Muster",
    )
    UserProfile.objects.create(
        user=user,
        scout_name="Adler",
        first_name="Max",
        last_name="Muster",
        gender="male",
        about_me="Test user",
        is_public=True,
    )
    return user


@pytest.fixture
def privacy_client(privacy_user) -> Client:
    """Authenticated client for privacy tests."""
    client = Client()
    client.force_login(privacy_user)
    client._user = privacy_user  # type: ignore[attr-defined]
    return client


@pytest.fixture
def guest_user(db) -> User:
    """Create a guest user without a usable password."""
    user = User.objects.create_user(
        username="guest@inspi.dev",
        email="guest@inspi.dev",
    )
    user.set_unusable_password()
    user.save()
    return user


@pytest.fixture
def guest_client(guest_user) -> Client:
    """Authenticated client for guest user (no password)."""
    client = Client()
    client.force_login(guest_user)
    client._user = guest_user  # type: ignore[attr-defined]
    return client


# ---------------------------------------------------------------------------
# 6.1 Tests: GET /api/auth/privacy/data-overview/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDataOverview:
    def test_authenticated_user_gets_overview(self, privacy_client):
        resp = privacy_client.get("/api/auth/privacy/data-overview/")
        assert resp.status_code == 200
        data = resp.json()
        assert "profile" in data
        assert "groups" in data
        assert "events" in data
        assert "analytics" in data

    def test_unauthenticated_user_rejected(self, api_client):
        resp = api_client.get("/api/auth/privacy/data-overview/")
        assert resp.status_code == 401

    def test_empty_categories_return_zero_count(self, privacy_client):
        resp = privacy_client.get("/api/auth/privacy/data-overview/")
        data = resp.json()
        assert data["events"]["count"] == 0
        assert data["events"]["items"] == []
        assert data["content"]["count"] == 0
        assert data["analytics"]["view_count"] == 0

    def test_profile_data_present(self, privacy_client):
        resp = privacy_client.get("/api/auth/privacy/data-overview/")
        data = resp.json()
        assert data["profile"]["email"] == "privacy@inspi.dev"
        assert data["profile"]["scout_name"] == "Adler"

    def test_groups_data(self, privacy_client, privacy_user):
        group = UserGroup.objects.create(name="Testgruppe")
        GroupMembership.objects.create(user=privacy_user, group=group, role="member")
        resp = privacy_client.get("/api/auth/privacy/data-overview/")
        data = resp.json()
        assert data["groups"]["count"] == 1
        assert data["groups"]["items"][0]["group_name"] == "Testgruppe"


# ---------------------------------------------------------------------------
# 6.2 Tests: POST /api/auth/privacy/data-export/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDataExport:
    def test_export_returns_json_download(self, privacy_client):
        resp = privacy_client.post(
            "/api/auth/privacy/data-export/",
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/json"
        assert "attachment" in resp["Content-Disposition"]
        assert "inspi-datenexport-" in resp["Content-Disposition"]

    def test_export_contains_metadata(self, privacy_client):
        resp = privacy_client.post(
            "/api/auth/privacy/data-export/",
            content_type="application/json",
        )
        data = json.loads(resp.content)
        assert "metadata" in data
        assert data["metadata"]["user_email"] == "privacy@inspi.dev"
        assert data["metadata"]["platform"] == "Inspi (gruppenstunde.de)"
        assert "exported_at" in data["metadata"]

    def test_unauthenticated_export_rejected(self, api_client):
        resp = api_client.post(
            "/api/auth/privacy/data-export/",
            content_type="application/json",
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 6.3 Tests: POST /api/auth/privacy/delete-account/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDeleteAccount:
    def test_correct_password_deletes_account(self, privacy_client, privacy_user):
        resp = privacy_client.post(
            "/api/auth/privacy/delete-account/",
            data=json.dumps({"password": "testpass123", "confirmation": "KONTO LÖSCHEN"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        privacy_user.refresh_from_db()
        assert privacy_user.is_active is False
        assert "deleted-" in privacy_user.email
        assert not privacy_user.has_usable_password()

    def test_wrong_password_rejected(self, privacy_client):
        resp = privacy_client.post(
            "/api/auth/privacy/delete-account/",
            data=json.dumps({"password": "wrongpass", "confirmation": "KONTO LÖSCHEN"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_missing_confirmation_rejected(self, privacy_client):
        resp = privacy_client.post(
            "/api/auth/privacy/delete-account/",
            data=json.dumps({"password": "testpass123", "confirmation": "löschen"}),
            content_type="application/json",
        )
        assert resp.status_code == 422  # Pydantic validation error

    def test_guest_account_no_password_needed(self, guest_client, guest_user):
        resp = guest_client.post(
            "/api/auth/privacy/delete-account/",
            data=json.dumps({"password": None, "confirmation": "KONTO LÖSCHEN"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        guest_user.refresh_from_db()
        assert guest_user.is_active is False

    def test_session_invalidated_after_deletion(self, privacy_client):
        resp = privacy_client.post(
            "/api/auth/privacy/delete-account/",
            data=json.dumps({"password": "testpass123", "confirmation": "KONTO LÖSCHEN"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        # Subsequent request should not be authenticated
        resp2 = privacy_client.get("/api/auth/privacy/data-overview/")
        assert resp2.status_code == 401

    def test_unauthenticated_deletion_rejected(self, api_client):
        resp = api_client.post(
            "/api/auth/privacy/delete-account/",
            data=json.dumps({"password": "x", "confirmation": "KONTO LÖSCHEN"}),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_profile_anonymized_after_deletion(self, privacy_client, privacy_user):
        privacy_client.post(
            "/api/auth/privacy/delete-account/",
            data=json.dumps({"password": "testpass123", "confirmation": "KONTO LÖSCHEN"}),
            content_type="application/json",
        )
        profile = UserProfile.objects.get(user=privacy_user)
        assert profile.scout_name == ""
        assert profile.first_name == ""
        assert profile.about_me == ""
        assert profile.is_public is False
