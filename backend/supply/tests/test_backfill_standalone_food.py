"""Tests for the standalone-food backfill rules and command."""

from io import StringIO

import pytest
from django.core.management import call_command

from supply.models import Ingredient, RetailSection
from supply.services.standalone_food import is_standalone_candidate


@pytest.mark.parametrize(
    ("name", "section", "expected"),
    [
        ("Apfel", "Obst", True),
        ("Zitrone", "Obst", False),
        ("Karotte", "Gemüse", True),
        ("Ingwer", "Gemüse", False),
        ("Mineralwasser", "Wasser & Erfrischungsgetränke", True),
        ("Zitronensaft", "Wasser & Erfrischungsgetränke", False),
        ("Rotwein", "Wasser & Erfrischungsgetränke", False),
        ("Skyr", "Milch & Pflanzendrinks", True),
        ("Butter", "Milch & Pflanzendrinks", False),
        ("Buttermilch", "Milch & Pflanzendrinks", False),
        ("Gurkenwasser", "Wasser & Erfrischungsgetränke", False),
        ("Nudelkochwasser", "Wasser & Erfrischungsgetränke", False),
        ("Heißes Wasser", "Wasser & Erfrischungsgetränke", False),
        ("Schokolade (Vollmilch)", "Milch & Pflanzendrinks", False),
        ("Mandelmilch lauwarm", "Milch & Pflanzendrinks", False),
        ("Sojadrink", "Milch & Pflanzendrinks", True),
        ("Karotten geraspelt", "Gemüse", False),
        ("Mehl", "Brot & Backwaren", False),
        ("Apfel", None, False),
    ],
)
def test_is_standalone_candidate(name: str, section: str | None, expected: bool) -> None:
    assert is_standalone_candidate(name, section) is expected


def _make(name: str, section: str, status: str = "verified") -> Ingredient:
    rs, _ = RetailSection.objects.get_or_create(name=section, defaults={"rank": 1})
    return Ingredient.objects.create(name=name, retail_section=rs, status=status)


@pytest.mark.django_db
def test_dry_run_changes_nothing() -> None:
    apple = _make("Apfel", "Obst")
    out = StringIO()
    call_command("backfill_standalone_food", stdout=out)
    apple.refresh_from_db()
    assert apple.is_standalone_food is False
    assert "Apfel" in out.getvalue()


@pytest.mark.django_db
def test_apply_marks_only_verified_candidates() -> None:
    apple = _make("Apfel", "Obst")
    draft_pear = _make("Birne", "Obst", status="draft")
    butter = _make("Butter", "Milch & Pflanzendrinks")
    call_command("backfill_standalone_food", "--apply", stdout=StringIO())
    for obj in (apple, draft_pear, butter):
        obj.refresh_from_db()
    assert apple.is_standalone_food is True
    assert draft_pear.is_standalone_food is False
    assert butter.is_standalone_food is False


@pytest.mark.django_db
def test_include_drafts() -> None:
    draft_pear = _make("Birne", "Obst", status="draft")
    call_command("backfill_standalone_food", "--apply", "--include-drafts", stdout=StringIO())
    draft_pear.refresh_from_db()
    assert draft_pear.is_standalone_food is True
