"""Tests for the retail section mapping service."""

import pytest

from supply.services.retail_section_mapping import (
    KEYWORD_TO_RETAIL_SECTION_NAME,
    _match_keywords,
    get_retail_section,
    get_retail_section_from_description,
    get_retail_section_from_name,
)


class TestMatchKeywords:
    """Test the keyword matching logic (no DB needed)."""

    def test_exact_match(self):
        assert _match_keywords("SCHOKOLADE BIS 100 G") == "Süßwaren & Snacks"

    def test_substring_match(self):
        assert _match_keywords("ITALIENISCHE TEIGWAREN") == "Nudeln & Reis & Getreide"

    def test_no_match(self):
        assert _match_keywords("UNKNOWN CATEGORY XYZ") is None

    def test_longer_keyword_preferred(self):
        # "OLIVENÖL" should match before "ÖL"
        assert _match_keywords("OLIVENÖL NATIV") == "Öle & Soßen"

    def test_essig(self):
        assert _match_keywords("ESSIG") == "Öle & Soßen"

    def test_balsamic(self):
        assert _match_keywords("BALSAMIC") == "Öle & Soßen"

    def test_balsamico(self):
        assert _match_keywords("BALSAMICO") == "Öle & Soßen"

    def test_nudel(self):
        assert _match_keywords("NUDELN ROH") == "Nudeln & Reis & Getreide"

    def test_pfeffer(self):
        assert _match_keywords("PFEFFER") == "Gewürze & Kräuter"

    def test_tomaten(self):
        assert _match_keywords("TOMATEN") == "Gemüse"

    def test_dose_konserve(self):
        # "GEMUESE" is longer match than "DOSE", so Gemüse wins
        assert _match_keywords("GEMUESE DOSE") == "Gemüse"

    def test_tk(self):
        assert _match_keywords("TK-PIZZA") == "Tiefkühl"

    def test_joghurt(self):
        assert _match_keywords("FRUCHTJOGHURT EINWEG") == "Milchprodukte"

    def test_kaese(self):
        assert _match_keywords("KÄSE SCHEIBEN") == "Milchprodukte & Käse"

    def test_fleisch(self):
        assert _match_keywords("HÄHNCHEN FILET") == "Fleisch & Fisch"

    def test_wurst(self):
        assert _match_keywords("DAUERWURST SB") == "Fleisch & Wurst"

    def test_mehl(self):
        assert _match_keywords("MEHL") == "Grundnahrungsmittel"

    def test_empty_string(self):
        assert _match_keywords("") is None


class TestGetRetailSectionFromDescription:
    """Test description parsing (no DB needed for the parsing part)."""

    def test_extracts_last_segment(self):
        # This tests the parsing logic; actual DB lookup tested in integration
        desc = "Barilla Pesto - BARILLA - Pesto alla Genovese - PESTO"
        # Should try "PESTO" → matches "PESTO" → "Öle & Soßen"
        # But we can't test the full function without DB, so test parsing indirectly
        parts = desc.split(" - ")
        assert parts[-1] == "PESTO"
        assert _match_keywords(parts[-1].upper()) == "Öle & Soßen"

    def test_rewe_description_chocolate(self):
        desc = "Ritter Sport - RITTER SPORT - Nuss Klasse - SCHOKOLADE UEBER 100 G"
        parts = desc.split(" - ")
        assert _match_keywords(parts[-1].upper()) == "Süßwaren & Snacks"

    def test_rewe_description_nudeln(self):
        desc = "Barilla Spaghetti 500g - BARILLA - Spaghetti - ITALIENISCHE TEIGWAREN"
        parts = desc.split(" - ")
        assert _match_keywords(parts[-1].upper()) == "Nudeln & Reis & Getreide"

    def test_empty_description(self):
        # Without DB, just verify it returns None for empty
        # Full function needs DB, so we test the logic
        assert get_retail_section_from_description("") is None

    def test_no_dash_separator(self):
        # Single segment — tries full text
        assert _match_keywords("SCHOKOLADE") == "Süßwaren & Snacks"


