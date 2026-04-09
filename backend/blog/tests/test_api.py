"""Tests for blog app (Blog API)."""

import json

import pytest
from django.test import Client

from blog.models import Blog
from content.choices import ContentStatus
from content.models import ScoutLevel, Tag


@pytest.fixture
def tag(db):
    return Tag.objects.create(name="Methodik", slug="methodik")


@pytest.fixture
def scout_level(db):
    return ScoutLevel.objects.create(name="Pfadfinder", sorting=1)


@pytest.fixture
def approved_blog(db, tag, scout_level):
    blog = Blog.objects.create(
        title="Wie plane ich eine Gruppenstunde",
        summary="Schritt-fuer-Schritt Anleitung",
        description="Lorem ipsum dolor sit amet " * 100,  # ~500 words → ~3 min reading
        blog_type="guide",
        difficulty="easy",
        status=ContentStatus.APPROVED,
        show_table_of_contents=True,
    )
    blog.tags.add(tag)
    blog.scout_levels.add(scout_level)
    return blog


@pytest.fixture
def draft_blog(db):
    return Blog.objects.create(
        title="Entwurf-Blog",
        summary="Noch nicht fertig",
        blog_type="tutorial",
        status=ContentStatus.DRAFT,
    )


# ---------------------------------------------------------------------------
# List Endpoint
# ---------------------------------------------------------------------------


class TestListBlogs:
    def test_list_returns_approved_only(self, api_client, approved_blog, draft_blog):
        resp = api_client.get("/api/blogs/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == approved_blog.title

    def test_filter_by_blog_type(self, api_client, approved_blog):
        resp = api_client.get("/api/blogs/?blog_type=guide")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        resp = api_client.get("/api/blogs/?blog_type=tutorial")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_search_by_query(self, api_client, approved_blog):
        resp = api_client.get("/api/blogs/?q=Gruppenstunde")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_pagination(self, api_client, approved_blog):
        resp = api_client.get("/api/blogs/?page=1&page_size=10")
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["total_pages"] >= 1


# ---------------------------------------------------------------------------
# Detail Endpoints
# ---------------------------------------------------------------------------


class TestBlogDetail:
    def test_get_by_id(self, api_client, approved_blog):
        resp = api_client.get(f"/api/blogs/{approved_blog.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == approved_blog.title
        assert data["blog_type"] == "guide"
        assert data["reading_time_minutes"] > 0
        assert data["show_table_of_contents"] is True

    def test_get_by_slug(self, api_client, approved_blog):
        resp = api_client.get(f"/api/blogs/by-slug/{approved_blog.slug}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == approved_blog.id

    def test_not_found(self, api_client, db):
        resp = api_client.get("/api/blogs/99999/")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


class TestCreateBlog:
    def test_create_blog(self, auth_client):
        resp = auth_client.post(
            "/api/blogs/",
            data=json.dumps(
                {
                    "title": "Neue Methode",
                    "summary": "Eine tolle Methode",
                    "blog_type": "methodology",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Neue Methode"
        assert data["blog_type"] == "methodology"
        assert data["status"] == "draft"

    def test_create_sets_author(self, auth_client):
        resp = auth_client.post(
            "/api/blogs/",
            data=json.dumps({"title": "Test Author"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        blog = Blog.objects.get(id=resp.json()["id"])
        assert blog.authors.count() == 1

    def test_reading_time_auto_calculated(self, auth_client):
        long_text = "wort " * 600  # 600 words → 3 minutes
        resp = auth_client.post(
            "/api/blogs/",
            data=json.dumps(
                {
                    "title": "Langer Artikel",
                    "description": long_text,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["reading_time_minutes"] == 3


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


class TestUpdateBlog:
    def test_update_as_author(self, auth_client, approved_blog):
        approved_blog.authors.add(auth_client._user)
        resp = auth_client.patch(
            f"/api/blogs/{approved_blog.id}/",
            data=json.dumps({"title": "Updated Title"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    def test_update_denied_for_non_author(self, auth_client, approved_blog):
        resp = auth_client.patch(
            f"/api/blogs/{approved_blog.id}/",
            data=json.dumps({"title": "Hacked"}),
            content_type="application/json",
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


class TestDeleteBlog:
    def test_delete_as_admin(self, admin_client, approved_blog):
        resp = admin_client.delete(f"/api/blogs/{approved_blog.id}/")
        assert resp.status_code == 204
        approved_blog.refresh_from_db()
        assert approved_blog.deleted_at is not None

    def test_delete_denied_for_non_admin(self, auth_client, approved_blog):
        resp = auth_client.delete(f"/api/blogs/{approved_blog.id}/")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


class TestBlogComments:
    def test_create_comment_authenticated(self, auth_client, approved_blog):
        resp = auth_client.post(
            f"/api/blogs/{approved_blog.id}/comments/",
            data=json.dumps({"text": "Toller Artikel!"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["text"] == "Toller Artikel!"
        assert resp.json()["status"] == "approved"

    def test_create_comment_anonymous(self, api_client, approved_blog):
        resp = api_client.post(
            f"/api/blogs/{approved_blog.id}/comments/",
            data=json.dumps({"text": "Anonym!", "author_name": "Gast"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# Emotions
# ---------------------------------------------------------------------------


class TestBlogEmotions:
    def test_toggle_emotion(self, api_client, approved_blog):
        resp = api_client.post(
            f"/api/blogs/{approved_blog.id}/emotions/",
            data=json.dumps({"emotion_type": "happy"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        counts = resp.json()["emotion_counts"]
        assert counts.get("happy", 0) == 1

        # Toggle again removes it
        resp = api_client.post(
            f"/api/blogs/{approved_blog.id}/emotions/",
            data=json.dumps({"emotion_type": "happy"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        counts = resp.json()["emotion_counts"]
        assert counts.get("happy", 0) == 0
