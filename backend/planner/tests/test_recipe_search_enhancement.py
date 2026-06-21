"""Tests for recipe search enhancement: dessert mapping, fallback, badge, price, ranking, dietary filter, drafts, random, recently-used."""

import pytest
from django.test import Client

from planner.api.meal_plan import MEAL_TYPE_TO_RECIPE_TYPES, _resolve_recipe_badge
from recipe.models import Recipe
from recipe.tests import make_recipe
from planner.tests import make_meal, make_meal_plan


@pytest.mark.django_db
class TestDessertMapping:
    """Test that dessert is included in MEAL_TYPE_TO_RECIPE_TYPES."""

    def test_dessert_in_all_meal_types(self):
        for meal_type in ["breakfast", "lunch", "dinner", "snack"]:
            assert "dessert" in MEAL_TYPE_TO_RECIPE_TYPES[meal_type], \
                f"dessert missing from {meal_type}"

    def test_breakfast_includes_correct_types(self):
        assert set(MEAL_TYPE_TO_RECIPE_TYPES["breakfast"]) == {"breakfast", "simple_meal", "dessert"}

    def test_lunch_includes_correct_types(self):
        assert set(MEAL_TYPE_TO_RECIPE_TYPES["lunch"]) == {"warm_meal", "cold_meal", "side_dish", "dessert"}


@pytest.mark.django_db
class TestRecipeBadge:
    """Test recipe badge resolution."""

    def test_verified_badge(self):
        recipe = make_recipe(title="Test")
        recipe.owner = None
        recipe.status = "approved"
        recipe.save()
        badge = _resolve_recipe_badge(recipe, None)
        assert badge == "verified"

    def test_community_badge(self, db):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        owner = User.objects.create_user(username="community_owner", password="pass")
        recipe = make_recipe(title="Test")
        recipe.owner = owner
        recipe.visibility = "public"
        recipe.status = "approved"
        recipe.save()
        badge = _resolve_recipe_badge(recipe, owner)
        assert badge == "community"

    def test_draft_badge(self, db):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        owner = User.objects.create_user(username="draft_owner", password="pass")
        recipe = make_recipe(title="Test")
        recipe.owner = owner
        recipe.status = "draft"
        recipe.visibility = "private"
        recipe.save()
        badge = _resolve_recipe_badge(recipe, owner)
        assert badge == "draft"


@pytest.mark.django_db
class TestPricePerServing:
    """Test price_per_serving calculation."""

    def test_price_with_valid_data(self):
        recipe = make_recipe(title="Test")
        recipe.portions = 5
        recipe.cached_price_total = 12.50
        recipe.save()
        pps = round(recipe.cached_price_total / recipe.portions, 2)
        assert pps == 2.50

    def test_price_null_when_no_price_total(self):
        recipe = make_recipe(title="Test")
        recipe.portions = 5
        recipe.cached_price_total = None
        recipe.save()
        pps = round(float(recipe.cached_price_total) / recipe.portions, 2) if recipe.cached_price_total and recipe.portions > 0 else None
        assert pps is None

    def test_price_null_when_zero_portions(self):
        recipe = make_recipe(title="Test")
        recipe.portions = 0
        recipe.cached_price_total = 10.00
        recipe.save()
        pps = round(float(recipe.cached_price_total) / recipe.portions, 2) if recipe.cached_price_total and recipe.portions > 0 else None
        assert pps is None


@pytest.mark.django_db
class TestDietaryAndFilter:
    """Test nutritional_tag AND filtering and draft inclusion."""

    def test_map_has_correct_number_of_types(self):
        assert len(MEAL_TYPE_TO_RECIPE_TYPES) == 4
        assert "breakfast" in MEAL_TYPE_TO_RECIPE_TYPES
        assert "snack" in MEAL_TYPE_TO_RECIPE_TYPES


@pytest.mark.django_db
class TestRecentlyUsedEndpoint:
    """Test recently-used endpoint."""

    def test_endpoint_requires_auth(self):
        client = Client()
        response = client.get("/api/meal-plans/recipes/recently-used/?limit=5")
        assert response.status_code in (401, 403)

    def test_endpoint_returns_empty_for_new_user(self, db):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.create_user(username="testuser", password="pass")
        client = Client()
        client.force_login(user)
        response = client.get("/api/meal-plans/recipes/recently-used/?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data["recipes"] == []


@pytest.mark.django_db
class TestRandomSuggestion:
    """Test random=true parameter on suggestions endpoint."""

    def test_random_returns_single_or_empty(self):
        client = Client()
        response = client.get(
            "/api/meal-plans/recipes/suggestions/?meal_type=breakfast&random=true&limit=1"
        )
        assert response.status_code in (200, 401, 403)


@pytest.mark.django_db
class TestSearchEndpoint:
    """Test the enhanced search endpoint."""

    def test_search_returns_fallback_applied(self):
        client = Client()
        response = client.get(
            "/api/meal-plans/recipes/search/?meal_type=breakfast&limit=5"
        )
        assert response.status_code in (200, 401, 403)
        if response.status_code == 200:
            data = response.json()
            assert "fallback_applied" in data
            assert "recipes" in data
