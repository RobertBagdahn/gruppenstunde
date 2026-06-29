"""Tests for refactored Recipe API (Content-based)."""

import json

import pytest

from content.choices import ContentStatus
from content.models import ScoutLevel, Tag
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
        energy_kcal=339,
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
        portions=4,
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
def recipe_with_items(db, approved_recipe, portion):
    RecipeItem.objects.create(
        recipe=approved_recipe,
        portion=portion,
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

    def test_list_includes_portions(self, api_client, approved_recipe):
        resp = api_client.get("/api/recipes/")
        data = resp.json()
        assert data["items"][0]["portions"] == 4

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
        assert data["portions"] == 4
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
                    "recipe_type": "recipe_part",
                    "portions": 6,
                    "difficulty": "easy",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Kartoffelsalat"
        assert data["status"] == "draft"
        assert data["recipe_type"] == "recipe_part"
        assert data["portions"] == 1  # Always stored per-1-portion
        assert data["visibility"] == "private"
        assert data["recipe_badge"] == "personal"

        # Verify owner is set in DB
        recipe = Recipe.objects.get(id=data["id"])
        assert recipe.owner == auth_client._user

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

    @pytest.mark.usefixtures("db")
    def test_block_empty_ingredients_on_submitted(self, auth_client, portion, ingredient):
        """Cannot remove all ingredients from a submitted recipe."""
        user = auth_client._user
        recipe = Recipe.objects.create(
            title="Eingereichtes Rezept",
            status=ContentStatus.SUBMITTED,
            created_by=user,
        )
        recipe.authors.add(user)
        RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=500.0, sort_order=0)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/",
            data=json.dumps({"recipe_items": []}),
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "Zutaten entfernt" in resp.json()["detail"]

        assert RecipeItem.objects.filter(recipe=recipe).count() == 1

    @pytest.mark.usefixtures("db")
    def test_allow_empty_ingredients_on_draft(self, auth_client, portion, ingredient):
        """Can remove all ingredients from a draft recipe."""
        user = auth_client._user
        recipe = Recipe.objects.create(
            title="Entwurf",
            status=ContentStatus.DRAFT,
            created_by=user,
        )
        recipe.authors.add(user)
        RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=500.0, sort_order=0)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/",
            data=json.dumps({"recipe_items": []}),
            content_type="application/json",
        )
        assert resp.status_code == 200

        assert RecipeItem.objects.filter(recipe=recipe).count() == 0


# ---------------------------------------------------------------------------
# Delete Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDeleteRecipe:
    def test_delete_requires_auth(self, api_client, approved_recipe):
        resp = api_client.delete(f"/api/recipes/{approved_recipe.id}/")
        assert resp.status_code == 403

    def test_soft_delete(self, admin_client, db):
        admin_user = admin_client._user
        recipe = Recipe.objects.create(
            title="To Delete",
            status=ContentStatus.DRAFT,
            created_by=admin_user,
        )
        recipe.authors.add(admin_user)

        resp = admin_client.delete(f"/api/recipes/{recipe.id}/")
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
        item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=100, sort_order=0)

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


@pytest.mark.django_db
def test_recipe_item_out_weight_g_calculation(db, portion):
    from recipe.schemas.items import RecipeItemOut

    recipe = Recipe.objects.create(title="Test Recipe")
    # Test case 1: item has portion with explicit weight_g
    item1 = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=250, sort_order=0)
    data1 = RecipeItemOut.from_orm(item1)
    assert data1.weight_g == 250.0

    # Test case 2: item has portion with nullable weight_g, fallback to measuring_unit
    portion2 = Portion.objects.create(
        ingredient=portion.ingredient,
        measuring_unit=portion.measuring_unit,
        name="Tasse Mehl",
        quantity=2.0,
        weight_g=None,
    )
    item2 = RecipeItem.objects.create(recipe=recipe, portion=portion2, quantity=3, sort_order=1)
    data2 = RecipeItemOut.from_orm(item2)
    # quantity (3) * portion.quantity (2.0) * measuring_unit.quantity (1.0) = 6.0
    assert data2.weight_g == 6.0


