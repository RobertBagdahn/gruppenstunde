"""Tests for the report-only validate_recipe_data command."""

from io import StringIO

import pytest
from django.core.management import call_command

from recipe.models import Recipe
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


def _run(*args: str) -> str:
    out = StringIO()
    call_command("validate_recipe_data", *args, stdout=out)
    return out.getvalue()


@pytest.mark.django_db
class TestValidateRecipeData:
    def test_reports_per_person_weight_above_threshold_without_writing(self):
        recipe = make_recipe(title="Riesige Käsespätzle")
        ingredient = make_ingredient(name="Spätzle")
        make_recipe_item(recipe=recipe, portion=make_portion(ingredient, weight_g=100), quantity=60)

        output = _run()

        assert "Riesige Käsespätzle" in output
        assert "Per person: 6000g" in output
        assert "Spätzle: 6000g per person" in output
        assert Recipe.objects.get(pk=recipe.pk).portions == 1

    def test_plausible_recipe_is_not_reported(self):
        recipe = make_recipe(title="Linsensuppe")
        make_recipe_item(recipe=recipe, portion=make_portion(make_ingredient(name="Linsen"), weight_g=100), quantity=4)

        output = _run()

        assert "No problematic recipes found." in output
