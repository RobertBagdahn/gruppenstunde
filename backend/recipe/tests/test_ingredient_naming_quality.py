"""Tests for AI ingredient matching integration via IngredientMatcher (Flow C)."""

from unittest.mock import patch

import pytest

from recipe.services.ai_ingredients_service import AiIngredientSuggestion, RecipeAiIngredientsService
from recipe.services.ingredient_matcher import IngredientMatcher
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestMatchIngredientsIntegration:
    """match_ingredients now delegates to IngredientMatcher.match()."""

    def test_exact_match_returns_existing_ingredient(self):
        existing = make_ingredient(name="Zwiebel frisch", usage_count=10)
        service = RecipeAiIngredientsService()
        suggestion = AiIngredientSuggestion(name="Zwiebel frisch", estimated_grams=80)
        results = service.match_ingredients([suggestion])
        assert len(results) == 1
        _, ingredient_id, is_new, note = results[0]
        assert ingredient_id == existing.id
        assert is_new is False

    def test_plural_creates_new_when_no_definitive_match(self):
        make_ingredient(name="Zwiebel frisch", usage_count=10)
        service = RecipeAiIngredientsService()
        suggestion = AiIngredientSuggestion(name="Zwiebeln frisch", estimated_grams=80)
        results = service.match_ingredients([suggestion])
        assert len(results) == 1
        _, ingredient_id, is_new, note = results[0]
        # Partial match triggers needs_review → new ingredient on SQLite
        assert is_new is True

    def test_matched_ingredient_id_present_when_definitive(self):
        existing = make_ingredient(name="Mehl", usage_count=20)
        service = RecipeAiIngredientsService()
        suggestion = AiIngredientSuggestion(name="Mehl", estimated_grams=200)
        results = service.match_ingredients([suggestion])
        _, ingredient_id, is_new, note = results[0]
        assert ingredient_id == existing.id
        assert is_new is False

    def test_critical_pair_creates_new(self):
        make_ingredient(name="Tomate frisch", usage_count=10)
        service = RecipeAiIngredientsService()

        with patch.object(IngredientMatcher, "_stage_fuzzy", return_value=None):
            with patch.object(IngredientMatcher, "_stage_embedding", return_value=None):
                suggestion = AiIngredientSuggestion(name="Tomatenmark", estimated_grams=30)
                results = service.match_ingredients([suggestion])
                _, ingredient_id, is_new, note = results[0]
                assert is_new is True
