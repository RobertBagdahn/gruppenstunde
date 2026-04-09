"""Tests for refactored Recipe API (Content-based)."""

import json

import pytest
from django.test import Client

from content.choices import ContentStatus
from content.models import ContentComment, ContentEmotion, ScoutLevel, Tag
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, MeasuringUnit, NutritionalTag, Portion


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tag(db):
    return Tag.objects.create(name="Kochen", slug="kochen")


@pytest.fixture
def scout_level(db):
    return ScoutLevel.objects.create(name="Pfadfinder", sorting=2)


@pytest.fixture
def nutritional_tag(db):
    return NutritionalTag.objects.create(
        name="Vegetarisch",
        name_opposite="Nicht vegetarisch",
        description="Ohne Fleisch",
        rank=1,
        is_dangerous=False,
    )


@pytest.fixture
def ingredient(db):
    return Ingredient.objects.create(
        name="Mehl",
        slug="mehl",
        status="approved",
        energy_kj=1418,
        protein_g=10.3,
        fat_g=1.0,
        fat_sat_g=0.2,
        carbohydrate_g=71.0,
        sugar_g=0.5,
        fibre_g=2.8,
        salt_g=0.01,
    )


@pytest.fixture
def measuring_unit(db):
    return MeasuringUnit.objects.create(
        name="Gramm",
        unit="g",
        quantity=1.0,
    )


