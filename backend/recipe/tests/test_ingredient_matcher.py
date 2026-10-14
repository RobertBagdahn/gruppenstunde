"""Tests for IngredientMatcher — exact stage, scored index stage, embedding and human fallback."""

from unittest.mock import patch

import pytest

from recipe.services.ingredient_matcher import IngredientMatcher, MatchCandidate, MatchResult
from supply.tests import make_ingredient

# Gemini fallbacks (parser, enrichment, embeddings) are incidental here; keep them offline.
pytestmark = pytest.mark.usefixtures("gemini_unavailable")


@pytest.mark.django_db
class TestExactStage:
    def test_exact_match_returns_definitive_result(self):
        ing = make_ingredient(name="Fladenbrot", usage_count=42)
        result = IngredientMatcher.match("Fladenbrot")
        assert result.ingredient_id == ing.id
        assert result.matched_via == "exact"
        assert result.confidence == 1.0
        assert result.needs_review is False

    def test_exact_match_preferred_over_higher_usage_partial_match(self):
        exact = make_ingredient(name="Zwiebeln", usage_count=15)
        make_ingredient(name="Zwiebeln rot", usage_count=100)
        make_ingredient(name="Zwiebeln frisch", usage_count=50)
        result = IngredientMatcher.match("Zwiebeln")
        assert result.ingredient_id == exact.id
        assert result.confidence == 1.0
        assert result.needs_review is False

    def test_soft_specifier_is_kept_as_note(self):
        make_ingredient(name="Fladenbrot")
        result = IngredientMatcher.match("Fladenbrot frisch")
        assert result.name == "Fladenbrot"
        assert result.note == "frisch"

    def test_hard_specifier_does_not_fall_back_to_the_bare_name(self):
        make_ingredient(name="Zwiebel", usage_count=50)
        red = make_ingredient(name="Rote Zwiebel", usage_count=2)
        result = IngredientMatcher.match("Zwiebel (rot)")
        assert result.ingredient_id == red.id

    def test_exact_match_carries_candidate(self):
        ing = make_ingredient(name="Orangensaft")
        result = IngredientMatcher.match("Orangensaft")
        assert result.ingredient_id == ing.id
        assert len(result.candidates) == 1
        assert result.candidates[0].slug == ing.slug
        assert result.candidates[0].confidence == 1.0

    def test_excluded_ingredient_is_never_matched(self):
        make_ingredient(name="Salz und Pfeffer", exclude_from_matching=True)
        result = IngredientMatcher.match("Salz und Pfeffer")
        assert result.ingredient_id is None
        assert all(candidate.name != "Salz und Pfeffer" for candidate in result.candidates)


@pytest.mark.django_db
class TestIndexStage:
    def test_plural_and_word_order(self):
        almonds = make_ingredient(name="Gemahlene Mandeln")
        result = IngredientMatcher.match("Mandel(n) (gemahlen)")
        assert result.ingredient_id == almonds.id
        assert result.matched_via == "index"

    def test_compound_with_generic_tail(self):
        feta = make_ingredient(name="Feta")
        make_ingredient(name="Feta-Creme")
        result = IngredientMatcher.match("Feta-Käse")
        assert result.ingredient_id == feta.id

    def test_compound_split_against_catalog_words(self):
        balsamic = make_ingredient(name="Weißer Balsamicoessig")
        make_ingredient(name="Balsamico-Creme")
        result = IngredientMatcher.match("Balsamicoessig weiß")
        assert result.ingredient_id == balsamic.id

    def test_conflicting_feature_is_never_selected(self):
        make_ingredient(name="Hefe (frisch)", usage_count=20)
        dry = make_ingredient(name="Trockenhefe", usage_count=1)
        result = IngredientMatcher.match("Hefe (Trockenhefe)")
        assert result.ingredient_id == dry.id

    def test_conflict_through_alias_inherits_ingredient_features(self):
        from supply.models import IngredientAlias

        medium = make_ingredient(name="mittelscharfer Senf", usage_count=13)
        IngredientAlias.objects.create(ingredient=medium, name="Senf")
        result = IngredientMatcher.match("Senf, süßer")
        assert result.ingredient_id is None

    def test_generic_ingredient_when_the_variety_is_missing(self):
        olives = make_ingredient(name="Oliven")
        result = IngredientMatcher.match("Oliven (schwarz)")
        assert result.ingredient_id == olives.id
        assert result.needs_review is True

    def test_candidate_with_extra_word_is_not_preselected(self):
        make_ingredient(name="Vegane Fleischwurst")
        result = IngredientMatcher.match("Fleischwurst")
        assert result.ingredient_id is None
        assert [candidate.name for candidate in result.candidates] == ["Vegane Fleischwurst"]

    def test_partial_compound_does_not_match_its_head(self):
        make_ingredient(name="Milch", status="verified")
        result = IngredientMatcher.match("Kokosmilch")
        assert result.ingredient_id is None

    def test_verified_candidate_wins_a_tie(self):
        make_ingredient(name="Mozzarella Bio", status="draft", usage_count=0)
        verified = make_ingredient(name="Mozzarella aus Kuhmilch", status="verified", usage_count=4)
        result = IngredientMatcher.match("Mozzarella")
        assert result.ingredient_id == verified.id

    def test_typo_is_matched_for_review(self):
        mushrooms = make_ingredient(name="Champignons")
        result = IngredientMatcher.match("Champninons")
        assert result.ingredient_id == mushrooms.id
        assert result.needs_review is True

    def test_grey_zone_candidates_have_slug(self):
        make_ingredient(name="Zwiebelpulver", usage_count=100)
        make_ingredient(name="Zwiebelsuppe", usage_count=50)
        result = IngredientMatcher.match("Zwiebel")
        assert result.ingredient_id is None
        assert result.needs_review is True
        assert len(result.candidates) >= 2
        assert all(candidate.slug for candidate in result.candidates)


