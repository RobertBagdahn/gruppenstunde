"""Anonymous "Rezept erkennen" via the ingredient review preview (open-access, ai-budget)."""

import json
from unittest.mock import MagicMock, patch

import pytest
from django.test import Client

from recipe.services.import_service import ImportedIngredient, ImportedRecipe
from recipe.services.url_import_service import GeminiRecipeExtraction

URL = "https://example.com/rezept"


def _source() -> ImportedRecipe:
    return ImportedRecipe(
        title="Möhrensuppe",
        servings=2,
        ingredients=[ImportedIngredient(name="Möhre", quantity="4", unit="Stück")],
        steps=["Schneiden."],
        source_url=URL,
    )


def _metadata():
    return (
        GeminiRecipeExtraction(
            title="Möhrensuppe",
            description="",
            summary="",
            servings=2,
            recipe_type="warm_meal",
            difficulty="easy",
            steps=["Schneiden."],
            ingredients=[],
        ),
        None,
    )


def _no_match():
    from recipe.services.ingredient_matcher import MatchResult

    return MatchResult(ingredient_id=None, confidence=0.0, note="", needs_review=False)


@pytest.mark.django_db
class TestAnonymousReviewPreview:
    def _post(self, client: Client, value: str = URL):
        return client.post(
            "/api/recipes/ingredient-review/preview/",
            data=json.dumps({"input": value}),
            content_type="application/json",
        )

    @patch("recipe.services.ingredient_enrichment.enrich_ingredient")
    @patch("recipe.services.ingredient_matcher.IngredientMatcher.match", return_value=_no_match())
    @patch("recipe.services.ingredient_review_service._call_gemini_for_metadata", return_value=_metadata())
    @patch("recipe.services.import_service.import_from_url", return_value=_source())
    def test_anonymous_preview_without_enrichment_and_cached(
        self,
        mock_fetch: MagicMock,
        mock_meta: MagicMock,
        _match: MagicMock,
        mock_enrich: MagicMock,
        api_client: Client,
    ) -> None:
        first = self._post(api_client)
        assert first.status_code == 200, first.content
        mock_enrich.assert_not_called()
        second = self._post(api_client)
        assert second.status_code == 200
        assert mock_meta.call_count == 1
        assert second.json() == first.json()

    def test_anonymous_input_limit(self, api_client: Client) -> None:
        response = self._post(api_client, "Zutaten " + "x" * 9000)
        assert response.status_code == 422
        assert response.json()["code"] == "input_too_long"
