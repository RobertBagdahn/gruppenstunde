"""Tests for AI recipe creation endpoint."""

import json
from unittest.mock import patch, MagicMock

import pytest


def _build_mock_gemini_response():
    """Build a mock Gemini response matching RecipeAiCreateSchema."""
    from recipe.services.recipe_ai_suggest_service import (
        RecipeAiCreateSchema,
        RecipeItemSuggestion,
    )

    data = RecipeAiCreateSchema(
        title="Nudelauflauf",
        description="Ein herzhafter Nudelauflauf mit Hackfleisch und Käse überbacken.",
        difficulty="medium",
        duration_minutes=45,
        portions=4,
        recipe_type="warm_meal",
        items=[
            RecipeItemSuggestion(ingredient_name="Nudeln", quantity=500, unit="g"),
            RecipeItemSuggestion(ingredient_name="Hackfleisch", quantity=400, unit="g"),
            RecipeItemSuggestion(ingredient_name="Käse", quantity=200, unit="g"),
            RecipeItemSuggestion(ingredient_name="Tomaten", quantity=300, unit="g"),
        ],
    )
    mock_response = MagicMock()
    mock_response.text = data.model_dump_json()
    return mock_response


@pytest.mark.django_db
class TestAiCreateEndpoint:
    """Tests for POST /api/recipes/ai-create/"""

    def test_unauthenticated_returns_403(self, api_client):
        resp = api_client.post(
            "/api/recipes/ai-create/",
            data=json.dumps({"prompt": "Nudelauflauf"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    @patch("recipe.services.recipe_ai_suggest_service.gemini_call")
    @patch("recipe.services.ingredient_matcher.IngredientMatcher.match")
    @patch("recipe.services.ingredient_enrichment.enrich_ingredient")
    def test_creates_recipe_with_valid_prompt(
        self,
        mock_enrich,
        mock_match,
        mock_gemini_call,
        auth_client,
    ):
        from recipe.models import Recipe
        from recipe.services.ingredient_matcher import MatchResult

        mock_gemini_call.return_value = (_build_mock_gemini_response(), "test-interaction-id")
        mock_enrich.return_value = None
        mock_match.return_value = MatchResult(
            ingredient_id=None,
            confidence=0.5,
            note="",
            needs_review=False,
        )

        resp = auth_client.post(
            "/api/recipes/ai-create/",
            data=json.dumps({"prompt": "Nudelauflauf mit Hackfleisch"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Nudelauflauf"
        assert data["recipe_type"] == "warm_meal"
        assert data["portions"] == 4
        assert data["status"] == "draft"
        assert len(data["recipe_items"]) == 4
        assert data["recipe_items"][0]["ingredient_name"] == "Nudeln"

        recipe = Recipe.objects.get(id=data["id"])
        assert recipe.owner == auth_client._user

    @patch("recipe.services.recipe_ai_suggest_service.gemini_call")
    def test_returns_503_when_gemini_unavailable(self, mock_gemini_call, auth_client):
        mock_gemini_call.return_value = (None, None)

        resp = auth_client.post(
            "/api/recipes/ai-create/",
            data=json.dumps({"prompt": "Irgendein Rezept"}),
            content_type="application/json",
        )
        assert resp.status_code == 503
