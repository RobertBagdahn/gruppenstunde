"""Splitting recipe rows "Salz und Pfeffer" into two prise rows."""

from io import StringIO

import pytest
from django.core.management import call_command

from recipe.models import Recipe, RecipeItem
from supply.tests import make_ingredient, make_portion


@pytest.fixture
def seasoning_setup(db):
    combined = make_ingredient(name="Salz und Pfeffer", status="verified")
    combined_portion = make_portion(combined, name="Prise", quantity=1, weight_g=1, rank=1)
    salt = make_ingredient(name="Jodsalz", status="verified")
    pepper = make_ingredient(name="Gemahlener Pfeffer", status="verified")
    recipe = Recipe.objects.create(title="Gulasch", portions=1)
    item = RecipeItem.objects.create(
        recipe=recipe, portion=combined_portion, quantity=1, sort_order=3, note="nach Belieben"
    )
    return {"combined": combined, "salt": salt, "pepper": pepper, "recipe": recipe, "item": item}


@pytest.mark.django_db
def test_dry_run_changes_nothing(seasoning_setup):
    out = StringIO()
    call_command("split_combined_seasoning_items", stdout=out)

    assert RecipeItem.objects.filter(pk=seasoning_setup["item"].pk).exists()
    assert "Dry run" in out.getvalue()
    seasoning_setup["combined"].refresh_from_db()
    assert seasoning_setup["combined"].deleted_at is None


@pytest.mark.django_db
def test_apply_replaces_the_row_with_one_prise_per_seasoning(seasoning_setup):
    call_command("split_combined_seasoning_items", "--apply", stdout=StringIO())

    assert not RecipeItem.objects.filter(pk=seasoning_setup["item"].pk).exists()
    rows = RecipeItem.objects.filter(recipe=seasoning_setup["recipe"]).order_by("id")
    assert [row.ingredient_id for row in rows] == [seasoning_setup["salt"].id, seasoning_setup["pepper"].id]
    assert all(row.standard_measure_key == "prise" and row.sort_order == 3 for row in rows)
    assert all(row.note == "nach Belieben" for row in rows)

    combined = seasoning_setup["combined"]
    combined.refresh_from_db()
    assert combined.deleted_at is not None
    assert combined.exclude_from_matching is True


@pytest.mark.django_db
def test_missing_seasoning_stops_without_writes(seasoning_setup):
    seasoning_setup["pepper"].delete()

    call_command("split_combined_seasoning_items", "--apply", stdout=StringIO(), stderr=StringIO())

    assert RecipeItem.objects.filter(pk=seasoning_setup["item"].pk).exists()
