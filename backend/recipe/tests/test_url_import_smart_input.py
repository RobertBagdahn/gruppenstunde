"""Tests for the canonical smart recipe input endpoint."""

import json
from unittest.mock import MagicMock, patch

import pytest

from recipe.services.import_service import ImportedIngredient, ImportedRecipe
from recipe.services.url_import_service import (
    GeminiIngredientMatch,
    GeminiRecipeExtraction,
    classify_smart_input,
)
from supply.tests import make_ingredient


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("https://example.com/recipe", "url"),
        ("Zutaten\n200 g Mehl\nZubereitung\nMischen", "text"),
        ("Kartoffelsuppe für 4 Personen", "prompt"),
    ],
)
def test_classify_smart_input(value, expected):
    assert classify_smart_input(value) == expected


def _extraction_response() -> MagicMock:
    data = GeminiRecipeExtraction(
        title="Schnelle Suppe",
        description="Eine einfache Suppe.",
        summary="Schnell und warm.",
        servings=4,
        recipe_type="warm_meal",
        difficulty="easy",
        execution_time_choice="less_30",
        preparation_time_choice="none",
        ingredients=[
            GeminiIngredientMatch(
                source_index=0,
                original_name="Kartoffel",
                quantity=500,
                unit="g",
                estimated_portion_weight_g=1,
            )
        ],
        steps=["Kochen."],
    )
    response = MagicMock()
    response.text = data.model_dump_json()
    return response


@pytest.mark.django_db
class TestSmartInputEndpoint:
    def test_requires_auth(self, api_client):
        response = api_client.post(
            "/api/recipes/smart-input/",
            data=json.dumps({"input": "Kartoffelsuppe"}),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_empty_input_is_rejected(self, auth_client):
        response = auth_client.post(
            "/api/recipes/smart-input/",
            data=json.dumps({"input": "   "}),
            content_type="application/json",
        )
        assert response.status_code == 422
        assert response.json()["error_code"] == "IMPORT_EMPTY_INPUT"

    @patch("recipe.services.url_import_service.gemini_call")
    @patch("recipe.services.ingredient_matcher.IngredientMatcher.match")
    def test_prompt_returns_common_preview_contract(self, mock_match, mock_call, auth_client):
        from recipe.services.ingredient_matcher import MatchResult
        from supply.tests import make_ingredient

        mock_call.return_value = (_extraction_response(), None)
        ingredient = make_ingredient(name="Kartoffel")
        mock_match.return_value = MatchResult(
            ingredient_id=ingredient.id,
            name=ingredient.name,
            confidence=1.0,
            note="",
            needs_review=False,
        )
        response = auth_client.post(
            "/api/recipes/smart-input/",
            data=json.dumps({"input": "Kartoffelsuppe für 4 Personen"}),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["input_type"] == "prompt"
        assert data["recipe_draft"]["title"] == "Schnelle Suppe"
        assert data["recipe_draft"]["servings"] == 4
        assert len(data["recipe_items"]) == 1

    @patch("recipe.services.url_import_service.gemini_call")
    @patch("recipe.services.ingredient_matcher.IngredientMatcher.match")
    def test_copied_recipe_text_uses_common_preview_contract(self, mock_match, mock_call, auth_client):
        from recipe.services.ingredient_matcher import MatchResult

        mock_call.return_value = (_extraction_response(), None)
        ingredient = make_ingredient(name="Kartoffel")
        mock_match.return_value = MatchResult(
            ingredient_id=ingredient.id,
            name=ingredient.name,
            confidence=1.0,
            note="",
            needs_review=False,
        )

        response = auth_client.post(
            "/api/recipes/smart-input/",
            data=json.dumps({"input": "Zutaten\n500 g Kartoffel\nZubereitung\nKochen"}),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["input_type"] == "text"
        assert data["recipe_draft"]["title"] == "Schnelle Suppe"
        assert data["recipe_draft"]["steps"] == ["Kochen."]

    @patch("recipe.services.import_service.import_from_url")
    @patch("recipe.services.url_import_service._call_gemini_for_metadata")
    @patch("recipe.services.ingredient_matcher.IngredientMatcher.match")
    def test_url_uses_same_contract(self, mock_match, mock_metadata, mock_fetch, auth_client):
        from recipe.services.ingredient_matcher import MatchResult
        from supply.tests import make_ingredient

        source = ImportedRecipe(
            title="URL Rezept",
            servings=2,
            ingredients=[ImportedIngredient(name="Möhre", quantity="2", unit="Stück")],
            steps=["Schneiden."],
            source_url="https://example.com/recipe",
        )
        mock_fetch.return_value = source
        mock_metadata.return_value = GeminiRecipeExtraction(
            title="URL Rezept",
            description="",
            summary="",
            servings=2,
            recipe_type="warm_meal",
            difficulty="easy",
            ingredients=[GeminiIngredientMatch(source_index=0, original_name="Möhre", quantity=2, unit="Stück")],
            steps=["Schneiden."],
        )
        ingredient = make_ingredient(name="Möhre")
        mock_match.return_value = MatchResult(
            ingredient_id=ingredient.id,
            name=ingredient.name,
            confidence=1.0,
            note="",
            needs_review=False,
        )
        response = auth_client.post(
            "/api/recipes/smart-input/",
            data=json.dumps({"input": "https://example.com/recipe"}),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["input_type"] == "url"
        assert data["is_reconstructed"] is False
