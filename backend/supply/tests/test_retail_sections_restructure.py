"""Tests for retail section catalog v2: consistency, mapping and bulk reclassification."""

import json
from pathlib import Path

import pytest

from supply.data.retail_sections import RETAIL_SECTION_NAMES, RETAIL_SECTIONS
from supply.services.retail_section_mapping import KEYWORD_TO_RETAIL_SECTION_NAME, _match_keywords

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "data" / "masterdata" / "supply_retailsection.json"


class TestCatalogConsistency:
    def test_mapping_targets_are_subset_of_catalog(self):
        assert set(KEYWORD_TO_RETAIL_SECTION_NAME.values()) <= RETAIL_SECTION_NAMES

    def test_fixture_names_are_subset_of_catalog(self):
        fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        assert {entry["fields"]["name"] for entry in fixture} <= RETAIL_SECTION_NAMES

    def test_catalog_splits_coarse_groups(self):
        assert {"Obst", "Gemüse", "Käse", "Wurst & Aufschnitt", "Säfte & Smoothies"} <= RETAIL_SECTION_NAMES
        assert "Milchprodukte & Käse" not in RETAIL_SECTION_NAMES

    def test_catalog_names_are_unique_and_ranked(self):
        names = [entry["name"] for entry in RETAIL_SECTIONS]
        assert len(names) == len(set(names))
        assert all(entry["rank"] > 0 for entry in RETAIL_SECTIONS)


class TestDescriptionKeywords:
    @pytest.mark.parametrize("keyword", ["BIER", "SEKT", "SPIRITUOSE", "LIKÖR"])
    def test_alcohol(self, keyword):
        assert _match_keywords(keyword) == "Alkoholische Getränke"

    def test_juice_is_not_soft_drink(self):
        assert _match_keywords("SAFT") == "Säfte & Smoothies"

    def test_tofu(self):
        assert _match_keywords("TOFU") == "Fleischersatz & Tofu"


@pytest.mark.django_db
class TestReclassifyCommand:
    @pytest.fixture(autouse=True)
    def _catalog(self):
        from supply.models import RetailSection

        for entry in RETAIL_SECTIONS:
            RetailSection.objects.get_or_create(name=entry["name"], defaults={"rank": entry["rank"]})

    def _call(self, **kwargs):
        from django.core.management import call_command

        call_command("reclassify_retail_sections", **kwargs)

    def test_dry_run_changes_nothing(self):
        from supply.tests import make_legacy_ingredient

        # Legacy row without a section; the import gate would assign one on create.
        ing = make_legacy_ingredient("Orangensaft")
        self._call()
        ing.refresh_from_db()
        assert ing.retail_section is None

    def test_apply_reassigns_and_marks_rule_source(self):
        from supply.models import Ingredient, RetailSection

        wrong = RetailSection.objects.get(name="Obst")
        ing = Ingredient.objects.create(name="Orangensaft", retail_section=wrong)
        self._call(apply=True)
        ing.refresh_from_db()
        assert ing.retail_section.name == "Säfte & Smoothies"
        assert ing.retail_section_source == "rule"

    def test_manual_assignment_is_kept(self):
        from supply.models import Ingredient, RetailSection

        chosen = RetailSection.objects.get(name="Obst")
        ing = Ingredient.objects.create(name="Orangensaft", retail_section=chosen, retail_section_source="manual")
        self._call(apply=True)
        ing.refresh_from_db()
        assert ing.retail_section_id == chosen.id
