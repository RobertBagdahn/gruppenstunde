"""Tests for singular/plural-robust ingredient matching and generic-term
concretization in the AI ingredient suggestion and URL import services.
"""

import pytest

from recipe.services.ai_ingredients_service import AiIngredientSuggestion, RecipeAiIngredientsService
from recipe.services.url_import_service import GeminiIngredientMatch, GeminiNewIngredient, _create_new_ingredients
from supply.models import IngredientAlias
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestMatchIngredientsNormalized:
    def test_plural_matches_existing_singular_ingredient(self):
        existing = make_ingredient(name="Zwiebel frisch")
        service = RecipeAiIngredientsService()

        suggestion = AiIngredientSuggestion(name="Zwiebeln frisch", estimated_grams=80)
        results = service.match_ingredients([suggestion])

        assert len(results) == 1
        _, ingredient_id, is_new = results[0]
        assert ingredient_id == existing.id
        assert is_new is False

    def test_exact_match_has_priority_over_stemming(self):
        # "Zwiebel frisch" (exact-ish) and normalized variants both exist;
        # an exact alias match should win over a stemmed one.
        exact = make_ingredient(name="Zwiebeln TK")
        make_ingredient(name="Zwiebel frisch")
        service = RecipeAiIngredientsService()

        suggestion = AiIngredientSuggestion(name="Zwiebeln TK", estimated_grams=80)
        results = service.match_ingredients([suggestion])

        _, ingredient_id, is_new = results[0]
        assert ingredient_id == exact.id
        assert is_new is False

    def test_critical_pair_not_merged(self):
        make_ingredient(name="Tomate frisch")
        service = RecipeAiIngredientsService()

        suggestion = AiIngredientSuggestion(name="Tomatenmark", estimated_grams=30)
        results = service.match_ingredients([suggestion])

        _, ingredient_id, is_new = results[0]
        # Should create a new ingredient rather than merging into "Tomate frisch".
        assert is_new is True


@pytest.mark.django_db
class TestCreateNewIngredientsNormalizedReuse:
    def test_reuses_existing_ingredient_via_normalized_match(self):
        existing = make_ingredient(name="Kartoffel frisch")

        new_ingredient_data = GeminiNewIngredient(name="Kartoffeln frisch")
        match = GeminiIngredientMatch(
            original_name="Kartoffeln",
            matched_ingredient_id=None,
            quantity=2,
            unit="Stück",
            new_ingredient=new_ingredient_data,
        )

        created = _create_new_ingredients([match])

        assert len(created) == 1
        assert created[0]["id"] == existing.id
        assert match.matched_ingredient_id == existing.id

    def test_generic_name_gets_name_warning(self):
        # Seed a generic alias so "Nudeln" is recognized as too generic.
        placeholder = make_ingredient(name="Fusilli trocken")
        IngredientAlias.objects.create(ingredient=placeholder, name="Nudeln", is_generic=True)

        new_ingredient_data = GeminiNewIngredient(name="Nudeln")
        match = GeminiIngredientMatch(
            original_name="Nudeln",
            matched_ingredient_id=None,
            quantity=200,
            unit="g",
            new_ingredient=new_ingredient_data,
        )

        created = _create_new_ingredients([match])

        assert len(created) == 1
        assert created[0]["name_warning"] is not None

    def test_specific_name_has_no_warning(self):
        new_ingredient_data = GeminiNewIngredient(name="Fusilli trocken")
        match = GeminiIngredientMatch(
            original_name="Fusilli",
            matched_ingredient_id=None,
            quantity=200,
            unit="g",
            new_ingredient=new_ingredient_data,
        )

        created = _create_new_ingredients([match])

        assert len(created) == 1
        assert created[0]["name_warning"] is None
