"""Tests for Idea API endpoints."""

import pytest
from django.test import Client

from idea.choices import CommentStatus, StatusChoices
from idea.tests import make_comment, make_idea, make_tag


@pytest.mark.django_db
class TestIdeaListAPI:
    def test_list_published_ideas(self, api_client: Client):
        make_idea(title="Nachtwanderung", status=StatusChoices.PUBLISHED)
        make_idea(title="Draft", status=StatusChoices.DRAFT)

        response = api_client.get("/api/ideas/")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Nachtwanderung"

    def test_list_with_search(self, api_client: Client):
        make_idea(title="Nachtwanderung")
        make_idea(title="Lagerfeuer")

        response = api_client.get("/api/ideas/?q=nacht")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Nachtwanderung"

    def test_list_with_difficulty_filter(self, api_client: Client):
        make_idea(title="Einfach", difficulty="easy")
        make_idea(title="Schwer", difficulty="hard")

        response = api_client.get("/api/ideas/?difficulty=easy")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Einfach"

    def test_list_pagination(self, api_client: Client):
        for i in range(25):
            make_idea(title=f"Idee {i}")

        response = api_client.get("/api/ideas/?page=1&page_size=10")
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["total_pages"] == 3

    def test_list_sort_newest(self, api_client: Client):
        make_idea(title="Erste")
        make_idea(title="Zweite")

        response = api_client.get("/api/ideas/?sort=newest")
        data = response.json()
        assert data["items"][0]["title"] == "Zweite"


@pytest.mark.django_db
class TestIdeaDetailAPI:
    def test_get_idea(self, api_client: Client):
        idea = make_idea(title="Testidee")

        response = api_client.get(f"/api/ideas/{idea.id}/")
        assert response.status_code == 200

        data = response.json()
        assert data["title"] == "Testidee"
        assert "materials" in data
        assert "scout_levels" in data
        assert "tags" in data

    def test_get_nonexistent_idea(self, api_client: Client):
        response = api_client.get("/api/ideas/99999/")
        assert response.status_code == 404

    def test_draft_idea_not_accessible(self, api_client: Client):
        idea = make_idea(status=StatusChoices.DRAFT)
        response = api_client.get(f"/api/ideas/{idea.id}/")
        assert response.status_code == 404


@pytest.mark.django_db
class TestCommentsAPI:
    def test_list_comments(self, api_client: Client):
        idea = make_idea()
        make_comment(idea=idea, text="Tolle Idee!")

        response = api_client.get(f"/api/ideas/{idea.id}/comments/")
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["text"] == "Tolle Idee!"

    def test_pending_comments_hidden(self, api_client: Client):
        idea = make_idea()
        make_comment(idea=idea, text="Approved", status=CommentStatus.APPROVED)
        make_comment(idea=idea, text="Pending", status=CommentStatus.PENDING)

        response = api_client.get(f"/api/ideas/{idea.id}/comments/")
        data = response.json()
        assert len(data) == 1

    def test_create_anonymous_comment_pending(self, api_client: Client):
        idea = make_idea()

        response = api_client.post(
            f"/api/ideas/{idea.id}/comments/",
            data={"text": "Anonym!", "author_name": "Gast"},
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"


@pytest.mark.django_db
class TestTagAPI:
    def test_list_tags(self, api_client: Client):
        make_tag(name="Natur", slug="natur")
        make_tag(name="Spiel", slug="spiel")

        response = api_client.get("/api/tags/")
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 2


@pytest.mark.django_db
class TestLookupAPI:
    def test_list_scout_levels(self, api_client: Client):
        from idea.tests import make_scout_level

        make_scout_level(name="Wölflinge")

        response = api_client.get("/api/ideas/scout-levels/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
