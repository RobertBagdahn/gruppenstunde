"""Tests for enrich_ingredient — Gemini-based nutritional data enrichment."""

import json
from unittest.mock import MagicMock, patch

import pytest

from core.services.gemini import GeminiUnavailableError
from recipe.services.ingredient_enrichment import enrich_ingredient


def _make_enrichment_response() -> dict:
    return {
        "name": "Freekeh",
        "aliases": ["Grünkern", "Frikeh"],
        "energy_kcal": 350,
        "protein_g": 14.0,
        "fat_g": 2.5,
        "fat_sat_g": 0.5,
        "carbohydrate_g": 65.0,
        "sugar_g": 1.5,
        "fibre_g": 10.0,
        "salt_g": 0.02,
        "child_score": 7,
        "scout_score": 8,
        "environmental_score": 6,
        "nova_score": 1,
        "nutri_score": 2,
        "nutri_class": 2,
        "physical_density": 0.85,
        "physical_viscosity": "solid",
        "portion_name": "Stück",
        "portion_weight_g": 80,
    }


@pytest.mark.django_db
class TestEnrichIngredient:
    def test_successful_enrichment(self):
        mock_response = MagicMock()
        mock_response.text = json.dumps(_make_enrichment_response())

        with patch("recipe.services.ingredient_enrichment.gemini_call", return_value=(mock_response, None)):
            result = enrich_ingredient("Freekeh")

        assert result is not None
        assert result.name == "Freekeh"
        assert result.energy_kcal == 350
        assert result.protein_g == 14.0
        assert result.fat_g == 2.5
        assert result.fat_sat_g == 0.5
        assert result.carbohydrate_g == 65.0
        assert result.sugar_g == 1.5
        assert result.fibre_g == 10.0
        assert result.salt_g == 0.02
        assert result.child_score == 7
        assert result.scout_score == 8
        assert result.environmental_score == 6
        assert result.nova_score == 1
        assert result.nutri_class == 2
        assert result.physical_viscosity == "solid"
        assert result.portion_weight_g == 80
        assert "Grünkern" in result.aliases

    def test_gemini_returns_none(self):
        with patch("recipe.services.ingredient_enrichment.gemini_call", return_value=(None, None)):
            result = enrich_ingredient("Freekeh")
        assert result is None

    def test_gemini_unavailable_error(self):
        with patch("recipe.services.ingredient_enrichment.gemini_call", side_effect=GeminiUnavailableError()):
            result = enrich_ingredient("Freekeh")
        assert result is None

    def test_unexpected_exception(self):
        with patch("recipe.services.ingredient_enrichment.gemini_call", side_effect=RuntimeError("boom")):
            result = enrich_ingredient("Freekeh")
        assert result is None
