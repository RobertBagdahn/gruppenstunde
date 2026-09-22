"""Tests for the search-grounding fallback in the ingredient review preview.

The "Rezept mit KI vorbereiten" wizard promises that blocked recipe pages are
reconstructed via the web search before the analysis fails. The preview
service (`ingredient_review_service.preview_recipe_ingredients`) must apply
the same fallback as the URL import pipeline and surface the reconstructed
state in the response.
"""

import json
from contextlib import ExitStack
from unittest.mock import patch

import pytest

from recipe.schemas.ingredient_review import RecipeImportSourceIn
from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError
from recipe.services.import_service import ImportedIngredient, ImportedRecipe
from recipe.services.ingredient_review_service import preview_recipe_ingredients
from recipe.services.url_import_service import GeminiRecipeExtraction

URL = "https://www.chefkoch.de/rezepte/1/Blockiert.html"

FETCH_TARGET = "recipe.services.import_service.import_from_url"
GROUNDING_TARGET = "recipe.services.url_import_service._reconstruct_recipe_via_search"
METADATA_TARGET = "recipe.services.ingredient_review_service._call_gemini_for_metadata"
MATCHER_TARGET = "recipe.services.ingredient_matcher.IngredientMatcher.match"
ENRICH_TARGET = "recipe.services.ingredient_enrichment.enrich_ingredient"


def _grounded_source() -> ImportedRecipe:
    return ImportedRecipe(
        title="Blockiertes Rezept",
        description="Rekonstruiert",
        servings=2,
        ingredients=[ImportedIngredient(name="Möhre", quantity="4", unit="Stück")],
        steps=["Möhren schneiden."],
        source_url=URL,
    )


def _metadata_stub():
    return (
        GeminiRecipeExtraction(
            title="Blockiertes Rezept",
            description="Rekonstruiert",
            summary="",
            servings=2,
            recipe_type="warm_meal",
            difficulty="easy",
            steps=["Möhren schneiden."],
            ingredients=[],
        ),
        None,
    )


def _no_match():
    from recipe.services.ingredient_matcher import MatchResult

    return MatchResult(ingredient_id=None, confidence=0.0, note="", needs_review=False)


def _preview_patches():
    return (
        patch(FETCH_TARGET, side_effect=SourceUnreachableError("blocked")),
        patch(GROUNDING_TARGET, return_value=_grounded_source()),
        patch(METADATA_TARGET, return_value=_metadata_stub()),
        patch(MATCHER_TARGET, return_value=_no_match()),
        patch(ENRICH_TARGET, return_value=None),
    )


def _enter_preview_patches():
    stack = ExitStack()
    for patcher in _preview_patches():
        stack.enter_context(patcher)
    return stack


@pytest.mark.django_db
class TestIngredientReviewGroundingFallback:
    def test_blocked_source_is_reconstructed_via_search(self, django_user_model):
        user = django_user_model.objects.create_user(username="r1", password="x")
        sources = [RecipeImportSourceIn(type="url", value=URL)]

        with _enter_preview_patches():
            result = preview_recipe_ingredients(sources, user)

        assert result.is_reconstructed is True
        assert result.recipe_draft.title == "Blockiertes Rezept"
        assert result.rows
        assert result.rows[0].source_text == "Möhre"

    def test_reachable_source_is_not_marked_reconstructed(self, django_user_model):
        user = django_user_model.objects.create_user(username="r2", password="x")
        sources = [RecipeImportSourceIn(type="url", value=URL)]

        with (
            patch(FETCH_TARGET, return_value=_grounded_source()),
            patch(GROUNDING_TARGET) as grounding,
            patch(METADATA_TARGET, return_value=_metadata_stub()),
            patch(MATCHER_TARGET, return_value=_no_match()),
            patch(ENRICH_TARGET, return_value=None),
        ):
            result = preview_recipe_ingredients(sources, user)

        grounding.assert_not_called()
        assert result.is_reconstructed is False

    def test_failed_reconstruction_propagates_unreachable_error(self, django_user_model):
        user = django_user_model.objects.create_user(username="r3", password="x")
        sources = [RecipeImportSourceIn(type="url", value=URL)]

        with (
            patch(FETCH_TARGET, side_effect=SourceUnreachableError("blocked")),
            patch(GROUNDING_TARGET, side_effect=NoRecipeFoundError("nichts")),
            pytest.raises(SourceUnreachableError),
        ):
            preview_recipe_ingredients(sources, user)


@pytest.mark.django_db
class TestIngredientReviewPreviewEndpoint:
    ENDPOINT = "/api/recipes/ingredient-review/preview/"

    def _post(self, client, value=URL):
        return client.post(
            self.ENDPOINT,
            data=json.dumps({"sources": [{"type": "url", "value": value}]}),
            content_type="application/json",
        )

    def test_blocked_source_reconstructs_via_search(self, auth_client):
        with _enter_preview_patches():
            resp = self._post(auth_client)

        assert resp.status_code == 200
        data = resp.json()
        assert data["is_reconstructed"] is True
        assert data["recipe_draft"]["title"] == "Blockiertes Rezept"

    def test_fully_blocked_source_returns_friendly_error(self, auth_client):
        with (
            patch(FETCH_TARGET, side_effect=SourceUnreachableError("403 Forbidden")),
            patch(GROUNDING_TARGET, side_effect=NoRecipeFoundError("nichts")),
        ):
            resp = self._post(auth_client)

        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert "403 Forbidden" not in detail
        assert "Websuche" in detail
