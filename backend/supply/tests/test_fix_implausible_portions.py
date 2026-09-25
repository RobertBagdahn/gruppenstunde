from io import StringIO

import pytest
from django.core.management import call_command

from recipe.models import Recipe, RecipeItem
from supply.management.commands.fix_implausible_portions import declared_grams, measure_violation
from supply.models import Ingredient, MeasuringUnit, Portion, RetailSection


@pytest.fixture
def unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1)


@pytest.fixture
def ingredient(db):
    return Ingredient.objects.create(name="Kichererbsen", slug="kichererbsen")


def _portion(ingredient, unit, name, weight):
    rank = Portion.objects.filter(ingredient=ingredient).count() + 1
    return Portion.objects.create(ingredient=ingredient, measuring_unit=unit, name=name, weight_g=weight, rank=rank)


def test_declared_grams_parsing():
    assert declared_grams("Dosen (à 400g)") == 400
    assert declared_grams("100g Milch (neu)") == 100
    assert declared_grams("1 Dose (285g abgetropft)") is None
    assert declared_grams("1 kg Packung (1000g)") is None
    assert declared_grams("Stück") is None


def test_measure_violation_bounds():
    assert measure_violation("EL", 100)
    assert measure_violation("EL", 10) is None
    assert measure_violation("Tassen", 1)
    assert measure_violation("Prise", 0.4) is None


def test_dry_run_changes_nothing(ingredient, unit):
    portion = _portion(ingredient, unit, "Dose", 1)
    call_command("fix_implausible_portions", stdout=StringIO())
    portion.refresh_from_db()
    assert portion.deleted_at is None


def test_apply_fixes_only_unreferenced_portions(ingredient, unit):
    declared = _portion(ingredient, unit, "Dosen (à 400g)", 1)
    impossible = _portion(ingredient, unit, "EL", 100)
    used = _portion(ingredient, unit, "Tasse", 1)
    fine = _portion(ingredient, unit, "Dose", 400)
    recipe = Recipe.objects.create(title="Hummus", slug="hummus")
    RecipeItem.objects.create(recipe=recipe, portion=used, quantity=2)

    out = StringIO()
    call_command("fix_implausible_portions", "--apply", stdout=out)

    for p in (declared, impossible, used, fine):
        p.refresh_from_db()
    assert declared.weight_g == 400 and declared.deleted_at is None
    assert impossible.deleted_at is not None
    assert used.deleted_at is None and used.weight_g == 1
    assert fine.deleted_at is None and fine.weight_g == 400
    assert "[PRÜFEN]" in out.getvalue()


def test_apply_merges_legacy_retail_sections(ingredient):
    target = RetailSection.objects.create(name="Brot & Backwaren")
    legacy = RetailSection.objects.create(name="Backwaren")
    ingredient.retail_section = legacy
    ingredient.save(update_fields=["retail_section"])

    call_command("fix_implausible_portions", "--apply", stdout=StringIO())

    ingredient.refresh_from_db()
    assert ingredient.retail_section == target
    assert not RetailSection.objects.filter(id=legacy.id).exists()
