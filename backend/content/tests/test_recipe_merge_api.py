"""Tests for recipe merge API endpoints (Bug #26)."""

import pytest
from django.contrib.contenttypes.models import ContentType
from django.test import Client

from content.choices import LinkType
from content.models import ContentLink, DuplicateDismissal


@pytest.fixture
def recipe(db):
    from recipe.models import Recipe

    return Recipe.objects.create(
        title="Quell-Rezept",
        summary="Zum Zusammenführen",
        status="approved",
    )


@pytest.fixture
def target_recipe(db):
    from recipe.models import Recipe

    return Recipe.objects.create(
        title="Ziel-Rezept",
        summary="Behält alle Referenzen",
        status="approved",
    )


@pytest.fixture
def admin_client(db, django_user_model) -> Client:
    user = django_user_model.objects.create_superuser(
        username="admin",
        email="admin@inspi.dev",
        password="adminpass123",
    )
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def api_client() -> Client:
    return Client()


BASE = "/api/admin/data-quality"


class TestRecipeMergePreview:
    def test_preview_happy_path(self, admin_client, recipe, target_recipe):
        resp = admin_client.get(
            f"{BASE}/recipes/merge/preview/",
            {"source_id": recipe.id, "target_id": target_recipe.id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["source_id"] == recipe.id
        assert data["source_name"] == "Quell-Rezept"
        assert data["target_id"] == target_recipe.id
        assert data["target_name"] == "Ziel-Rezept"
        assert data["affected_meal_count"] == 0

    def test_preview_404_on_unknown_recipe(self, admin_client, target_recipe):
        resp = admin_client.get(
            f"{BASE}/recipes/merge/preview/",
            {"source_id": 99999, "target_id": target_recipe.id},
        )
        assert resp.status_code == 404

    def test_preview_400_on_same_source_and_target(self, admin_client, recipe):
        resp = admin_client.get(
            f"{BASE}/recipes/merge/preview/",
            {"source_id": recipe.id, "target_id": recipe.id},
        )
        assert resp.status_code == 400

    def test_preview_requires_staff(self, api_client, recipe, target_recipe):
        resp = api_client.get(
            f"{BASE}/recipes/merge/preview/",
            {"source_id": recipe.id, "target_id": target_recipe.id},
        )
        assert resp.status_code == 403


class TestRecipeMerge:
    def test_merge_happy_path(self, admin_client, recipe, target_recipe):
        resp = admin_client.post(
            f"{BASE}/recipes/merge/",
            {"source_id": recipe.id, "target_id": target_recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        recipe.refresh_from_db()
        assert recipe.is_deleted is True

        ct = ContentType.objects.get_for_model(type(recipe))
        link = ContentLink.objects.filter(
            source_content_type=ct,
            source_object_id=recipe.id,
            target_content_type=ct,
            target_object_id=target_recipe.id,
            link_type=LinkType.DUPLICATE_MERGED,
        ).first()
        assert link is not None

    def test_merge_400_on_same_source_and_target(self, admin_client, recipe):
        resp = admin_client.post(
            f"{BASE}/recipes/merge/",
            {"source_id": recipe.id, "target_id": recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_merge_404_on_unknown_recipe(self, admin_client, target_recipe):
        resp = admin_client.post(
            f"{BASE}/recipes/merge/",
            {"source_id": 99999, "target_id": target_recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_merge_duplicate_attempt(self, admin_client, recipe, target_recipe):
        admin_client.post(
            f"{BASE}/recipes/merge/",
            {"source_id": recipe.id, "target_id": target_recipe.id},
            content_type="application/json",
        )
        resp = admin_client.post(
            f"{BASE}/recipes/merge/",
            {"source_id": recipe.id, "target_id": target_recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_merge_requires_staff(self, api_client, recipe, target_recipe):
        resp = api_client.post(
            f"{BASE}/recipes/merge/",
            {"source_id": recipe.id, "target_id": target_recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 403


class TestRecipeDismiss:
    def test_dismiss_happy_path(self, admin_client, recipe, target_recipe):
        resp = admin_client.post(
            f"{BASE}/recipes/duplicates/dismiss/",
            {"recipe_a_id": recipe.id, "recipe_b_id": target_recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        ct = ContentType.objects.get_for_model(type(recipe))
        exists = DuplicateDismissal.objects.filter(
            source_content_type=ct,
            source_object_id=min(recipe.id, target_recipe.id),
            target_content_type=ct,
            target_object_id=max(recipe.id, target_recipe.id),
        ).exists()
        assert exists is True

    def test_undismiss_happy_path(self, admin_client, recipe, target_recipe):
        ct = ContentType.objects.get_for_model(type(recipe))
        a, b = sorted([recipe.id, target_recipe.id])
        DuplicateDismissal.objects.create(
            source_content_type=ct,
            source_object_id=a,
            target_content_type=ct,
            target_object_id=b,
        )

        resp = admin_client.delete(
            f"{BASE}/recipes/duplicates/dismiss/",
            {"recipe_a_id": recipe.id, "recipe_b_id": target_recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        exists = DuplicateDismissal.objects.filter(
            source_content_type=ct,
            source_object_id=a,
            target_content_type=ct,
            target_object_id=b,
        ).exists()
        assert exists is False

    def test_dismiss_requires_staff(self, api_client, recipe, target_recipe):
        resp = api_client.post(
            f"{BASE}/recipes/duplicates/dismiss/",
            {"recipe_a_id": recipe.id, "recipe_b_id": target_recipe.id},
            content_type="application/json",
        )
        assert resp.status_code == 403
