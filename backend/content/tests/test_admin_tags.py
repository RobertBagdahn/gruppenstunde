"""
Tests for Admin Tag CRUD and Detail endpoints.

Covers:
- GET /api/admin/tags/ — list (staff-only, paginated)
- POST /api/admin/tags/ — create
- PATCH /api/admin/tags/{id}/ — update
- DELETE /api/admin/tags/{id}/ — delete
- GET /api/admin/tags/{id}/detail/ — detail with linked recipes/ingredients
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from model_bakery import baker

User = get_user_model()


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="staff",
        email="staff@test.de",
        password="testpass",
        is_staff=True,
    )


@pytest.fixture
def normal_user(db):
    return User.objects.create_user(
        username="normal",
        email="normal@test.de",
        password="testpass",
    )


@pytest.fixture
def tag(db):
    return baker.make("content.Tag", name="Test Tag", slug="test-tag", description="A test tag")


@pytest.mark.django_db
class TestAdminTagsCRUD:

    def test_list_admin_tags_staff(self, staff_user, tag, client):
        client.force_login(staff_user)
        resp = client.get("/api/admin/tags/")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] >= 1

    def test_list_admin_tags_requires_staff(self, normal_user, client):
        client.force_login(normal_user)
        resp = client.get("/api/admin/tags/")
        assert resp.status_code == 403

    def test_list_admin_tags_requires_auth(self, client):
        resp = client.get("/api/admin/tags/")
        assert resp.status_code == 403

    def test_create_tag(self, staff_user, client):
        client.force_login(staff_user)
        resp = client.post(
            "/api/admin/tags/",
            data={"name": "Neuer Tag", "description": "Beschreibung", "group": "custom", "icon": "star"},
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Neuer Tag"
        assert data["slug"] == "neuer-tag"
        assert data["description"] == "Beschreibung"

    def test_create_tag_unauthorized(self, normal_user, client):
        client.force_login(normal_user)
        resp = client.post(
            "/api/admin/tags/",
            data={"name": "Test"},
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_update_tag(self, staff_user, tag, client):
        client.force_login(staff_user)
        resp = client.patch(
            f"/api/admin/tags/{tag.id}/",
            data={"name": "Updated Name"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    def test_update_tag_not_found(self, staff_user, client):
        client.force_login(staff_user)
        fake_id = uuid.uuid4()
        resp = client.patch(
            f"/api/admin/tags/{fake_id}/",
            data={"name": "Test"},
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_delete_tag(self, staff_user, tag, client):
        client.force_login(staff_user)
        resp = client.delete(f"/api/admin/tags/{tag.id}/")
        assert resp.status_code == 204

    def test_delete_tag_not_found(self, staff_user, client):
        client.force_login(staff_user)
        fake_id = uuid.uuid4()
        resp = client.delete(f"/api/admin/tags/{fake_id}/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestAdminTagDetail:

    def test_tag_detail(self, staff_user, tag, client):
        client.force_login(staff_user)
        resp = client.get(f"/api/admin/tags/{tag.id}/detail/")
        assert resp.status_code == 200
        data = resp.json()
        assert "tag" in data
        assert "recipes" in data
        assert "ingredients" in data
        assert data["tag"]["name"] == "Test Tag"

    def test_tag_detail_not_found(self, staff_user, client):
        client.force_login(staff_user)
        fake_id = uuid.uuid4()
        resp = client.get(f"/api/admin/tags/{fake_id}/detail/")
        assert resp.status_code == 404

    def test_tag_detail_with_linked_recipe(self, staff_user, tag, client):
        recipe = baker.make("recipe.Recipe", title="Test Rezept", slug="test-rezept")
        recipe.tags.add(tag)
        client.force_login(staff_user)
        resp = client.get(f"/api/admin/tags/{tag.id}/detail/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["recipes"]) == 1
        assert data["recipes"][0]["title"] == "Test Rezept"

    def test_tag_detail_requires_staff(self, normal_user, tag, client):
        client.force_login(normal_user)
        resp = client.get(f"/api/admin/tags/{tag.id}/detail/")
        assert resp.status_code == 403
