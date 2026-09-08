"""Tests for the search-grounding fallback of the recipe URL import.

Many recipe sites block automated fetches. Before reporting the source as
unreachable, the pipeline asks the model to reconstruct the recipe via Google
Search Grounding. Only when that also fails does the user see an error.
"""

from unittest.mock import MagicMock, patch

import pytest

from core.services.gemini import GeminiUnavailableError
from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError
from recipe.services.import_service import ImportedIngredient, ImportedRecipe
from recipe.services.url_import_service import (
    GroundedIngredient,
    GroundedRecipe,
    _reconstruct_recipe_via_search,
    import_recipe_from_url,
)

URL = "https://www.chefkoch.de/rezepte/1/Blockiert.html"

FETCH_TARGET = "recipe.services.import_service.import_from_url"
GROUNDING_TARGET = "recipe.services.url_import_service._reconstruct_recipe_via_search"
METADATA_TARGET = "recipe.services.url_import_service._call_gemini_for_metadata"
GEMINI_TARGET = "recipe.services.url_import_service.gemini_call"
MATCHER_TARGET = "recipe.services.ingredient_matcher.IngredientMatcher.match"


def _grounded_source() -> ImportedRecipe:
    return ImportedRecipe(
        title="Blockiertes Rezept",
        description="Rekonstruiert",
        servings=2,
        ingredients=[ImportedIngredient(name="Möhre", quantity="4", unit="Stück")],
        steps=["Möhren schneiden."],
        source_url=URL,
    )


def _no_match():
    """IngredientMatcher uses Postgres-only search, so it is stubbed out."""
    from recipe.services.ingredient_matcher import MatchResult

    return MatchResult(ingredient_id=None, confidence=0.0, note="", needs_review=False)


def _metadata_stub():
    from recipe.services.url_import_service import GeminiRecipeExtraction

    return GeminiRecipeExtraction(
        title="Blockiertes Rezept",
        description="Rekonstruiert",
        summary="",
        servings=2,
        recipe_type="warm_meal",
        difficulty="easy",
        steps=["Möhren schneiden."],
        ingredients=[],
    )


@pytest.mark.django_db
class TestGroundingFallback:
    def test_unreachable_source_triggers_reconstruction(self, django_user_model):
        user = django_user_model.objects.create_user(username="u1", password="x")

        with (
            patch(FETCH_TARGET, side_effect=SourceUnreachableError("blocked")),
            patch(GROUNDING_TARGET, return_value=_grounded_source()) as grounding,
            patch(METADATA_TARGET, return_value=_metadata_stub()),
            patch(MATCHER_TARGET, return_value=_no_match()),
        ):
            result = import_recipe_from_url(URL, user)

        grounding.assert_called_once()
        assert result.is_reconstructed is True
        assert result.title == "Blockiertes Rezept"

    def test_reachable_source_does_not_use_grounding(self, django_user_model):
        user = django_user_model.objects.create_user(username="u2", password="x")

        with (
            patch(FETCH_TARGET, return_value=_grounded_source()),
            patch(GROUNDING_TARGET) as grounding,
            patch(METADATA_TARGET, return_value=_metadata_stub()),
            patch(MATCHER_TARGET, return_value=_no_match()),
        ):
            result = import_recipe_from_url(URL, user)

        grounding.assert_not_called()
        assert result.is_reconstructed is False

    def test_failed_reconstruction_reports_unreachable_source(self, django_user_model):
        """The page was never readable, so NO_RECIPE_FOUND would mislead."""
        user = django_user_model.objects.create_user(username="u3", password="x")

        with (
            patch(FETCH_TARGET, side_effect=SourceUnreachableError("blocked")),
            patch(GROUNDING_TARGET, side_effect=NoRecipeFoundError("nichts")),
            pytest.raises(SourceUnreachableError),
        ):
            import_recipe_from_url(URL, user)

    def test_unavailable_ai_during_fallback_propagates(self, django_user_model):
        user = django_user_model.objects.create_user(username="u4", password="x")

        with (
            patch(FETCH_TARGET, side_effect=SourceUnreachableError("blocked")),
            patch(GROUNDING_TARGET, side_effect=GeminiUnavailableError()),
            pytest.raises(GeminiUnavailableError),
        ):
            import_recipe_from_url(URL, user)


@pytest.mark.django_db
class TestReconstructRecipeViaSearch:
    def _response(self, payload: GroundedRecipe) -> MagicMock:
        response = MagicMock()
        response.text = payload.model_dump_json()
        return response

    def test_returns_imported_recipe_when_found(self, django_user_model):
        user = django_user_model.objects.create_user(username="g1", password="x")
        payload = GroundedRecipe(
            found=True,
            title="Möhrchenpfanne",
            description="Lecker",
            servings=2,
            ingredients=[GroundedIngredient(name="Möhre", quantity="4", unit="Stück")],
            steps=["Schneiden."],
        )

        with patch(GEMINI_TARGET, return_value=(self._response(payload), None)):
            recipe = _reconstruct_recipe_via_search(URL, user)

        assert recipe.title == "Möhrchenpfanne"
        assert recipe.servings == 2
        assert recipe.ingredients[0].name == "Möhre"
        assert recipe.source_url == URL

    def test_raises_when_model_found_nothing(self, django_user_model):
        user = django_user_model.objects.create_user(username="g2", password="x")
        payload = GroundedRecipe(found=False)

        with (
            patch(GEMINI_TARGET, return_value=(self._response(payload), None)),
            pytest.raises(NoRecipeFoundError),
        ):
            _reconstruct_recipe_via_search(URL, user)

    def test_raises_when_ai_unavailable(self, django_user_model):
        user = django_user_model.objects.create_user(username="g3", password="x")

        with (
            patch(GEMINI_TARGET, return_value=(None, None)),
            pytest.raises(GeminiUnavailableError),
        ):
            _reconstruct_recipe_via_search(URL, user)
