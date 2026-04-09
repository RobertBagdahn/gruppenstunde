"""
Tests for content API (search, content links, featured content).
"""

import pytest
from datetime import date, timedelta
from django.contrib.contenttypes.models import ContentType
from django.test import Client

from content.choices import ContentStatus
from content.models import ContentLink, FeaturedContent


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def session_ct(db):
    """ContentType for GroupSession."""
    from session.models import GroupSession

    return ContentType.objects.get_for_model(GroupSession)


@pytest.fixture
def blog_ct(db):
    """ContentType for Blog."""
    from blog.models import Blog

    return ContentType.objects.get_for_model(Blog)


@pytest.fixture
def sample_session(db):
    """Create a sample GroupSession."""
    from session.models import GroupSession

    return GroupSession.objects.create(
        title="Nachtwanderung im Wald",
        summary="Eine spannende Nachtwanderung",
        status=ContentStatus.APPROVED,
        session_type="exploration",
    )


@pytest.fixture
def sample_blog(db):
    """Create a sample Blog."""
    from blog.models import Blog

    return Blog.objects.create(
        title="Pfadfinder Grundlagen",
        summary="Ein Einführungsartikel",
        status=ContentStatus.APPROVED,
        blog_type="guide",
    )


@pytest.fixture
def sample_game(db):
    """Create a sample Game."""
    from game.models import Game

    return Game.objects.create(
        title="Capture the Flag",
        summary="Ein klassisches Geländespiel",
        status=ContentStatus.APPROVED,
        game_type="field_game",
    )


@pytest.fixture
def sample_recipe(db):
    """Create a sample Recipe."""
    from recipe.models import Recipe

    return Recipe.objects.create(
        title="Stockbrot am Lagerfeuer",
        summary="Einfaches Stockbrot",
        status=ContentStatus.APPROVED,
        recipe_type="snack",
    )


# ---------------------------------------------------------------------------
# Search Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUnifiedSearch:
    """Tests for /api/content/search/."""

    def test_search_returns_all_types(self, api_client, sample_session, sample_blog, sample_game, sample_recipe):
        """Search without query returns all approved content."""
        resp = api_client.get("/api/content/search/")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "type_counts" in data
        assert data["total"] >= 4

    def test_search_with_query(self, api_client, sample_session, sample_blog):
        """Search with query filters by relevance."""
        resp = api_client.get("/api/content/search/?q=Nachtwanderung")
        assert resp.status_code == 200
        data = resp.json()
        # Should find the session
        titles = [item["title"] for item in data["items"]]
        assert "Nachtwanderung im Wald" in titles

    def test_search_type_filter(self, api_client, sample_session, sample_blog, sample_game):
        """Search with type filter only returns matching types."""
        resp = api_client.get("/api/content/search/?result_types=session")
        assert resp.status_code == 200
        data = resp.json()
        for item in data["items"]:
            assert item["result_type"] == "session"

    def test_search_multiple_type_filters(self, api_client, sample_session, sample_blog, sample_game):
        """Search with multiple type filters."""
        resp = api_client.get("/api/content/search/?result_types=session,blog")
        assert resp.status_code == 200
        data = resp.json()
        result_types = {item["result_type"] for item in data["items"]}
        assert result_types <= {"session", "blog"}

    def test_search_type_counts(self, api_client, sample_session, sample_blog, sample_game, sample_recipe):
        """Search returns type_counts for all types."""
        resp = api_client.get("/api/content/search/")
        data = resp.json()
        assert "type_counts" in data
        counts = data["type_counts"]
        assert counts.get("session", 0) >= 1
        assert counts.get("blog", 0) >= 1
        assert counts.get("game", 0) >= 1
        assert counts.get("recipe", 0) >= 1

    def test_search_pagination(self, api_client, sample_session, sample_blog):
        """Search respects pagination."""
        resp = api_client.get("/api/content/search/?page=1&page_size=1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 1
        assert len(data["items"]) <= 1

    def test_search_sort_newest(self, api_client, sample_session, sample_blog):
        """Search can sort by newest."""
        resp = api_client.get("/api/content/search/?sort=newest")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) >= 1

    def test_search_result_structure(self, api_client, sample_session):
        """Search results have correct structure."""
        resp = api_client.get("/api/content/search/?q=Nachtwanderung")
        data = resp.json()
        if data["items"]:
            item = data["items"][0]
            assert "result_type" in item
            assert "id" in item
            assert "title" in item
            assert "slug" in item
            assert "summary" in item
            assert "url" in item
            assert "score" in item
            assert "extra" in item


