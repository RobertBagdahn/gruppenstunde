"""Tests for Flow B (ai_create_recipe) IngredientMatcher integration."""

ENRICH_TARGET = "recipe.services.ingredient_enrichment.enrich_ingredient"

from unittest.mock import MagicMock, patch

import pytest

from recipe.services.ingredient_matcher import MatchResult
from recipe.services.recipe_ai_suggest_service import _resolve_ingredient_from_match
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestResolveIngredientFromMatch:
    """Tests for _resolve_ingredient_from_match — the bridge between MatchResult and Ingredient."""

    def test_returns_existing_ingredient_when_id_set(self):
        existing = make_ingredient(name="Mehl")
        match_result = MatchResult(
            ingredient_id=existing.id,
            name="Mehl",
            confidence=1.0,
            matched_via="jaccard",
            note="",
        )

        result = _resolve_ingredient_from_match(match_result, "Mehl")
        assert result.id == existing.id
        assert result.name == "Mehl"

    def test_creates_draft_ingredient_when_needs_review(self):
        match_result = MatchResult(
            ingredient_id=None,
            name="Exotische Zutat",
            confidence=0.3,
            matched_via="jaccard",
            note="frisch",
            needs_review=True,
        )

        with patch(
            ENRICH_TARGET,
            return_value=None,
        ):
            result = _resolve_ingredient_from_match(match_result, "Exotische Zutat")

        assert result is not None
        assert result.name == "Exotische Zutat"
        assert result.status == "draft"

    def test_enriches_when_needs_review_and_enrichment_succeeds(self):
        from recipe.schemas.enrichment import GeminiNewIngredient
        from supply.choices import IngredientStatusChoices

        enrichment_data = GeminiNewIngredient(
            name="Exotisch",
            aliases=["Exot"],
            energy_kcal=200,
            protein_g=5.0,
            fat_g=2.0,
            carbohydrate_g=40.0,
            sugar_g=10.0,
            fibre_g=3.0,
            salt_g=0.5,
            child_score=6,
            scout_score=7,
            environmental_score=5,
            nova_score=2,
            nutri_score=3,
            nutri_class=3,
            physical_density=0.9,
            physical_viscosity="solid",
            portion_name="Stück",
            portion_weight_g=100,
        )

        match_result = MatchResult(
            ingredient_id=None,
            name="Exotisch",
            confidence=0.0,
            matched_via="new",
            needs_review=True,
        )

        with patch(
            ENRICH_TARGET,
            return_value=enrichment_data,
        ):
            result = _resolve_ingredient_from_match(match_result, "Exotisch")

        assert result.name == "Exotisch"
        assert result.energy_kcal == 200
        assert result.protein_g == 5.0
