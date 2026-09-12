"""Tests for the public food profile endpoint (by-slug)."""

import pytest

from content.choices import ContentStatus
from planner.models import MealPlanVisibility
from planner.tests import make_meal_plan
from profiles.tests import make_user_profile
from recipe.models import RecipeVisibility
from recipe.tests import make_recipe
from shopping.tests import make_shopping_list


@pytest.mark.django_db
class TestPublicFoodProfileBySlug:
    def test_by_slug_returns_200_with_sections(self, api_client):
        profile = make_user_profile(slug="peter", is_public=True)
        user = profile.user
        recipe = make_recipe(
            owner=user,
            visibility=RecipeVisibility.PUBLIC,
            status=ContentStatus.APPROVED,
        )
        resp = api_client.get("/api/profile/by-slug/peter/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["slug"] == "peter"
        assert body["scout_name"] == "Adler"
        assert len(body["recipes"]) == 1
        assert body["recipes"][0]["title"] == "Pfannkuchen"
        assert isinstance(body["shopping_lists"], list)
        assert isinstance(body["meal_plans"], list)

    def test_by_id_fallback_returns_200(self, api_client):
        profile = make_user_profile(slug=None, is_public=True)
        user_id = profile.user_id
        resp = api_client.get(f"/api/profile/by-slug/{user_id}/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == user_id

    def test_private_profile_returns_404_for_others(self, api_client):
        make_user_profile(slug="private-user", is_public=False)
        resp = api_client.get("/api/profile/by-slug/private-user/")
        assert resp.status_code == 404

    def test_private_profile_returns_200_for_owner(self, auth_client):
        user = auth_client._user
        profile = make_user_profile(user=user, slug="me", is_public=False)
        resp = auth_client.get("/api/profile/by-slug/me/")
        assert resp.status_code == 200

    def test_nonexistent_slug_returns_404(self, api_client):
        resp = api_client.get("/api/profile/by-slug/does-not-exist/")
        assert resp.status_code == 404

    def test_private_recipes_excluded(self, api_client):
        profile = make_user_profile(slug="chef", is_public=True)
        make_recipe(
            owner=profile.user,
            visibility=RecipeVisibility.PRIVATE,
            status=ContentStatus.APPROVED,
        )
        make_recipe(
            owner=profile.user,
            visibility=RecipeVisibility.PUBLIC,
            status=ContentStatus.APPROVED,
        )
        resp = api_client.get("/api/profile/by-slug/chef/")
        assert resp.status_code == 200
        assert len(resp.json()["recipes"]) == 1

    def test_private_shopping_lists_excluded(self, api_client):
        profile = make_user_profile(slug="shopper", is_public=True)
        make_shopping_list(owner=profile.user)
        resp = api_client.get("/api/profile/by-slug/shopper/")
        assert resp.status_code == 200
        assert resp.json()["shopping_lists"] == []

    def test_private_meal_plans_excluded(self, api_client):
        profile = make_user_profile(slug="planner", is_public=True)
        make_meal_plan(created_by=profile.user, visibility=MealPlanVisibility.PRIVATE)
        resp = api_client.get("/api/profile/by-slug/planner/")
        assert resp.status_code == 200
        assert resp.json()["meal_plans"] == []

    def test_public_meal_plans_included(self, api_client):
        profile = make_user_profile(slug="public-planner", is_public=True)
        make_meal_plan(created_by=profile.user, visibility=MealPlanVisibility.PUBLIC)
        resp = api_client.get("/api/profile/by-slug/public-planner/")
        assert resp.status_code == 200
        assert len(resp.json()["meal_plans"]) == 1

    def test_own_profile_includes_private_shopping_lists(self, auth_client):
        user = auth_client._user
        make_user_profile(user=user, slug="me", is_public=True)
        make_shopping_list(owner=user)
        resp = auth_client.get("/api/profile/by-slug/me/")
        assert resp.status_code == 200
        assert len(resp.json()["shopping_lists"]) == 1


@pytest.mark.django_db
class TestSlugUpdate:
    def test_set_slug(self, auth_client):
        resp = auth_client.patch(
            "/api/profile/me/",
            {"slug": "max-mustermann"},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["slug"] == "max-mustermann"

    def test_duplicate_slug_returns_422(self, auth_client, django_user_model):
        make_user_profile(slug="existing", is_public=True)
        resp = auth_client.patch(
            "/api/profile/me/",
            {"slug": "existing"},
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_empty_string_clears_slug(self, auth_client):
        user = auth_client._user
        make_user_profile(user=user, slug="old-slug", is_public=True)
        resp = auth_client.patch(
            "/api/profile/me/",
            {"slug": ""},
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["slug"] is None

    def test_invalid_slug_returns_422(self, auth_client):
        resp = auth_client.patch(
            "/api/profile/me/",
            {"slug": "Ungültiger Slug!"},
            content_type="application/json",
        )
        assert resp.status_code == 422
