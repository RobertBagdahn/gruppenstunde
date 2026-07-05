"""Tests for the retail-sections-restructure change.

Covers:
- Consistency: mapping targets and fixture names are subsets of RETAIL_SECTIONS.
- Alcohol keyword assignment (Bier/Sekt -> Alkoholische Getränke, Saft -> Alkoholfreie Getränke).
- New disambiguation groups (Fleischersatz, TK Fertiggerichte, Fisch vs. Fleisch & Wurst).
- restructure_retail_sections management command: rename, catalog sync, re-mapping,
  alcohol-misassignment fix, no ingredient left without a retail_section.
- Catalog has no duplicate/legacy names and no rank=0 entries.
"""

import json
from pathlib import Path

import pytest

from supply.data.retail_sections import RETAIL_SECTIONS, RETAIL_SECTION_NAMES
from supply.services.retail_section_mapping import KEYWORD_TO_RETAIL_SECTION_NAME, _match_keywords

FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "masterdata" / "supply_retailsection.json"
)


class TestCatalogConsistency:
    """4.1 — Konsistenz: Mapping-Ziele und Fixture-Namen sind Teilmenge des Katalogs."""

    def test_mapping_targets_are_subset_of_catalog(self):
        mapping_targets = set(KEYWORD_TO_RETAIL_SECTION_NAME.values())
        assert mapping_targets <= RETAIL_SECTION_NAMES

    def test_fixture_names_are_subset_of_catalog(self):
        fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        fixture_names = {entry["fields"]["name"] for entry in fixture}
        assert fixture_names <= RETAIL_SECTION_NAMES

    def test_catalog_has_no_duplicate_or_legacy_names(self):
        # These names existed in an earlier, inconsistent version of the
        # catalog and must not reappear (see design.md D1/D7).
        legacy_names = {"Fleisch & Fisch", "Gewürze", "Süßwaren & Snacks", "Kühlung", "Tiefkühl"}
        assert legacy_names.isdisjoint(RETAIL_SECTION_NAMES)

    def test_catalog_names_are_unique(self):
        names = [entry["name"] for entry in RETAIL_SECTIONS]
        assert len(names) == len(set(names))

    def test_no_rank_zero(self):
        assert all(entry["rank"] > 0 for entry in RETAIL_SECTIONS)


class TestAlcoholKeywordAssignment:
    """4.2 — Bier/Sekt -> Alkoholische Getränke; Saft -> Alkoholfreie Getränke."""

    @pytest.mark.parametrize("keyword", ["BIER", "SEKT", "SPIRITUOSE", "LIKÖR", "LIKOER"])
    def test_alcohol_keywords(self, keyword):
        assert _match_keywords(keyword) == "Alkoholische Getränke"

    @pytest.mark.parametrize("keyword", ["SAFT", "WASSER", "LIMONADE", "EISTEE", "SOFTDRINK", "NEKTAR"])
    def test_non_alcoholic_keywords(self, keyword):
        assert _match_keywords(keyword) == "Alkoholfreie Getränke"


class TestDisambiguationGroups:
    """4.3 — Beispiel-Keywords für die neuen Gruppen."""

    def test_linsen_to_huelsenfruechte(self):
        assert _match_keywords("LINSEN") == "Hülsenfrüchte & Nüsse"

    def test_tofu_to_fleischersatz(self):
        assert _match_keywords("TOFU") == "Fleischersatz"

    def test_seitan_to_fleischersatz(self):
        assert _match_keywords("SEITAN") == "Fleischersatz"

    def test_sushi_to_fisch(self):
        assert _match_keywords("SUSHI") == "Fisch"

    def test_pizza_to_tk_fertiggerichte(self):
        assert _match_keywords("PIZZA") == "TK Fertiggerichte"

    def test_pommes_to_tk_obst_gemuese(self):
        assert _match_keywords("POMMES") == "TK Obst & Gemüse"

    def test_asia_to_gewuerze_kraeuter(self):
        assert _match_keywords("ASIA") == "Gewürze & Kräuter"


@pytest.mark.django_db
class TestRestructureRetailSectionsCommand:
    """4.4/4.5 — Idempotenter Command: Umbenennung, Katalog-Sync, Re-Mapping, Alkohol-Fix."""

    @pytest.fixture(autouse=True)
    def _clear_lookup_cache(self):
        from supply.services.retail_section_mapping import _get_retail_section_by_name

        _get_retail_section_by_name.cache_clear()
        yield
        _get_retail_section_by_name.cache_clear()

    def _call(self, **kwargs):
        from django.core.management import call_command

        call_command("restructure_retail_sections", **kwargs)

    def test_renames_legacy_getraenke(self):
        from supply.models import Ingredient, RetailSection

        legacy = RetailSection.objects.create(name="Getränke", rank=0)
        ing = Ingredient.objects.create(name="Apfelsaft", retail_section=legacy)

        self._call()

        legacy.refresh_from_db()
        ing.refresh_from_db()
        assert legacy.name == "Alkoholfreie Getränke"
        assert ing.retail_section_id == legacy.id

    def test_creates_missing_catalog_groups_with_rank(self):
        from supply.models import RetailSection

        self._call()

        names = set(RetailSection.objects.values_list("name", flat=True))
        assert RETAIL_SECTION_NAMES <= names
        sonstiges = RetailSection.objects.get(name="Sonstiges")
        assert sonstiges.rank == 22

    def test_remaps_unassigned_ingredients_with_fallback_to_sonstiges(self):
        from supply.models import Ingredient

        Ingredient.objects.create(name="Bier Pils", retail_section=None)
        Ingredient.objects.create(name="Voll unbekanntes Zeug Xyzzy", retail_section=None)

        self._call()

        beer = Ingredient.objects.get(name="Bier Pils")
        unknown = Ingredient.objects.get(name="Voll unbekanntes Zeug Xyzzy")
        assert beer.retail_section.name == "Alkoholische Getränke"
        assert unknown.retail_section.name == "Sonstiges"

    def test_no_ingredient_without_retail_section_after_run(self):
        from supply.models import Ingredient

        Ingredient.objects.create(name="Irgendwas Unbekanntes 123", retail_section=None)

        self._call()

        assert not Ingredient.objects.filter(retail_section__isnull=True).exists()

    def test_fixes_alcohol_misassigned_to_alkoholfreie_getraenke(self):
        from supply.models import Ingredient, RetailSection

        alkoholfrei = RetailSection.objects.create(name="Alkoholfreie Getränke", rank=16)
        RetailSection.objects.create(name="Alkoholische Getränke", rank=17)
        ing = Ingredient.objects.create(name="Weizenbier", retail_section=alkoholfrei)

        self._call()

        ing.refresh_from_db()
        assert ing.retail_section.name == "Alkoholische Getränke"

    def test_idempotent_dry_run_changes_nothing(self):
        from supply.models import Ingredient, RetailSection

        RetailSection.objects.create(name="Getränke", rank=0)
        ing = Ingredient.objects.create(name="Bionella Unbekannt", retail_section=None)

        self._call(dry_run=True)

        assert RetailSection.objects.filter(name="Getränke").exists()
        ing.refresh_from_db()
        assert ing.retail_section is None

    def test_second_run_is_a_noop(self):
        from supply.models import Ingredient

        Ingredient.objects.create(name="Bionella Unbekannt", retail_section=None)

        self._call()
        first_pass_ids = set(Ingredient.objects.values_list("retail_section_id", flat=True))

        self._call()  # second run should not change anything further
        second_pass_ids = set(Ingredient.objects.values_list("retail_section_id", flat=True))
        assert first_pass_ids == second_pass_ids
