"""Tests for the audit_ingredient_aliases command."""

from io import StringIO

import pytest
from django.core.management import call_command

from supply.models import IngredientAlias
from supply.tests import make_ingredient


@pytest.fixture
def aliases():
    fillet = make_ingredient(name="Hähnchenbrustfilet")
    salt = make_ingredient(name="Jodsalz")
    walnuts = make_ingredient(name="Walnusskerne")
    return {
        "chicken": IngredientAlias.objects.create(ingredient=fillet, name="Hähnchen"),
        "salt": IngredientAlias.objects.create(ingredient=salt, name="Salz"),
        "walnuts": IngredientAlias.objects.create(ingredient=walnuts, name="Walnüsse"),
    }


@pytest.mark.django_db
def test_dry_run_reports_front_part_aliases_only(aliases):
    out = StringIO()
    call_command("audit_ingredient_aliases", stdout=out)

    report = out.getvalue()
    assert "„Hähnchen“ → Hähnchenbrustfilet" in report
    assert "„Salz“" not in report
    assert "„Walnüsse“" not in report
    assert IngredientAlias.objects.filter(pk=aliases["chicken"].pk).exists()


@pytest.mark.django_db
def test_apply_removes_front_part_aliases(aliases):
    call_command("audit_ingredient_aliases", "--apply", stdout=StringIO())

    assert not IngredientAlias.objects.filter(pk=aliases["chicken"].pk).exists()
    assert IngredientAlias.objects.filter(pk=aliases["salt"].pk).exists()


@pytest.mark.django_db
def test_duplicate_generic_alias_is_reported():
    # Only generic aliases may repeat (unique constraint for the others).
    IngredientAlias.objects.create(ingredient=make_ingredient(name="Gouda"), name="Käse", is_generic=True)
    IngredientAlias.objects.create(ingredient=make_ingredient(name="Gouda jung"), name="Käse", is_generic=True)

    out = StringIO()
    call_command("audit_ingredient_aliases", stdout=out)

    assert "mehrfach vergeben: Gouda, Gouda jung" in out.getvalue()