@pytest.mark.django_db
class TestHumanDialog:
    def test_no_match_returns_needs_review(self):
        with patch.object(IngredientMatcher, "_stage_embedding", return_value=None):
            result = IngredientMatcher.match("Freekeh")
        assert result.needs_review is True
        assert result.matched_via == "new"
        assert result.confidence == 0.0
        assert result.ingredient_id is None
        assert result.candidates == []

    def test_embedding_runs_when_nothing_else_matches(self):
        ing = make_ingredient(name="Rindergehacktes")

        def embedding_stage(clean_name, note, candidate_qs):
            return MatchResult(
                needs_review=True,
                name=clean_name,
                matched_via="embed",
                note=note,
                candidates=[MatchCandidate(id=ing.id, name=ing.name, slug=ing.slug, confidence=0.75)],
            )

        with patch.object(IngredientMatcher, "_stage_embedding", side_effect=embedding_stage):
            result = IngredientMatcher.match("Rinderhack")
        assert result.matched_via == "embed"
        assert result.ingredient_id is None
        assert result.candidates[0].id == ing.id


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
class TestAmountsInTheName:
    """The matcher parses raw lines itself when the caller passes no parse."""

    def test_liter_prefixed_name_matched(self):
        make_ingredient(name="Orangensaft")
        result = IngredientMatcher.match("1 Liter Orangensaft")
        assert result.name == "Orangensaft"
        assert result.technical_details.get("parsed_quantity") == 1.0
        assert result.technical_details.get("parsed_unit") == "l"

    def test_quantity_without_unit_stripped(self):
        make_ingredient(name="Fladenbrot")
        result = IngredientMatcher.match("2 Fladenbrot")
        assert result.name == "Fladenbrot"
        assert result.technical_details.get("parsed_quantity") == 2.0

    def test_name_with_percentage_is_not_cut(self):
        make_ingredient(name="Orangensaft 100%")
        result = IngredientMatcher.match("Orangensaft 100%")
        assert result.name == "Orangensaft 100%"
        assert "parsed_quantity" not in result.technical_details

    def test_real_name_with_unit_prefix_not_cut(self):
        make_ingredient(name="Glasnudeln")
        result = IngredientMatcher.match("Glasnudeln")
        assert result.name == "Glasnudeln"
        assert "parsed_unit" not in result.technical_details

    def test_parsed_line_is_not_parsed_again(self):
        from recipe.services.ingredient_line import parse_line

        quark = make_ingredient(name="Speisequark 20%")
        parsed = parse_line("250 g Quark (20 %)")
        result = IngredientMatcher.match(parsed.query, parsed=parsed)
        assert result.ingredient_id == quark.id
