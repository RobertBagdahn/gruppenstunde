"""Tests for ingredient merge API endpoints."""

import pytest
from django.contrib.contenttypes.models import ContentType
from django.test import Client

from content.choices import LinkType
from content.models import ContentLink

BASE = "/api/admin/data-quality"


@pytest.fixture
def ingredient(db):
    from supply.tests import make_ingredient

    return make_ingredient(name="Tomate", slug="tomate")


@pytest.fixture
def target_ingredient(db):
    from supply.tests import make_ingredient

    return make_ingredient(name="Tomaten", slug="tomaten")


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


class TestIngredientMergePreview:
    def test_preview_happy_path(self, admin_client, ingredient, target_ingredient):
        resp = admin_client.get(
            f"{BASE}/ingredients/merge/preview/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["source_id"] == ingredient.id
        assert data["source_name"] == "Tomate"
        assert data["target_id"] == target_ingredient.id
        assert data["target_name"] == "Tomaten"
        assert data["affected_recipe_items"] == 0

    def test_preview_404_on_unknown(self, admin_client, target_ingredient):
        resp = admin_client.get(
            f"{BASE}/ingredients/merge/preview/",
            {"source_id": 99999, "target_id": target_ingredient.id},
        )
        assert resp.status_code == 404

    def test_preview_requires_staff(self, api_client, ingredient, target_ingredient):
        resp = api_client.get(
            f"{BASE}/ingredients/merge/preview/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
        )
        assert resp.status_code == 403


class TestIngredientMerge:
    def test_merge_basic(self, admin_client, ingredient, target_ingredient):
        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    def test_merge_with_recipe_items(self, admin_client, ingredient, target_ingredient):
        from recipe.models import Recipe, RecipeItem
        from supply.models import IngredientAlias, Portion
        from supply.tests import make_measuring_unit, make_portion

        source_portion = make_portion(
            ingredient=ingredient,
            name="1 Stück",
            quantity=1.0,
            weight_g=150.0,
        )
        target_portion = make_portion(
            ingredient=target_ingredient,
            name="100g",
            quantity=100.0,
            weight_g=100.0,
        )

        recipe = Recipe.objects.create(title="Test-Rezept", status="approved")
        RecipeItem.objects.create(
            recipe=recipe,
            portion=source_portion,
            quantity=2.0,
        )

        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["affected_recipe_items"] > 0

        # Verify: source ingredient is soft-deleted
        ingredient.refresh_from_db()
        assert ingredient.is_deleted is True

        # Verify: source portions are re-parented to target (not deleted)
        source_portion.refresh_from_db()
        assert source_portion.ingredient_id == target_ingredient.id
        assert source_portion.deleted_at is None

        # Verify: source name added as alias on target
        alias_exists = IngredientAlias.objects.filter(
            ingredient=target_ingredient,
            name=ingredient.name,
        ).exists()
        assert alias_exists is True

        # Verify: RecipeItem still points to the (now re-parented) portion
        ri = RecipeItem.objects.get(id=RecipeItem.objects.first().id)
        assert ri.portion_id == source_portion.id
        # Gram amount preserved: 2 * 150 = 300g
        assert abs(ri.quantity * source_portion.weight_g - 300.0) < 0.1

    def test_merge_creates_content_link(self, admin_client, ingredient, target_ingredient):
        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 200

        ct = ContentType.objects.get_for_model(type(ingredient))
        link = ContentLink.objects.filter(
            source_content_type=ct,
            source_object_id=ingredient.id,
            target_content_type=ct,
            target_object_id=target_ingredient.id,
            link_type=LinkType.DUPLICATE_MERGED,
        ).first()
        assert link is not None

    def test_merge_400_on_same_id(self, admin_client, ingredient):
        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_merge_404_on_unknown(self, admin_client, target_ingredient):
        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": 99999, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_merge_idempotent(self, admin_client, ingredient, target_ingredient):
        admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_merge_requires_staff(self, api_client, ingredient, target_ingredient):
        resp = api_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_merge_migrates_aliases(self, admin_client, ingredient, target_ingredient):
        from supply.models import IngredientAlias

        alias = IngredientAlias.objects.create(
            ingredient=ingredient,
            name="Paradeiser",
        )

        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 200

        # Both source name and source alias should exist on target
        assert IngredientAlias.objects.filter(
            ingredient=target_ingredient,
            name=ingredient.name,
        ).exists()
        assert IngredientAlias.objects.filter(
            ingredient=target_ingredient,
            name="Paradeiser",
        ).exists()

    def test_merge_duplicate_alias_skipped(self, admin_client, ingredient, target_ingredient):
        from supply.models import IngredientAlias

        # Pre-existing alias on target with same name as source
        IngredientAlias.objects.create(
            ingredient=target_ingredient,
            name="Tomate",
        )

        resp = admin_client.post(
            f"{BASE}/ingredients/merge/",
            {"source_id": ingredient.id, "target_id": target_ingredient.id},
            content_type="application/json",
        )
        assert resp.status_code == 200

        # Alias should exist exactly once
        count = IngredientAlias.objects.filter(
            ingredient=target_ingredient,
            name="Tomate",
        ).count()
        assert count == 1

    def test_delete_endpoint_soft_deletes(self, admin_client):
        from supply.tests import make_ingredient

        ing = make_ingredient(name="Zu löschende Zutat")
        resp = admin_client.delete(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200

        ing.refresh_from_db()
        assert ing.is_deleted is True

    def test_soft_deleted_ingredient_404s(self, admin_client):
        from supply.tests import make_ingredient

        ing = make_ingredient(name="Gelöschte Zutat")
        ing.soft_delete()

        resp = admin_client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 404