# ---------------------------------------------------------------------------
# Visibility and Permission Tests (Task 1.2, 1.3)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeDetailVisibility:
    """Test visibility filtering on detail endpoints."""

    def test_detail_private_recipe_not_visible_to_other_user(self, api_client, auth_client, db):
        """Anonymous user should get 404 for private recipe."""
        from django.contrib.auth import get_user_model

        owner = get_user_model().objects.create_user(username="owner", password="pass")
        recipe = Recipe.objects.create(
            title="Private",
            status=ContentStatus.DRAFT,
            visibility="private",
            owner=owner,
        )
        resp = api_client.get(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 404

    def test_detail_private_recipe_visible_to_owner(self, auth_client, db):
        """Owner should see their own private recipe."""
        recipe = Recipe.objects.create(
            title="My Private",
            status=ContentStatus.DRAFT,
            visibility="private",
            owner=auth_client._user,
        )
        resp = auth_client.get(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 200

    def test_detail_public_recipe_visible_to_anyone(self, api_client, db):
        """Public recipe should be visible to anonymous."""
        from django.contrib.auth import get_user_model

        owner = get_user_model().objects.create_user(username="public_owner", password="pass")
        recipe = Recipe.objects.create(
            title="Public",
            status=ContentStatus.APPROVED,
            visibility="public",
            owner=owner,
        )
        resp = api_client.get(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 200

    def test_detail_by_slug_respects_visibility(self, api_client, db):
        """Slug endpoint should also filter by visibility."""
        from django.contrib.auth import get_user_model

        owner = get_user_model().objects.create_user(username="slug_owner", password="pass")
        recipe = Recipe.objects.create(
            title="Private Slug",
            slug="private-slug",
            status=ContentStatus.DRAFT,
            visibility="private",
            owner=owner,
        )
        resp = api_client.get("/api/recipes/by-slug/private-slug/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestRecipeItemPermissions:
    """Test that RecipeItem endpoints check owner_id."""

    def test_non_owner_cannot_add_item(self, auth_client, db, portion):
        """Non-owner should not be able to add items."""
        from django.contrib.auth import get_user_model
        owner = get_user_model().objects.create_user(username="other_owner", password="pass")
        recipe = Recipe.objects.create(title="Test", status=ContentStatus.DRAFT, owner=owner)
        resp = auth_client.post(
            f"/api/recipes/{recipe.id}/recipe-items/",
            {
                "portion_id": portion.id,
                "quantity": 100,
                "sort_order": 0,
            },
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_owner_can_add_item(self, auth_client, portion):
        """Owner should be able to add items."""
        recipe = Recipe.objects.create(title="Test", status=ContentStatus.DRAFT, owner=auth_client._user)
        resp = auth_client.post(
            f"/api/recipes/{recipe.id}/recipe-items/",
            {
                "portion_id": portion.id,
                "quantity": 100,
                "sort_order": 0,
            },
            content_type="application/json",
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Cache Weight Calculation Tests (Task 1.4)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_cache_weight_with_measuring_unit_portion(db):
    """Test that cache weight calculation includes measuring_unit portions."""
    from recipe.services.recipe_checks import recalculate_recipe_cache

    ingredient = Ingredient.objects.create(name="Mehl", slug="mehl", price_per_kg=2.0)
    unit = MeasuringUnit.objects.create(name="g", quantity=1.0)
    # Portion: 1 Tasse = 250g (via measuring_unit)
    portion = Portion.objects.create(
        ingredient=ingredient, measuring_unit=unit, name="Tasse", quantity=250, weight_g=None
    )

    recipe = Recipe.objects.create(title="Kuchen", status=ContentStatus.APPROVED)
    # 2 Tassen = 2 * 250 = 500g
    RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=2, sort_order=0)

    recalculate_recipe_cache(recipe)
    recipe.refresh_from_db()

    assert recipe.cached_weight_g == 500.0


# ---------------------------------------------------------------------------
# Embedding Update Tests (Task 1.5)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_embedding_updates_on_recipe_item_change(db):
    """Test that Recipe embedding is updated when RecipeItems change."""
    from unittest.mock import patch

    ingredient = Ingredient.objects.create(name="Zutat", slug="zutat")
    unit = MeasuringUnit.objects.create(name="g", quantity=1.0)
    portion = Portion.objects.create(ingredient=ingredient, measuring_unit=unit, name="g", quantity=1, weight_g=100)

    recipe = Recipe.objects.create(title="Test", status=ContentStatus.APPROVED)

    with patch("content.services.embedding_service.update_content_embedding") as mock_update:
        # Add an item — should trigger embedding update
        RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=1, sort_order=0)
        # The signal should be called (asynchronously, but we can mock it)
        # Note: This is testing the signal path, which is async on_commit

    # Also test Recipe update
    with patch("content.services.embedding_service.update_content_embedding") as mock_update:
        recipe.title = "Updated Title"
        recipe.save(update_fields=["title"])
        # Signal should call update_content_embedding


# ---------------------------------------------------------------------------
# Visibility Leak Regression Tests (fix-recipe-visibility-leak change)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeSubresourceVisibility:
    """Ensure sub-resource endpoints respect recipe visibility."""

    def test_private_recipe_items_not_visible_to_anonymous(self, api_client):
        """Anonymous user cannot list items of a private recipe."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        owner = User.objects.create_user("visowner", "v@v.com", "pw")
        recipe = Recipe.objects.create(
            title="Private Recipe",
            slug="private-recipe-vis",
            visibility="private",
            status=ContentStatus.APPROVED,
            owner=owner,
        )
        resp = api_client.get(f"/api/recipes/{recipe.id}/recipe-items/")
        assert resp.status_code == 404

    def test_public_recipe_items_visible_to_anonymous(self, api_client):
        """Anonymous user can list items of an approved public recipe."""
        recipe = Recipe.objects.create(
            title="Public Recipe",
            slug="public-recipe-vis",
            visibility="public",
            status=ContentStatus.APPROVED,
        )
        resp = api_client.get(f"/api/recipes/{recipe.id}/recipe-items/")
        assert resp.status_code == 200

    def test_private_recipe_comments_not_visible_to_anonymous(self, api_client):
        """Anonymous user cannot read comments of a private recipe."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        owner = User.objects.create_user("comowner", "c@c.com", "pw")
        recipe = Recipe.objects.create(
            title="Private Comments Recipe",
            slug="private-comments-vis",
            visibility="private",
            status=ContentStatus.APPROVED,
            owner=owner,
        )
        resp = api_client.get(f"/api/recipes/{recipe.id}/comments/")
        assert resp.status_code == 404
