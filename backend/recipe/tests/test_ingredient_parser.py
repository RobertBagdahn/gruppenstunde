"""Tests for IngredientNameParser — rule-based, Jaccard fallback, Gemini fallback."""

from unittest.mock import MagicMock, patch

import pytest

from recipe.services.ingredient_parser import IngredientNameParser, ParsedIngredient
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestParseRuleBased:
    """Rule-based parsing: quantity/unit extraction and modifier splitting."""

    def test_simple_name_no_modifiers(self):
        result = IngredientNameParser.parse("Salz")
        assert result.name == "Salz"
        assert result.note == ""
        assert result.quantity == 0
        assert result.unit == ""

    def test_quantity_and_unit_parsed(self):
        make_ingredient(name="Mehl")
        result = IngredientNameParser.parse("200g Mehl")
        assert result.quantity == 200
        assert result.unit == "g"
        assert result.name == "Mehl"
        assert result.note == ""

    def test_quantity_with_explicit_unit_stueck(self):
        make_ingredient(name="Fladenbrot")
        result = IngredientNameParser.parse("2 Stück Fladenbrot")
        assert result.quantity == 2
        assert result.unit == "Stück"
        assert result.name == "Fladenbrot"

    def test_state_modifier_extracted(self):
        make_ingredient(name="Fladenbrot")
        result = IngredientNameParser.parse("Fladenbrot frisch")
        assert result.name == "Fladenbrot"
        assert result.note == "frisch"

    def test_color_modifier_extracted(self):
        make_ingredient(name="Zwiebel")
        result = IngredientNameParser.parse("rote Zwiebel")
        assert result.name == "Zwiebel"
        assert result.note == "rote"

    def test_prep_modifier_extracted(self):
        make_ingredient(name="Zwiebel")
        result = IngredientNameParser.parse("Zwiebel gehackt")
        assert result.name == "Zwiebel"
        assert result.note == "gehackt"

    def test_multi_word_ingredient_with_container_preserved(self):
        result = IngredientNameParser.parse("Tomaten aus der Dose")
        assert result.name == "Tomaten aus der Dose"
        assert result.note == ""

    def test_modifier_not_in_db_still_split(self):
        make_ingredient(name="Zwiebel")
        result = IngredientNameParser.parse("Zwiebel frisch")
        assert result.name == "Zwiebel"
        assert result.note == "frisch"

    def test_quantity_with_modifier(self):
        make_ingredient(name="Fladenbrot")
        result = IngredientNameParser.parse("2 Stück Fladenbrot frisch")
        assert result.quantity == 2
        assert result.unit == "Stück"
        assert result.name == "Fladenbrot"
        assert result.note == "frisch"

    def test_quantity_unit_with_modifier(self):
        make_ingredient(name="Mehl")
        result = IngredientNameParser.parse("500g Mehl geschnitten")
        assert result.quantity == 500
        assert result.unit == "g"
        assert result.name == "Mehl"
        assert result.note == "geschnitten"

    def test_confidence_1_when_ingredient_in_db(self):
        make_ingredient(name="Mehl")
        result = IngredientNameParser.parse("200g Mehl")
        assert result.confidence == 1.0

    def test_rule_based_confidence_0_5_when_ingredient_not_in_db(self):
        result = IngredientNameParser._parse_rule_based("200g Exotisch")
        assert result is not None
        assert result.confidence == 0.5
        assert result.name == "Exotisch"

    def test_comma_decimal_quantity(self):
        make_ingredient(name="Mehl")
        result = IngredientNameParser.parse("0,5kg Mehl")
        assert result.quantity == 0.5
        assert result.unit == "kg"
        assert result.name == "Mehl"

    def test_el_unit(self):
        make_ingredient(name="Öl")
        result = IngredientNameParser.parse("1 EL Öl")
        assert result.quantity == 1
        assert result.unit == "EL"
        assert result.name == "Öl"

    def test_name_stays_raw_when_unrecognized(self):
        result = IngredientNameParser.parse("etwas Pfeffer")
        assert result.name == "etwas Pfeffer"
        assert result.note == ""
        assert result.quantity == 0


@pytest.mark.django_db
class TestParseJaccardFallback:
    """Jaccard fallback when rule-based doesn't reach confidence 0.9."""

    def test_jaccard_finds_match_with_word_overlap(self):
        make_ingredient(name="Mehl")
        result = IngredientNameParser.parse("Mehl gesalzen")
        assert result.name == "Mehl"
        assert result.confidence == 0.5

    def test_jaccard_no_match_falls_back(self):
        make_ingredient(name="Unrelated")

        with patch.object(IngredientNameParser, "_parse_gemini", return_value=None):
            result = IngredientNameParser.parse("xyz123 ganz komisch")
            assert result.confidence == 0.0


@pytest.mark.django_db
class TestParseGeminiFallback:
    """Gemini fallback parsing."""

    def test_gemini_parses_successfully(self):
        mock_response = MagicMock()
        mock_response.text = '{"name":"Grüner Salat","note":"mit Kräutern","quantity":0,"unit":""}'

        with patch("core.services.gemini.gemini_call", return_value=(mock_response, None)):
            result = IngredientNameParser.parse("xyzxyz grün rot gehackt")
            assert result.confidence == 0.8

    def test_gemini_returns_none_gracefully(self):
        with patch("core.services.gemini.gemini_call", return_value=(None, None)):
            result = IngredientNameParser.parse("xyzxyz grün rot gehackt")
            assert result.confidence == 0.0
