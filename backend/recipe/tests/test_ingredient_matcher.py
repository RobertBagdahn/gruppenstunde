"""Tests for IngredientMatcher — cascading ingredient matching pipeline."""

from unittest.mock import patch

import pytest

from recipe.services.ingredient_matcher import IngredientMatcher, MatchCandidate, MatchResult
from supply.tests import make_ingredient

# Gemini fallbacks (parser, enrichment, embeddings) are incidental here; keep them offline.
pytestmark = pytest.mark.usefixtures("gemini_unavailable")


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
        # Ingredients with partial overlap in DB, query has no exact match
        make_ingredient(name="Zwiebel rot", usage_count=100)
        make_ingredient(name="Zwiebel frisch", usage_count=50)
        result = IngredientMatcher.match("Zwiebel")
        assert result.needs_review is True
        assert result.matched_via == "jaccard"
        assert result.confidence == 0.5
        assert len(result.candidates) >= 1

    def test_multiple_close_matches_trigger_hitl(self):
        # Both "Zwiebel rot" and "Zwiebel frisch" have Jaccard 0.5, diff 0 < 0.05
        make_ingredient(name="Zwiebel rot", usage_count=100)
        make_ingredient(name="Zwiebel frisch", usage_count=50)
        result = IngredientMatcher.match("Zwiebel")
        assert result.needs_review is True
        assert len(result.candidates) >= 2

    def test_exact_match_preferred_over_higher_usage_partial_match(self):
        # Decision 4: Exact match takes precedence over higher-usage partial matches
        exact = make_ingredient(name="Zwiebeln", usage_count=15)
        make_ingredient(name="Zwiebeln rot", usage_count=100)
        make_ingredient(name="Zwiebeln frisch", usage_count=50)
        result = IngredientMatcher.match("Zwiebeln")
        assert result.ingredient_id == exact.id
        assert result.confidence == 1.0
        assert result.needs_review is False

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
class TestCandidateListOnAllResults:
    """Every match result carries the top candidates of the deciding stage."""

    def test_confident_fuzzy_match_carries_candidates(self):
        make_ingredient(name="Kirschen", usage_count=30)
        result = IngredientMatcher.match("Kirsche(n)")
        assert result.matched_via == "fuzzy"
        assert result.ingredient_id is not None
        assert len(result.candidates) >= 1
        assert all(c.slug for c in result.candidates)

    def test_exact_match_carries_candidate(self):
        ing = make_ingredient(name="Orangensaft")
        result = IngredientMatcher.match("Orangensaft")
        assert result.ingredient_id == ing.id
        assert len(result.candidates) == 1
        assert result.candidates[0].slug == ing.slug
        assert result.candidates[0].confidence == 1.0

    def test_grey_zone_candidates_have_slug(self):
        make_ingredient(name="Zwiebel rot", usage_count=100)
        make_ingredient(name="Zwiebel frisch", usage_count=50)
        result = IngredientMatcher.match("Zwiebel")
        assert result.needs_review is True
        assert len(result.candidates) >= 2
        assert all(c.slug for c in result.candidates)


@pytest.mark.django_db
class TestEmbeddingStageCandidatesOnly:
    """Embedding stage never auto-matches — it only proposes candidates."""

    def test_embedding_result_is_candidates_only(self):
        ing = make_ingredient(name="Rindergehacktes")
        result = IngredientMatcher._embedding_result(
            "Rinderhack",
            "",
            [MatchCandidate(id=ing.id, name=ing.name, slug=ing.slug, confidence=0.72)],
        )
        assert result.needs_review is True
        assert result.ingredient_id is None
        assert result.matched_via == "embed"
        assert result.candidates[0].slug == ing.slug
        assert result.candidates[0].confidence == 0.72

    def test_embedding_result_empty_returns_none(self):
        assert IngredientMatcher._embedding_result("Rinderhack", "", []) is None

    def test_embedding_result_keeps_top_five(self):
        cands = [
            MatchCandidate(id=i, name=f"Zutat {i}", slug=f"zutat-{i}", confidence=0.9 - i * 0.01) for i in range(7)
        ]
        result = IngredientMatcher._embedding_result("Freekeh", "", cands)
        assert len(result.candidates) == 5


@pytest.mark.django_db
class TestQuantityTokenStripping:
    """Matcher strips leading quantity/unit tokens when the parser failed."""

    def test_liter_prefixed_name_matched(self):
        make_ingredient(name="Orangensaft")
        result = IngredientMatcher.match("1 Liter Orangensaft")
        assert result.ingredient_id is not None
        assert result.name == "Orangensaft"
        assert result.technical_details.get("parsed_quantity") == 1.0
        assert result.technical_details.get("parsed_unit") == "Liter"

    def test_quantity_without_unit_stripped(self):
        make_ingredient(name="Fladenbrot")
        result = IngredientMatcher.match("2 Fladenbrot")
        assert result.ingredient_id is not None
        assert result.name == "Fladenbrot"
        assert result.technical_details.get("parsed_quantity") == 2.0

    def test_quantity_word_stripped(self):
        make_ingredient(name="Rohrzucker")
        result = IngredientMatcher.match("etwas Rohrzucker brauner")
        # Grey zone (Rohrzucker 0.5) — the candidate must be offered
        assert result.needs_review is True
        candidate_names = [c.name for c in result.candidates]
        assert "Rohrzucker" in candidate_names

    def test_no_leading_token_not_stripped(self):
        make_ingredient(name="Orangensaft 100%")
        result = IngredientMatcher.match("Orangensaft 100%")
        assert result.ingredient_id is not None
        assert result.name == "Orangensaft 100%"
        assert "parsed_quantity" not in result.technical_details

    def test_bare_unit_prefix_stripped(self):
        make_ingredient(name="Orangensaft")
        result = IngredientMatcher.match("Liter Orangensaft")
        assert result.ingredient_id is not None
        assert result.name == "Orangensaft"
        assert result.technical_details.get("parsed_unit") == "Liter"

    def test_real_name_with_unit_prefix_not_cut(self):
        make_ingredient(name="Glasnudeln")
        result = IngredientMatcher.match("Glasnudeln")
        assert result.ingredient_id is not None
        assert result.name == "Glasnudeln"
        assert "parsed_unit" not in result.technical_details

    def test_strip_helper_returns_none_without_prefix(self):
        assert IngredientMatcher._strip_quantity_unit("Orangensaft 100%") is None


@pytest.mark.django_db
class TestCascading:
    """Full cascading pipeline through all stages."""

    def test_stage2_definitive_when_stage1_fails(self):
        ing = make_ingredient(name="Champignon")

        def stage2_match(clean_name, raw_name, note, candidate_qs):
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

        def stage3_match(clean_name, note, candidate_qs):
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
