"""Tests for session app (GroupSession API)."""

import json

import pytest
from django.test import Client

from content.choices import ContentStatus
from content.models import ScoutLevel, Tag
from session.models import GroupSession
from supply.models import Material


@pytest.fixture
def tag(db):
    return Tag.objects.create(name="Outdoor", slug="outdoor")


@pytest.fixture
def scout_level(db):
    return ScoutLevel.objects.create(name="Wölflinge", sorting=1)


@pytest.fixture
def material(db):
    return Material.objects.create(name="Schere", material_category="tools")


@pytest.fixture
def approved_session(db, tag, scout_level):
    session = GroupSession.objects.create(
        title="Knoten lernen",
        summary="Grundknoten für Pfadfinder",
        description="Palstek, Kreuzknoten, Mastwurf...",
        session_type="scout_skills",
        location_type="outdoor",
        difficulty="easy",
        status=ContentStatus.APPROVED,
        min_participants=4,
        max_participants=20,
    )
    session.tags.add(tag)
    session.scout_levels.add(scout_level)
    return session


@pytest.fixture
def draft_session(db):
    return GroupSession.objects.create(
        title="Entwurf-Session",
        summary="Noch nicht fertig",
        session_type="crafts",
        status=ContentStatus.DRAFT,
    )


# ---------------------------------------------------------------------------
# List Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListSessions:
    def test_list_returns_approved_only(self, api_client, approved_session, draft_session):
        resp = api_client.get("/api/sessions/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Knoten lernen"

    def test_list_with_session_type_filter(self, api_client, approved_session):
        resp = api_client.get("/api/sessions/?session_type=scout_skills")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        resp = api_client.get("/api/sessions/?session_type=crafts")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_list_with_search(self, api_client, approved_session):
        resp = api_client.get("/api/sessions/?q=Knoten")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        resp = api_client.get("/api/sessions/?q=nichtvorhanden")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_list_pagination(self, api_client, db):
        for i in range(25):
            GroupSession.objects.create(
                title=f"Session {i}",
                status=ContentStatus.APPROVED,
            )
        resp = api_client.get("/api/sessions/?page=1&page_size=10")
        data = resp.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["total_pages"] == 3


# ---------------------------------------------------------------------------
# Detail Endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDetailSession:
    def test_get_by_id(self, api_client, approved_session):
        resp = api_client.get(f"/api/sessions/{approved_session.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Knoten lernen"
        assert data["session_type"] == "scout_skills"
        assert data["location_type"] == "outdoor"
        assert len(data["tags"]) == 1
        assert len(data["scout_levels"]) == 1

    def test_get_by_slug(self, api_client, approved_session):
        resp = api_client.get(f"/api/sessions/by-slug/{approved_session.slug}/")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Knoten lernen"

    def test_get_nonexistent_returns_404(self, api_client, db):
        resp = api_client.get("/api/sessions/99999/")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Create Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateSession:
    def test_create_session(self, auth_client, tag, scout_level):
        resp = auth_client.post(
            "/api/sessions/",
            data=json.dumps(
                {
                    "title": "Neue Gruppenstunde",
                    "summary": "Zusammenfassung",
                    "session_type": "nature_study",
                    "location_type": "outdoor",
                    "tag_ids": [tag.id],
                    "scout_level_ids": [scout_level.id],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Neue Gruppenstunde"
        assert data["session_type"] == "nature_study"
        assert data["status"] == "draft"
        assert data["slug"] == "neue-gruppenstunde"

    def test_create_sets_author(self, auth_client):
        resp = auth_client.post(
            "/api/sessions/",
            data=json.dumps({"title": "Test"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        session = GroupSession.objects.get(id=resp.json()["id"])
        assert session.authors.count() == 1
        assert session.created_by == auth_client._user


# ---------------------------------------------------------------------------
# Update Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUpdateSession:
    def test_update_as_author(self, auth_client):
        session = GroupSession.objects.create(title="Alt", status=ContentStatus.DRAFT)
        session.authors.add(auth_client._user)

        resp = auth_client.patch(
            f"/api/sessions/{session.id}/",
            data=json.dumps({"title": "Neu", "session_type": "crafts"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Neu"
        assert resp.json()["session_type"] == "crafts"

    def test_update_unauthorized(self, api_client, approved_session):
        resp = api_client.patch(
            f"/api/sessions/{approved_session.id}/",
            data=json.dumps({"title": "Hack"}),
            content_type="application/json",
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Delete Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDeleteSession:
    def test_delete_as_admin(self, admin_client, approved_session):
        resp = admin_client.delete(f"/api/sessions/{approved_session.id}/")
        assert resp.status_code == 204
        assert GroupSession.objects.count() == 0
        assert GroupSession.all_objects.count() == 1  # soft deleted

    def test_delete_as_non_admin(self, auth_client, approved_session):
        resp = auth_client.delete(f"/api/sessions/{approved_session.id}/")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSessionComments:
    def test_create_comment_authenticated(self, auth_client, approved_session):
        resp = auth_client.post(
            f"/api/sessions/{approved_session.id}/comments/",
            data=json.dumps({"text": "Super Idee!"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["text"] == "Super Idee!"
        assert data["status"] == "approved"  # auto-approved for auth users

    def test_create_comment_anonymous(self, api_client, approved_session):
        resp = api_client.post(
            f"/api/sessions/{approved_session.id}/comments/",
            data=json.dumps({"text": "Anonym", "author_name": "Scout"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "pending"  # needs moderation


# ---------------------------------------------------------------------------
# Emotions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSessionEmotions:
    def test_toggle_emotion(self, auth_client, approved_session):
        resp = auth_client.post(
            f"/api/sessions/{approved_session.id}/emotions/",
            data=json.dumps({"emotion_type": "in_love"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["emotion_counts"]["in_love"] == 1

        # Toggle same emotion removes it
        resp = auth_client.post(
            f"/api/sessions/{approved_session.id}/emotions/",
            data=json.dumps({"emotion_type": "in_love"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["emotion_counts"].get("in_love", 0) == 0


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSessionMaterials:
    def test_add_and_list_materials(self, auth_client, material):
        session = GroupSession.objects.create(title="Test", status=ContentStatus.DRAFT)
        session.authors.add(auth_client._user)

        # Add material
        resp = auth_client.post(
            f"/api/sessions/{session.id}/materials/",
            data=json.dumps({"material_id": material.id, "quantity": "2", "quantity_type": "per_person"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["material_name"] == "Schere"

        # List materials
        resp = auth_client.get(f"/api/sessions/{session.id}/materials/")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_remove_material(self, auth_client, material):
        session = GroupSession.objects.create(title="Test", status=ContentStatus.DRAFT)
        session.authors.add(auth_client._user)

        # Add then remove
        resp = auth_client.post(
            f"/api/sessions/{session.id}/materials/",
            data=json.dumps({"material_id": material.id}),
            content_type="application/json",
        )
        item_id = resp.json()["id"]

        resp = auth_client.delete(f"/api/sessions/{session.id}/materials/{item_id}/")
        assert resp.status_code == 204