class TestGetRetailSectionFromName:
    """Test name-based matching (no DB needed for keyword part)."""

    def test_balsamic_essig(self):
        assert _match_keywords("BALSAMIC ESSIG") == "Öle & Soßen"

    def test_nudeln_roh(self):
        assert _match_keywords("NUDELN, ROH") == "Nudeln & Reis & Getreide"

    def test_haehnchenfleisch(self):
        assert _match_keywords("HÄHNCHENFLEISCH") == "Fleisch & Fisch"

    def test_cocktail_tomate(self):
        # "TOMATE" matches now (singular)
        assert _match_keywords("COCKTAIL TOMATE") == "Gemüse"

    def test_schafskaese(self):
        assert _match_keywords("SCHAFSKAESE") == "Milchprodukte & Käse"
        assert _match_keywords("SCHAFSKÄSE") == "Milchprodukte & Käse"

    def test_pflanzenoel(self):
        assert _match_keywords("PFLANZENOEL") == "Öle & Soßen"
        assert _match_keywords("PFLANZENÖL") == "Öle & Soßen"

    def test_muesli(self):
        assert _match_keywords("MÜSLI") == "Grundnahrungsmittel"
        assert _match_keywords("MUESLI") == "Grundnahrungsmittel"

    def test_sojasosse(self):
        # "SOJASOSSE" contains "SAUCE"? No. Let's check
        # Actually "SOJASOSSE" doesn't contain "SAUCE" but we have "SOJASOSSE" keyword
        assert _match_keywords("SOJASOSSE") == "Öle & Soßen"

    def test_weizenmehl(self):
        assert _match_keywords("WEIZENMEHL") == "Grundnahrungsmittel"

    def test_trockenhefe(self):
        assert _match_keywords("TROCKENHEFE") == "Grundnahrungsmittel"

    def test_fruehlingszwiebel(self):
        assert _match_keywords("FRÜHLINGSZWIEBEL") == "Gemüse"

    def test_doppelkeks(self):
        # "KEKS" should match
        assert _match_keywords("DOPPELKEKS") == "Brot & Backwaren"

    def test_bionella(self):
        # "BIONELLA" — no obvious keyword match
        assert _match_keywords("BIONELLA") is None


@pytest.mark.django_db
class TestGetRetailSectionIntegration:
    """Integration tests that require DB access."""

    @pytest.fixture(autouse=True)
    def setup_retail_sections(self):
        from supply.models import RetailSection

        # Clear lru_cache
        from supply.services.retail_section_mapping import _get_retail_section_by_name

        _get_retail_section_by_name.cache_clear()

        # Create required retail sections
        self.rs_oele = RetailSection.objects.get_or_create(name="Öle & Soßen", defaults={"rank": 1})[0]
        self.rs_gemuese = RetailSection.objects.get_or_create(name="Gemüse", defaults={"rank": 2})[0]
        self.rs_nudeln = RetailSection.objects.get_or_create(name="Nudeln & Reis & Getreide", defaults={"rank": 3})[0]
        self.rs_suess = RetailSection.objects.get_or_create(name="Süßwaren & Snacks", defaults={"rank": 4})[0]
        self.rs_grund = RetailSection.objects.get_or_create(name="Grundnahrungsmittel", defaults={"rank": 5})[0]

    def test_get_retail_section_from_description(self):
        desc = "Barilla Pesto - BARILLA - Pesto - PESTO"
        result = get_retail_section_from_description(desc)
        assert result == self.rs_oele

    def test_get_retail_section_from_name_fallback(self):
        result = get_retail_section("Balsamic Essig", "")
        assert result == self.rs_oele

    def test_get_retail_section_description_preferred(self):
        # Description match should take precedence over name
        result = get_retail_section("Nudeln", "Produkt - BRAND - SCHOKOLADE BIS 100 G")
        assert result == self.rs_suess

    def test_get_retail_section_no_match(self):
        result = get_retail_section("Bionella", "")
        assert result is None

    def test_get_retail_section_mehl(self):
        result = get_retail_section("Weizenmehl", "")
        assert result == self.rs_grund
