"""Tests for personal recipe API endpoints (fork, my-recipes, visibility)."""

import json

import pytest
from django.test import Client

from recipe.models import Recipe, RecipeItem
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def recipe_with_items(db):
    """An approved system recipe with one RecipeItem (ingredient + portion)."""
    ingredient = make_ingredient(name="Kartoffeln")
    portion = make_portion(ingredient=ingredient, name="500g Kartoffeln", weight_g=500.0)
    recipe = make_recipe(title="Kartoffelsuppe", owner=None)
    make_recipe_item(recipe=recipe, portion=portion, quantity=2.0)
    return recipe


# ===========================================================================
# Fork Recipe — POST /api/recipes/{id}/fork/
# ===========================================================================


@pytest.mark.django_db
class TestForkRecipe:
    def test_fork_creates_copy(self, auth_client, recipe_with_items):
        """Forking creates a new recipe owned by the user with correct fields."""
        resp = auth_client.post(f"/api/recipes/{recipe_with_items.id}/fork/")
        assert resp.status_code == 200

        data = resp.json()
        assert data["title"] == recipe_with_items.title
        assert data["visibility"] == "private"

        # Verify in DB
        fork = Recipe.objects.get(id=data["id"])
        assert fork.owner == auth_client._user
        assert fork.forked_from_id == recipe_with_items.id
        assert fork.visibility == "private"
        assert fork.status == "draft"

        # Verify items were copied
        original_count = RecipeItem.objects.filter(recipe=recipe_with_items).count()
        fork_count = RecipeItem.objects.filter(recipe=fork).count()
        assert fork_count == original_count
        assert fork_count > 0

    def test_fork_requires_auth(self, api_client, recipe_with_items):
        """Anonymous user cannot fork a recipe."""
        resp = api_client.post(f"/api/recipes/{recipe_with_items.id}/fork/")
        assert resp.status_code == 403

    def test_fork_nonexistent_recipe(self, auth_client):
        """Forking a recipe with a non-existent ID returns 404."""
        resp = auth_client.post("/api/recipes/99999/fork/")
        assert resp.status_code == 404


# ===========================================================================
# My Recipes — GET /api/recipes/my-recipes/
# ===========================================================================


@pytest.mark.django_db
class TestMyRecipes:
    def test_list_own_recipes(self, auth_client):
        """User sees their own recipes in my-recipes."""
        user = auth_client._user
        make_recipe(title="Mein Rezept 1", owner=user)
        make_recipe(title="Mein Rezept 2", owner=user)

        resp = auth_client.get("/api/recipes/my-recipes/")
        assert resp.status_code == 200

        data = resp.json()
        assert data["total"] == 2
        titles = {item["title"] for item in data["items"]}
        assert "Mein Rezept 1" in titles
        assert "Mein Rezept 2" in titles

    def test_empty_when_no_owned_recipes(self, auth_client):
        """User with no owned recipes gets empty list."""
        # Create a system recipe (no owner) — should not appear
        make_recipe(title="System Rezept", owner=None)

        resp = auth_client.get("/api/recipes/my-recipes/")
        assert resp.status_code == 200

        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_requires_auth(self, api_client):
        """Anonymous user cannot access my-recipes."""
        resp = api_client.get("/api/recipes/my-recipes/")
        # my-recipes uses HttpError(401) directly, not _require_auth(403)
        assert resp.status_code == 401


# ===========================================================================
# Visibility — PATCH /api/recipes/{id}/visibility/
# ===========================================================================


@pytest.mark.django_db
class TestVisibility:
    def test_owner_can_change_visibility(self, auth_client):
        """Owner can change their recipe's visibility to public."""
        user = auth_client._user
        recipe = make_recipe(title="Privates Rezept", owner=user, visibility="private")

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/visibility/",
            data=json.dumps({"visibility": "public"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

        data = resp.json()
        assert data["visibility"] == "public"

        recipe.refresh_from_db()
        assert recipe.visibility == "public"

    def test_non_owner_cannot_change(self, auth_client, admin_client):
        """A different user cannot change another user's recipe visibility."""
        owner = admin_client._user
        recipe = make_recipe(title="Admins Rezept", owner=owner, visibility="private")

        # auth_client is a different user, not the owner
        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/visibility/",
            data=json.dumps({"visibility": "public"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_requires_auth(self, api_client):
        """Anonymous user cannot change visibility."""
        recipe = make_recipe(title="Irgendein Rezept", owner=None)

        resp = api_client.patch(
            f"/api/recipes/{recipe.id}/visibility/",
            data=json.dumps({"visibility": "public"}),
            content_type="application/json",
        )
        assert resp.status_code == 403
