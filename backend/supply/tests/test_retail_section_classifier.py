"""Tests for the compound-aware retail section classifier (catalog v2)."""

import pytest

from supply.data.retail_sections import LEGACY_SECTION_ALIASES, RETAIL_SECTION_NAMES, resolve_section_name
from supply.services.retail_section_classifier import _KEYWORDS, classify_retail_section


def section(name: str) -> str | None:
    result = classify_retail_section(name)
    return result.section if result else None


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Orangensaft", "Säfte & Smoothies"),
        ("Apfel", "Obst"),
        ("Fruchtjoghurt Banane", "Joghurt, Quark & Desserts"),
        ("Schokolade Espresso", "Süßwaren & Kekse"),
        ("Waffeln Zitronencreme", "Süßwaren & Kekse"),
        ("Aprikosen getrocknet ungeschwefelt", "Nüsse, Samen & Trockenobst"),
        ("Kichererbsen eingelegt (Dose)", "Konserven & Gläser"),
        ("Pizza Salami (TK)", "TK Fertiggerichte & Pizza"),
        ("Garnelen (TK)", "TK Fleisch & Fisch"),
        ("Erbsen (TK)", "TK Obst & Gemüse"),
        ("Vegane Frikadelle", "Fleischersatz & Tofu"),
        ("Koriander gemahlen", "Gewürze & Trockenkräuter"),
        ("Gehackte Mandeln", "Nüsse, Samen & Trockenobst"),
        ("Schokoladenteig", "Süßwaren & Kekse"),
        ("Thunfischfilet", "Fisch & Meeresfrüchte"),
        ("Bratensaft (Fix Trocken)", "Brühen, Suppen & Fertiggerichte"),
        ("Weiße Bohnen (Dose)", "Konserven & Gläser"),
        ("Eisbergsalat", "Salate & frische Kräuter"),
        ("Reis", "Reis & Getreide"),
        ("Ei", "Eier"),
        ("Spaghetti mit Tomatensauce (Fertiggericht)", "Brühen, Suppen & Fertiggerichte"),
    ],
)
def test_classifies_by_compound_head_and_markers(name, expected):
    assert section(name) == expected


def test_unknown_name_returns_none():
    assert classify_retail_section("Xyzzy Quux") is None
    assert classify_retail_section("") is None


def test_all_keyword_targets_are_catalog_sections():
    assert set(_KEYWORDS) <= RETAIL_SECTION_NAMES


def test_legacy_aliases_resolve_into_catalog():
    assert set(LEGACY_SECTION_ALIASES.values()) <= RETAIL_SECTION_NAMES
    assert resolve_section_name("Milchprodukte & Käse") in RETAIL_SECTION_NAMES
    assert resolve_section_name("Obst") == "Obst"
