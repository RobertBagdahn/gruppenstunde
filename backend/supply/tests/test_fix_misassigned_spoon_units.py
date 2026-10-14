"""Tests for the fix_misassigned_spoon_units command."""

from io import StringIO

import pytest
from django.core.management import call_command

from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.fixture
def units():
    return {
        "spoon": make_measuring_unit(name="Esslöffel", quantity=10, unit="g"),
        "ml": make_measuring_unit(name="Milliliter", quantity=1, unit="ml"),
        "liter": make_measuring_unit(name="Liter", quantity=1000, unit="ml"),
    }


@pytest.mark.django_db
def test_dry_run_changes_nothing(units):
    ingredient = make_ingredient(name="Limettensaft Fix")
    portion = make_portion(ingredient, name="200 ml", quantity=200, weight_g=200, measuring_unit=units["spoon"])

    out = StringIO()
    call_command("fix_misassigned_spoon_units", stdout=out)

    portion.refresh_from_db()
    assert portion.measuring_unit_id == units["spoon"].id
    assert "Dry run: 1" in out.getvalue()


@pytest.mark.django_db
def test_apply_reassigns_metric_portions_only(units):
    ingredient = make_ingredient(name="Limettensaft Fix")
    millilitres = make_portion(ingredient, name="200 ml", quantity=200, weight_g=200, measuring_unit=units["spoon"])
    litre = make_portion(ingredient, name="1 Liter", quantity=1, weight_g=1000, measuring_unit=units["spoon"], rank=3)
    spoon = make_portion(ingredient, name="1 EL (10ml)", quantity=1, weight_g=10, measuring_unit=units["spoon"], rank=4)

    call_command("fix_misassigned_spoon_units", "--apply", stdout=StringIO())

    for portion in (millilitres, litre, spoon):
        portion.refresh_from_db()
    assert millilitres.measuring_unit_id == units["ml"].id
    assert litre.measuring_unit_id == units["liter"].id
    assert spoon.measuring_unit_id == units["spoon"].id
    assert millilitres.weight_g == 200
