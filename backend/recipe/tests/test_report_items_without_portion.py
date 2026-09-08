"""Tests for the report_recipe_items_without_portion management command."""

from io import StringIO

import pytest
from django.core.management import call_command

from recipe.models import RecipeItem
from recipe.tests import make_recipe
from supply.tests import make_ingredient, make_measuring_unit, make_portion


def _run(**options) -> str:
    out = StringIO()
    call_command("report_recipe_items_without_portion", stdout=out, **options)
    return out.getvalue()


@pytest.mark.django_db
class TestReportRecipeItemsWithoutPortion:
    def test_reports_nothing_when_all_items_have_portions(self):
        recipe = make_recipe(title="Sauberes Rezept")
        portion = make_portion(make_ingredient(name="Möhre"))
        RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=2.0)

        output = _run()

        assert "Keine Rezeptpositionen ohne Portion gefunden." in output

    def test_lists_affected_recipes(self):
        recipe = make_recipe(title="Kaputtes Rezept", slug="kaputtes-rezept")
        RecipeItem.objects.create(recipe=recipe, portion=None, quantity=4.0, note="Möhre")

        output = _run()

        assert "1 Rezeptposition(en) ohne Portion gefunden" in output
        assert "Kaputtes Rezept" in output
        assert "kaputtes-rezept" in output
        assert "Möhre" in output
        assert "Betroffene Rezepte: 1" in output

    def test_does_not_modify_data(self):
        recipe = make_recipe(title="Unveraendert")
        item = RecipeItem.objects.create(recipe=recipe, portion=None, quantity=4.0)

        _run()

        item.refresh_from_db()
        assert item.portion_id is None
        assert item.quantity == 4.0
        assert RecipeItem.objects.filter(portion__isnull=True).count() == 1

    def test_limit_caps_the_listing_but_not_the_total(self):
        recipe = make_recipe(title="Viele Fehler")
        for index in range(3):
            RecipeItem.objects.create(recipe=recipe, portion=None, quantity=1.0, sort_order=index)

        output = _run(limit=1)

        assert "3 Rezeptposition(en) ohne Portion gefunden" in output
        assert output.count("— Item ") == 1

    def test_ignores_measuring_unit_only_setup(self):
        """A portion with a unit is fine and must not be reported."""
        ingredient = make_ingredient(name="Crème fraîche")
        unit = make_measuring_unit(name="Esslöffel", unit="EL")
        portion = make_portion(ingredient, name="EL", measuring_unit=unit, rank=2)
        recipe = make_recipe(title="Mit Einheit")
        RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=3.0)

        output = _run()

        assert "Keine Rezeptpositionen ohne Portion gefunden." in output
