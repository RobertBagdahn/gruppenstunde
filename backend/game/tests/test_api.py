"""Tests for game app (Game API)."""

import json

import pytest
from django.test import Client

from content.choices import ContentStatus
from content.models import ScoutLevel, Tag
from game.models import Game


@pytest.fixture
def tag(db):
    return Tag.objects.create(name="Geländespiel", slug="gelaendespiel")


@pytest.fixture
def scout_level(db):
    return ScoutLevel.objects.create(name="Jungpfadfinder", sorting=1)


@pytest.fixture
def approved_game(db, tag, scout_level):
    game = Game.objects.create(
        title="Capture the Flag",
        summary="Klassisches Geländespiel",
        description="Zwei Teams versuchen die gegnerische Flagge zu erobern.",
        game_type="field_game",
        play_area="outdoor",
        min_players=10,
        max_players=40,
        game_duration_minutes=60,
        rules="## Vorbereitung\n\nSpielfeld abstecken.\n\n## Ablauf\n\nJedes Team verteidigt seine Flagge.",
        difficulty="medium",
        status=ContentStatus.APPROVED,
    )
    game.tags.add(tag)
    game.scout_levels.add(scout_level)
    return game


@pytest.fixture
def draft_game(db):
    return Game.objects.create(
        title="Entwurf-Spiel",
        summary="Noch nicht fertig",
        game_type="group_game",
        status=ContentStatus.DRAFT,
    )


# ---------------------------------------------------------------------------
# List Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListGames:
    def test_list_returns_approved_only(self, client: Client, approved_game, draft_game):
        resp = client.get("/api/games/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Capture the Flag"

    def test_list_pagination(self, client: Client, approved_game):
        resp = client.get("/api/games/?page=1&page_size=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5

    def test_list_filter_game_type(self, client: Client, approved_game):
        resp = client.get("/api/games/?game_type=field_game")
        data = resp.json()
        assert data["total"] == 1

        resp2 = client.get("/api/games/?game_type=icebreaker")
        data2 = resp2.json()
        assert data2["total"] == 0

    def test_list_filter_play_area(self, client: Client, approved_game):
        resp = client.get("/api/games/?play_area=outdoor")
        data = resp.json()
        assert data["total"] == 1

        resp2 = client.get("/api/games/?play_area=indoor")
        data2 = resp2.json()
        assert data2["total"] == 0

    def test_list_search(self, client: Client, approved_game):
        resp = client.get("/api/games/?q=Capture")
        data = resp.json()
        assert data["total"] == 1

    def test_list_sort_newest(self, client: Client, approved_game):
        resp = client.get("/api/games/?sort=newest")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Detail Endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGameDetail:
    def test_get_by_id(self, client: Client, approved_game):
        resp = client.get(f"/api/games/{approved_game.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Capture the Flag"
        assert data["game_type"] == "field_game"
        assert data["play_area"] == "outdoor"
        assert data["min_players"] == 10
        assert data["max_players"] == 40
        assert data["game_duration_minutes"] == 60
        assert "Vorbereitung" in data["rules"]

    def test_get_by_slug(self, client: Client, approved_game):
        resp = client.get(f"/api/games/by-slug/{approved_game.slug}/")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Capture the Flag"

    def test_get_nonexistent(self, client: Client, db):
        resp = client.get("/api/games/99999/")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateGame:
    def test_create_game(self, auth_client: Client):
        resp = auth_client.post(
            "/api/games/",
            data=json.dumps({"title": "Neues Spiel", "game_type": "icebreaker"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Neues Spiel"
        assert data["game_type"] == "icebreaker"

    def test_create_sets_author(self, auth_client: Client):
        resp = auth_client.post(
            "/api/games/",
            data=json.dumps({"title": "Spiel mit Autor"}),
            content_type="application/json",
        )
        data = resp.json()
        assert len(data["authors"]) == 1

    def test_create_with_players(self, auth_client: Client):
        resp = auth_client.post(
            "/api/games/",
            data=json.dumps(
                {
                    "title": "Völkerball",
                    "game_type": "running_game",
                    "play_area": "gym",
                    "min_players": 8,
                    "max_players": 30,
                    "game_duration_minutes": 45,
                    "rules": "Zwei Teams werfen sich ab.",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["min_players"] == 8
        assert data["max_players"] == 30
        assert data["game_duration_minutes"] == 45
        assert data["play_area"] == "gym"


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUpdateGame:
    def test_update_as_author(self, auth_client: Client, db):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.get(email="test@inspi.dev")
        game = Game.objects.create(title="Alt", status=ContentStatus.DRAFT)
        game.authors.add(user)
        resp = auth_client.patch(
            f"/api/games/{game.id}/",
            data=json.dumps({"title": "Neu", "game_type": "cooperation"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Neu"
        assert resp.json()["game_type"] == "cooperation"

    def test_update_forbidden(self, auth_client: Client, approved_game):
        resp = auth_client.patch(
            f"/api/games/{approved_game.id}/",
            data=json.dumps({"title": "Hack"}),
            content_type="application/json",
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDeleteGame:
    def test_delete_as_admin(self, admin_client: Client, approved_game):
        resp = admin_client.delete(f"/api/games/{approved_game.id}/")
        assert resp.status_code == 204
        approved_game.refresh_from_db()
        assert approved_game.deleted_at is not None

    def test_delete_forbidden_for_normal_user(self, auth_client: Client, approved_game):
        resp = auth_client.delete(f"/api/games/{approved_game.id}/")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGameComments:
    def test_create_comment_authenticated(self, auth_client: Client, approved_game):
        resp = auth_client.post(
            f"/api/games/{approved_game.id}/comments/",
            data=json.dumps({"text": "Super Spiel!"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["text"] == "Super Spiel!"

    def test_create_comment_anonymous(self, client: Client, approved_game):
        resp = client.post(
            f"/api/games/{approved_game.id}/comments/",
            data=json.dumps({"text": "Toll!", "author_name": "Max"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["author_name"] == "Max"
        assert resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# Emotions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGameEmotions:
    def test_toggle_emotion(self, client: Client, approved_game):
        resp = client.post(
            f"/api/games/{approved_game.id}/emotions/",
            data=json.dumps({"emotion_type": "happy"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert "emotion_counts" in resp.json()
