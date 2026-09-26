"""Tests for the retail section mapping service (catalog v2)."""

import pytest

from supply.services.retail_section_mapping import (
    _match_keywords,
    get_retail_section,
    get_retail_section_from_description,
)


class TestMatchKeywords:
    """REWE category keywords resolve onto catalog v2 names."""

    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("SCHOKOLADE BIS 100 G", "Süßwaren & Kekse"),
            ("ITALIENISCHE TEIGWAREN", "Nudeln"),
            ("OLIVENÖL NATIV", "Öle & Essig"),
            ("BALSAMIC ESSIG", "Öle & Essig"),
            ("PFEFFER", "Gewürze & Trockenkräuter"),
            ("TOMATEN", "Gemüse"),
            ("FRUCHTJOGHURT EINWEG", "Joghurt, Quark & Desserts"),
            ("KÄSE SCHEIBEN", "Käse"),
            ("DAUERWURST SB", "Wurst & Aufschnitt"),
            ("MEHL", "Mehl, Zucker & Backzutaten"),
            ("MÜSLI", "Müsli & Cerealien"),
            ("PESTO", "Saucen & Würzsaucen"),
        ],
    )
    def test_keywords(self, text, expected):
        assert _match_keywords(text) == expected

    def test_no_match(self):
        assert _match_keywords("UNKNOWN CATEGORY XYZ") is None


@pytest.mark.django_db
class TestGetRetailSectionIntegration:
    @pytest.fixture(autouse=True)
    def setup_sections(self):
        from supply.models import RetailSection

        self.oele = RetailSection.objects.create(name="Öle & Essig", rank=23)
        self.saucen = RetailSection.objects.create(name="Saucen & Würzsaucen", rank=24)
        self.suess = RetailSection.objects.create(name="Süßwaren & Kekse", rank=28)
        self.nudeln = RetailSection.objects.create(name="Nudeln", rank=15)
        self.backen = RetailSection.objects.create(name="Mehl, Zucker & Backzutaten", rank=20)

    def test_from_description(self):
        assert get_retail_section_from_description("Barilla Pesto - BARILLA - Pesto - PESTO") == self.saucen

    def test_name_classifier_is_authoritative(self):
        assert get_retail_section("Nudeln", "Produkt - BRAND - SCHOKOLADE BIS 100 G") == self.nudeln

    def test_description_is_fallback(self):
        assert get_retail_section("Bionella", "Produkt - BRAND - SCHOKOLADE BIS 100 G") == self.suess

    def test_name_match(self):
        assert get_retail_section("Balsamico Essig", "") == self.oele
        assert get_retail_section("Weizenmehl", "") == self.backen

    def test_no_match(self):
        assert get_retail_section("Bionella", "") is None