@pytest.fixture
def portion(db, ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name="Gramm Mehl",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def approved_recipe(db, tag, scout_level, nutritional_tag):
    recipe = Recipe.objects.create(
        title="Pfannkuchen",
        summary="Einfache Pfannkuchen",
        description="## Zubereitung\n1. Mehl verrühren\n2. Backen",
        recipe_type="warm_meal",
        servings=4,
        difficulty="easy",
        status=ContentStatus.APPROVED,
    )
    recipe.tags.add(tag)
    recipe.scout_levels.add(scout_level)
    recipe.nutritional_tags.add(nutritional_tag)
    return recipe


@pytest.fixture
def draft_recipe(db):
    return Recipe.objects.create(
        title="Entwurf-Rezept",
        summary="Noch nicht fertig",
        recipe_type="snack",
        status=ContentStatus.DRAFT,
    )


@pytest.fixture
def recipe_with_items(db, approved_recipe, portion, ingredient, measuring_unit):
    RecipeItem.objects.create(
        recipe=approved_recipe,
        portion=portion,
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        quantity=500.0,
        sort_order=0,
        note="fein gemahlen",
    )
    return approved_recipe


# ---------------------------------------------------------------------------
# List Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListRecipes:
    def test_list_returns_approved_only(self, api_client, approved_recipe, draft_recipe):
        resp = api_client.get("/api/recipes/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Pfannkuchen"

    def test_list_includes_recipe_type(self, api_client, approved_recipe):
        resp = api_client.get("/api/recipes/")
        data = resp.json()
        assert data["items"][0]["recipe_type"] == "warm_meal"

    def test_list_includes_servings(self, api_client, approved_recipe):
        resp = api_client.get("/api/recipes/")
        data = resp.json()
        assert data["items"][0]["servings"] == 4

    def test_list_filter_by_recipe_type(self, api_client, approved_recipe):
        resp = api_client.get("/api/recipes/?recipe_type=warm_meal")
        data = resp.json()
        assert data["total"] == 1

        resp = api_client.get("/api/recipes/?recipe_type=dessert")
        data = resp.json()
        assert data["total"] == 0

    def test_list_filter_by_difficulty(self, api_client, approved_recipe):
        resp = api_client.get("/api/recipes/?difficulty=easy")
        assert resp.json()["total"] == 1

        resp = api_client.get("/api/recipes/?difficulty=hard")
        assert resp.json()["total"] == 0

    def test_list_pagination(self, api_client, approved_recipe):
        resp = api_client.get("/api/recipes/?page=1&page_size=10")
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["total_pages"] >= 1

    def test_admin_sees_all(self, admin_client, approved_recipe, draft_recipe):
        resp = admin_client.get("/api/recipes/")
        data = resp.json()
        assert data["total"] == 2


# ---------------------------------------------------------------------------
# Detail Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeDetail:
    def test_get_by_id(self, api_client, approved_recipe):
        resp = api_client.get(f"/api/recipes/{approved_recipe.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Pfannkuchen"
        assert data["recipe_type"] == "warm_meal"
        assert data["servings"] == 4
        assert data["status"] == "approved"

    def test_get_by_slug(self, api_client, approved_recipe):
        resp = api_client.get(f"/api/recipes/by-slug/{approved_recipe.slug}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Pfannkuchen"

    def test_detail_includes_tags(self, api_client, approved_recipe):
        resp = api_client.get(f"/api/recipes/{approved_recipe.id}/")
        data = resp.json()
        assert len(data["tags"]) == 1
        assert data["tags"][0]["name"] == "Kochen"

    def test_detail_includes_nutritional_tags(self, api_client, approved_recipe):
        resp = api_client.get(f"/api/recipes/{approved_recipe.id}/")
        data = resp.json()
        assert len(data["nutritional_tags"]) == 1
        assert data["nutritional_tags"][0]["name"] == "Vegetarisch"

    def test_detail_includes_recipe_items(self, api_client, recipe_with_items):
        resp = api_client.get(f"/api/recipes/{recipe_with_items.id}/")
        data = resp.json()
        assert len(data["recipe_items"]) == 1
        assert data["recipe_items"][0]["quantity"] == 500.0
        assert data["recipe_items"][0]["note"] == "fein gemahlen"

    def test_detail_includes_emotion_counts(self, api_client, approved_recipe):
        resp = api_client.get(f"/api/recipes/{approved_recipe.id}/")
        data = resp.json()
        assert "emotion_counts" in data
        assert "user_emotion" in data

    def test_detail_includes_can_edit(self, api_client, approved_recipe):
        resp = api_client.get(f"/api/recipes/{approved_recipe.id}/")
        data = resp.json()
        assert data["can_edit"] is False

    def test_404_for_nonexistent(self, api_client):
        resp = api_client.get("/api/recipes/99999/")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Create Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateRecipe:
    def test_create_requires_auth(self, api_client):
        resp = api_client.post(
            "/api/recipes/",
            data=json.dumps({"title": "Test"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_recipe(self, auth_client):
        resp = auth_client.post(
            "/api/recipes/",
            data=json.dumps(
                {
                    "title": "Kartoffelsalat",
                    "summary": "Klassischer Kartoffelsalat",
                    "recipe_type": "side_dish",
                    "servings": 6,
                    "difficulty": "easy",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Kartoffelsalat"
        assert data["status"] == "draft"
        assert data["recipe_type"] == "side_dish"
        assert data["servings"] == 6

    def test_create_generates_slug(self, auth_client):
        resp = auth_client.post(
            "/api/recipes/",
            data=json.dumps({"title": "Mein Rezept"}),
            content_type="application/json",
        )
        data = resp.json()
        assert data["slug"] == "mein-rezept"

    def test_create_with_recipe_items(self, auth_client, portion, ingredient):
        resp = auth_client.post(
            "/api/recipes/",
            data=json.dumps(
                {
                    "title": "Brot",
                    "recipe_items": [
                        {
                            "portion_id": portion.id,
                            "ingredient_id": ingredient.id,
                            "quantity": 500,
                            "sort_order": 0,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["recipe_items"]) == 1

    def test_honeypot_protection(self, auth_client):
        resp = auth_client.post(
            "/api/recipes/",
            data=json.dumps({"title": "Spam", "website": "http://spam.com"}),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Update Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUpdateRecipe:
    def test_update_requires_auth(self, api_client, approved_recipe):
        resp = api_client.patch(
            f"/api/recipes/{approved_recipe.id}/",
            data=json.dumps({"title": "Updated"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_owner_can_update(self, auth_client, db):
        user = auth_client._user
        recipe = Recipe.objects.create(
            title="Original",
            status=ContentStatus.DRAFT,
            created_by=user,
        )
        recipe.authors.add(user)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/",
            data=json.dumps({"title": "Updated", "recipe_type": "dessert"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Updated"
        assert data["recipe_type"] == "dessert"

    def test_admin_can_update_any(self, admin_client, approved_recipe):
        resp = admin_client.patch(
            f"/api/recipes/{approved_recipe.id}/",
            data=json.dumps({"title": "Admin Updated"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Admin Updated"


# ---------------------------------------------------------------------------
# Delete Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDeleteRecipe:
    def test_delete_requires_auth(self, api_client, approved_recipe):
        resp = api_client.delete(f"/api/recipes/{approved_recipe.id}/")
        assert resp.status_code == 403

    def test_soft_delete(self, auth_client, db):
        user = auth_client._user
        recipe = Recipe.objects.create(
            title="To Delete",
            status=ContentStatus.DRAFT,
            created_by=user,
        )
        recipe.authors.add(user)

        resp = auth_client.delete(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 200

        # Should be soft-deleted (not visible via default manager)
        assert Recipe.objects.filter(id=recipe.id).count() == 0
        # But still exists in all_objects
        assert Recipe.all_objects.filter(id=recipe.id).count() == 1
        assert Recipe.all_objects.get(id=recipe.id).is_deleted


# ---------------------------------------------------------------------------
# Comments (generic ContentComment)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeComments:
    def test_list_comments(self, api_client, approved_recipe):
        resp = api_client.get(f"/api/recipes/{approved_recipe.id}/comments/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_comment_authed(self, auth_client, approved_recipe):
        resp = auth_client.post(
            f"/api/recipes/{approved_recipe.id}/comments/",
            data=json.dumps({"text": "Sehr lecker!"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["text"] == "Sehr lecker!"
        assert data["status"] == "approved"

    def test_create_comment_anon_pending(self, api_client, approved_recipe):
        resp = api_client.post(
            f"/api/recipes/{approved_recipe.id}/comments/",
            data=json.dumps({"text": "Anon Kommentar", "author_name": "Gast"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending"


# ---------------------------------------------------------------------------
# Emotions (generic ContentEmotion)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeEmotions:
    def test_toggle_emotion(self, auth_client, approved_recipe):
        resp = auth_client.post(
            f"/api/recipes/{approved_recipe.id}/emotions/",
            data=json.dumps({"emotion_type": "in_love"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("in_love", 0) == 1

    def test_toggle_removes_same_emotion(self, auth_client, approved_recipe):
        # Set
        auth_client.post(
            f"/api/recipes/{approved_recipe.id}/emotions/",
            data=json.dumps({"emotion_type": "happy"}),
            content_type="application/json",
        )
        # Toggle off
        resp = auth_client.post(
            f"/api/recipes/{approved_recipe.id}/emotions/",
            data=json.dumps({"emotion_type": "happy"}),
            content_type="application/json",
        )
        data = resp.json()
        assert data.get("happy", 0) == 0


# ---------------------------------------------------------------------------
# Recipe Items CRUD
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeItems:
    def test_list_items(self, api_client, recipe_with_items):
        resp = api_client.get(f"/api/recipes/{recipe_with_items.id}/recipe-items/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    def test_create_item(self, auth_client, db, portion):
        user = auth_client._user
        recipe = Recipe.objects.create(title="Test", status=ContentStatus.DRAFT, created_by=user)
        recipe.authors.add(user)

        resp = auth_client.post(
            f"/api/recipes/{recipe.id}/recipe-items/",
            data=json.dumps(
                {
                    "portion_id": portion.id,
                    "quantity": 200,
                    "sort_order": 0,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["quantity"] == 200

    def test_delete_item(self, auth_client, db, portion):
        user = auth_client._user
        recipe = Recipe.objects.create(title="Test", status=ContentStatus.DRAFT, created_by=user)
        recipe.authors.add(user)
        item = RecipeItem.objects.create(recipe=recipe, quantity=100, sort_order=0)

        resp = auth_client.delete(f"/api/recipes/{recipe.id}/recipe-items/{item.id}/")
        assert resp.status_code == 200
        assert RecipeItem.objects.filter(id=item.id).count() == 0


# ---------------------------------------------------------------------------
# Image Upload
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeImageUpload:
    def test_upload_requires_auth(self, api_client, approved_recipe):
        resp = api_client.post(f"/api/recipes/{approved_recipe.id}/image/")
        assert resp.status_code == 403