@pytest.mark.django_db
class TestAutocomplete:
    """Tests for /api/content/autocomplete/."""

    def test_autocomplete_basic(self, api_client, sample_session, sample_blog):
        """Autocomplete returns results for matching query."""
        resp = api_client.get("/api/content/autocomplete/?q=Nacht")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_autocomplete_short_query(self, api_client):
        """Autocomplete returns empty for short query."""
        resp = api_client.get("/api/content/autocomplete/?q=N")
        assert resp.status_code == 200
        data = resp.json()
        assert data == []

    def test_autocomplete_result_structure(self, api_client, sample_session):
        """Autocomplete results have correct structure."""
        resp = api_client.get("/api/content/autocomplete/?q=Nachtwanderung")
        data = resp.json()
        if data:
            item = data[0]
            assert "result_type" in item
            assert "title" in item
            assert "slug" in item
            assert "url" in item


# ---------------------------------------------------------------------------
# Content Links Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContentLinks:
    """Tests for /api/content/links/."""

    def test_list_links_empty(self, api_client, sample_session, session_ct):
        """List links for object with no links returns empty."""
        resp = api_client.get(f"/api/content/links/?content_type={session_ct.model}&object_id={sample_session.id}")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_link(self, auth_client, sample_session, sample_blog, session_ct, blog_ct):
        """Authenticated user can create a content link."""
        resp = auth_client.post(
            "/api/content/links/",
            data={
                "source_content_type": session_ct.model,
                "source_object_id": sample_session.id,
                "target_content_type": blog_ct.model,
                "target_object_id": sample_blog.id,
            },
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["source_title"] == "Nachtwanderung im Wald"
        assert data["target_title"] == "Pfadfinder Grundlagen"
        assert data["link_type"] == "manual"

    def test_create_link_unauthenticated(self, api_client, sample_session, sample_blog, session_ct, blog_ct):
        """Unauthenticated user cannot create links."""
        resp = api_client.post(
            "/api/content/links/",
            data={
                "source_content_type": session_ct.model,
                "source_object_id": sample_session.id,
                "target_content_type": blog_ct.model,
                "target_object_id": sample_blog.id,
            },
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_duplicate_link(self, auth_client, sample_session, sample_blog, session_ct, blog_ct):
        """Creating duplicate link returns 409."""
        payload = {
            "source_content_type": session_ct.model,
            "source_object_id": sample_session.id,
            "target_content_type": blog_ct.model,
            "target_object_id": sample_blog.id,
        }
        auth_client.post("/api/content/links/", data=payload, content_type="application/json")
        resp = auth_client.post("/api/content/links/", data=payload, content_type="application/json")
        assert resp.status_code == 409

    def test_list_outgoing_links(self, auth_client, sample_session, sample_blog, session_ct, blog_ct):
        """List outgoing links for a content object."""
        ContentLink.objects.create(
            source_content_type=session_ct,
            source_object_id=sample_session.id,
            target_content_type=blog_ct,
            target_object_id=sample_blog.id,
            link_type="manual",
        )
        resp = auth_client.get(
            f"/api/content/links/?content_type={session_ct.model}&object_id={sample_session.id}&direction=outgoing"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["target_title"] == "Pfadfinder Grundlagen"

    def test_reject_link_admin(self, admin_client, sample_session, sample_blog, session_ct, blog_ct):
        """Admin can reject a content link."""
        link = ContentLink.objects.create(
            source_content_type=session_ct,
            source_object_id=sample_session.id,
            target_content_type=blog_ct,
            target_object_id=sample_blog.id,
            link_type="embedding",
        )
        resp = admin_client.post(f"/api/content/links/{link.id}/reject/")
        assert resp.status_code == 200
        link.refresh_from_db()
        assert link.is_rejected is True

    def test_reject_link_non_admin(self, auth_client, sample_session, sample_blog, session_ct, blog_ct):
        """Non-admin cannot reject a content link."""
        link = ContentLink.objects.create(
            source_content_type=session_ct,
            source_object_id=sample_session.id,
            target_content_type=blog_ct,
            target_object_id=sample_blog.id,
        )
        resp = auth_client.post(f"/api/content/links/{link.id}/reject/")
        assert resp.status_code == 403

    def test_delete_link_creator(self, auth_client, sample_session, sample_blog, session_ct, blog_ct):
        """Creator can delete their own link."""
        link = ContentLink.objects.create(
            source_content_type=session_ct,
            source_object_id=sample_session.id,
            target_content_type=blog_ct,
            target_object_id=sample_blog.id,
            link_type="manual",
            created_by=auth_client._user,
        )
        resp = auth_client.delete(f"/api/content/links/{link.id}/")
        assert resp.status_code == 204

    def test_rejected_links_hidden(self, api_client, sample_session, sample_blog, session_ct, blog_ct):
        """Rejected links are not returned in list."""
        ContentLink.objects.create(
            source_content_type=session_ct,
            source_object_id=sample_session.id,
            target_content_type=blog_ct,
            target_object_id=sample_blog.id,
            is_rejected=True,
        )
        resp = api_client.get(f"/api/content/links/?content_type={session_ct.model}&object_id={sample_session.id}")
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# Featured Content Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFeaturedContent:
    """Tests for /api/content/featured/."""

    def test_list_featured_empty(self, api_client):
        """List featured returns empty when none active."""
        resp = api_client.get("/api/content/featured/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_featured_active(self, api_client, sample_session, session_ct):
        """List featured returns currently active items."""
        today = date.today()
        FeaturedContent.objects.create(
            content_type=session_ct,
            object_id=sample_session.id,
            featured_from=today - timedelta(days=1),
            featured_until=today + timedelta(days=6),
            reason="Tolle Idee",
        )
        resp = api_client.get("/api/content/featured/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["content_title"] == "Nachtwanderung im Wald"
        assert data[0]["content_url"].startswith("/sessions/")

    def test_list_featured_expired(self, api_client, sample_session, session_ct):
        """Expired featured items are not returned."""
        today = date.today()
        FeaturedContent.objects.create(
            content_type=session_ct,
            object_id=sample_session.id,
            featured_from=today - timedelta(days=14),
            featured_until=today - timedelta(days=1),
            reason="Vergangen",
        )
        resp = api_client.get("/api/content/featured/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_featured_admin(self, admin_client, sample_blog, blog_ct):
        """Admin can create featured content."""
        today = date.today()
        resp = admin_client.post(
            "/api/content/featured/",
            data={
                "content_type": blog_ct.model,
                "object_id": sample_blog.id,
                "featured_from": today.isoformat(),
                "featured_until": (today + timedelta(days=7)).isoformat(),
                "reason": "Featured Blog",
            },
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content_title"] == "Pfadfinder Grundlagen"

    def test_create_featured_non_admin(self, auth_client, sample_session, session_ct):
        """Non-admin cannot create featured content."""
        today = date.today()
        resp = auth_client.post(
            "/api/content/featured/",
            data={
                "content_type": session_ct.model,
                "object_id": sample_session.id,
                "featured_from": today.isoformat(),
                "featured_until": (today + timedelta(days=7)).isoformat(),
            },
            content_type="application/json",
        )
        assert resp.status_code == 403
