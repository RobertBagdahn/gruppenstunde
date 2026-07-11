"""Tests for IngredientMatcher — cascading ingredient matching pipeline."""

from unittest.mock import patch

import pytest

from recipe.services.ingredient_matcher import IngredientMatcher, MatchResult
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestStage1Jaccard:
    """Stage 1: Wort-Jaccard matching against Ingredient.name."""

    def test_exact_match_returns_definitive_result(self):
        ing = make_ingredient(name="Fladenbrot", usage_count=42)
        result = IngredientMatcher.match("Fladenbrot")
        assert result.ingredient_id == ing.id
        assert result.matched_via == "jaccard"
        assert result.confidence == 1.0
        assert result.needs_review is False

    def test_no_match_falls_through(self):
        with patch.object(IngredientMatcher, "_stage_fuzzy", return_value=None):
            with patch.object(IngredientMatcher, "_stage_embedding", return_value=None):
                result = IngredientMatcher.match("UnbekanntExtremSelten")
                assert result.needs_review is True
                assert result.matched_via == "new"
                assert result.ingredient_id is None
                assert result.confidence == 0.0

    def test_grey_zone_returns_needs_review(self):
        # "Zwiebeln" is in DB, so parser returns confidence=1.0, clean_name="Zwiebeln"
        make_ingredient(name="Zwiebeln", usage_count=15)
        # Other ingredients with partial overlap
        make_ingredient(name="Zwiebeln rot", usage_count=100)
        make_ingredient(name="Zwiebeln frisch", usage_count=50)
        result = IngredientMatcher.match("Zwiebeln")
        assert result.needs_review is True
        assert result.matched_via == "jaccard"
        assert result.confidence == 0.5
        assert len(result.candidates) >= 1

    def test_multiple_close_matches_trigger_hitl(self):
        make_ingredient(name="Zwiebeln", usage_count=15)
        make_ingredient(name="Zwiebeln rot", usage_count=100)
        make_ingredient(name="Zwiebeln frisch", usage_count=50)
        result = IngredientMatcher.match("Zwiebeln")
        # Both "Zwiebeln rot" and "Zwiebeln frisch" have Jaccard 0.5, diff 0 < 0.05
        assert result.needs_review is True
        assert len(result.candidates) >= 2

    def test_popularity_ordering(self):
        _low = make_ingredient(name="Zwiebel rot", usage_count=5)
        _high = make_ingredient(name="Zwiebel", usage_count=50)
        result = IngredientMatcher.match("Zwiebel")
        # "Zwiebel" (usage_count=50) is first in ordering, Jaccard vs itself = 1.0
        assert result.ingredient_id is not None
        assert result.matched_via == "jaccard"

    def test_note_from_parser_preserved(self):
        make_ingredient(name="Fladenbrot")
        result = IngredientMatcher.match("Fladenbrot frisch")
        assert result.note == "frisch"


@pytest.mark.django_db
class TestStage4HumanDialog:
    """Stage 4: Human Dialog fallback when all algorithmic stages fail."""

    def test_no_match_returns_needs_review(self):
        with patch.object(IngredientMatcher, "_stage_jaccard", return_value=None):
            with patch.object(IngredientMatcher, "_stage_fuzzy", return_value=None):
                with patch.object(IngredientMatcher, "_stage_embedding", return_value=None):
                    result = IngredientMatcher.match("Freekeh")
                    assert result.needs_review is True
                    assert result.matched_via == "new"
                    assert result.confidence == 0.0
                    assert result.ingredient_id is None
                    assert result.candidates == []


@pytest.mark.django_db
class TestCascading:
    """Full cascading pipeline through all stages."""

    def test_stage2_definitive_when_stage1_fails(self):
        ing = make_ingredient(name="Champignon")

        def stage2_match(clean_name, raw_name, note):
            return MatchResult(
                ingredient_id=ing.id,
                name=ing.name,
                confidence=0.85,
                matched_via="fuzzy",
                note=note,
            )

        with patch.object(IngredientMatcher, "_stage_fuzzy", side_effect=stage2_match):
            result = IngredientMatcher.match("Champninon")
            assert result.ingredient_id == ing.id
            assert result.matched_via == "fuzzy"

    def test_stage3_definitive_when_stage1_and_stage2_fail(self):
        ing = make_ingredient(name="Rindergehacktes")

        def stage3_match(clean_name, note):
            return MatchResult(
                ingredient_id=ing.id,
                name=ing.name,
                confidence=0.75,
                matched_via="embed",
                note=note,
            )

        with patch.object(IngredientMatcher, "_stage_fuzzy", return_value=None):
            with patch.object(IngredientMatcher, "_stage_embedding", side_effect=stage3_match):
                result = IngredientMatcher.match("Rinderhack")
                assert result.ingredient_id == ing.id
                assert result.matched_via == "embed"
