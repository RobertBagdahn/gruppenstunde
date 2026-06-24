"""Tests for suggestion_service — LLM ingredient suggestions (mocked Gemini)."""

from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from ninja.errors import HttpError

from recipe.services.suggestion_service import (
    RATE_LIMIT_MAX,
    SuggestionItem,
    SuggestionsOutput,
    _check_rate_limit,
    get_suggestions,
)
from recipe.tests import make_recipe, make_recipe_item
from supply.models import Ingredient, MeasuringUnit, Portion

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear Django cache before each test."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="testchef",
        email="chef@inspi.dev",
        password="test123",
    )


@pytest.fixture
def ingredient_with_portion(db):
    """Create an ingredient with a portion for recipe items."""
    unit = MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)
    ing = Ingredient.objects.create(
        name="Kartoffeln",
        slug="kartoffeln",
        status="approved",
        energy_kcal=72,
        protein_g=2.0,
        fat_g=0.1,
        carbohydrate_g=15.0,
        sugar_g=0.8,
        fibre_g=2.0,
        salt_g=0.01,
    )
    portion = Portion.objects.create(
        ingredient=ing,
        measuring_unit=unit,
        name="Gramm Kartoffeln",
        quantity=1.0,
        weight_g=1.0,
    )
    return ing, portion, unit


@pytest.fixture
def recipe_with_items(ingredient_with_portion):
    ing, portion, unit = ingredient_with_portion
    recipe = make_recipe(
        cached_energy_kcal=72,
        cached_protein_g=2.0,
        cached_fat_g=0.1,
        cached_sugar_g=0.8,
        cached_fibre_g=2.0,
        cached_salt_g=0.01,
    )
    make_recipe_item(recipe=recipe, portion=portion, quantity=500.0)
    return recipe


def _mock_gemini_response():
    """Build a mock Gemini response with valid SuggestionsOutput JSON."""
    output = SuggestionsOutput(
        suggestions=[
            SuggestionItem(
                ingredient_name="Linsen",
                recommended_amount=100.0,
                unit="g",
                reasoning="Linsen sind ballaststoffreich",
                expected_improvement="+4g Ballaststoffe pro 100g",
            ),
            SuggestionItem(
                ingredient_name="Haferflocken",
                recommended_amount=50.0,
                unit="g",
                reasoning="Gute Ballaststoffquelle",
                expected_improvement="+2g Ballaststoffe pro 100g",
            ),
            SuggestionItem(
                ingredient_name="Leinsamen",
                recommended_amount=20.0,
                unit="g",
                reasoning="Hoher Ballaststoffgehalt",
                expected_improvement="+3g Ballaststoffe pro 100g",
            ),
        ]
    )
    mock_response = MagicMock()
    mock_response.text = output.model_dump_json()
    return mock_response


# ===========================================================================
# Rate Limiting
# ===========================================================================


@pytest.mark.django_db
class TestRateLimiting:
    def test_exceeding_rate_limit_raises_429(self, user):
        """Calling _check_rate_limit RATE_LIMIT_MAX times succeeds,
        the next call should raise HttpError(429)."""
        for _ in range(RATE_LIMIT_MAX):
            _check_rate_limit(user)

        with pytest.raises(HttpError) as exc_info:
            _check_rate_limit(user)
        assert exc_info.value.status_code == 429


# ===========================================================================
# get_suggestions (with mocked Gemini)
# ===========================================================================


@pytest.mark.django_db
class TestGetSuggestions:
    @patch("recipe.services.suggestion_service.gemini_call")
    def test_returns_empty_when_no_client(self, mock_gemini_call, recipe_with_items, user):
        """When gemini_call() returns None → empty list."""
        mock_gemini_call.return_value = None

        result = get_suggestions(recipe_with_items, "mehr Protein", user)
        assert result == []

    def test_returns_cached_result(self, recipe_with_items, user):
        """Manually set cache → service returns cached data without calling Gemini."""
        cached_data = [{"ingredient_name": "Cached", "recommended_amount": 1.0}]
        cached_at_ts = int(recipe_with_items.cached_at.timestamp()) if recipe_with_items.cached_at else 0
        cache_key = f"recipe_suggestion:{recipe_with_items.id}:{cached_at_ts}:{hash('test objective')}"
        cache.set(cache_key, cached_data, timeout=3600)

        result = get_suggestions(recipe_with_items, "test objective", user)
        assert result == cached_data

    @patch("recipe.services.suggestion_service.gemini_call")
    def test_calls_gemini_and_caches(self, mock_gemini_call, recipe_with_items, user):
        """Mock gemini_call returns structured JSON → suggestions returned and cached."""
        mock_gemini_call.return_value = _mock_gemini_response()

        objective = "mehr Ballaststoffe"
        result = get_suggestions(recipe_with_items, objective, user)

        # Verify suggestions returned
        assert len(result) == 3
        assert result[0]["ingredient_name"] == "Linsen"

        # Verify Gemini was called
        assert mock_gemini_call.call_count == 1

        # Verify result is cached (second call doesn't hit Gemini again)
        result2 = get_suggestions(recipe_with_items, objective, user)
        assert result2 == result
        assert mock_gemini_call.call_count == 1
