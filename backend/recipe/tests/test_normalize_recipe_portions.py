"""Tests for the normalize_recipe_portions management command.

The command calls Gemini and applies quantity_g values from the LLM response
without bounds-checking. A bad LLM response (negative / 0 / absurdly large)
could permanently corrupt recipe quantities. These tests mock gemini_call to
ensure the command skips / clamps such values.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command

from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


def _make_gemini_response(items: list[dict]) -> MagicMock:
    """Build a fake Gemini response returning the given NormalizedItem list."""
    import json
    resp = MagicMock()
    resp.text = json.dumps({"items": items})
    return resp


@pytest.mark.django_db
class TestNormalizeRecipePortions:
    def test_valid_quantity_is_applied(self):
        """A reasonable LLM quantity overwrites the original."""
        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Mehl")
        portion = make_portion(ingredient=ing, weight_g=1.0, name="1g")
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=200.0)

        fake_resp = _make_gemini_response([{"index": 0, "quantity_g": 150.0}])
        with patch("core.services.gemini.gemini_call", return_value=(fake_resp, "uuid")):
            call_command("normalize_recipe_portions", recipe_id=recipe.id)

        item.refresh_from_db()
        assert float(item.quantity) == pytest.approx(150.0)

    def test_negative_quantity_is_skipped(self):
        """A negative LLM quantity must not corrupt the recipe item.

        Guard: normalize_recipe_portions._process_recipe skips quantity_g <= 0.
        """
        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Zucker")
        portion = make_portion(ingredient=ing, weight_g=1.0, name="1g")
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=100.0)

        fake_resp = _make_gemini_response([{"index": 0, "quantity_g": -50.0}])
        with patch("core.services.gemini.gemini_call", return_value=(fake_resp, "uuid")):
            call_command("normalize_recipe_portions", recipe_id=recipe.id)

        item.refresh_from_db()
        assert float(item.quantity) == pytest.approx(100.0)

    def test_out_of_bounds_index_is_ignored(self):
        """An index beyond the recipe item list must be silently skipped."""
        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Salz")
        portion = make_portion(ingredient=ing, weight_g=1.0, name="1g")
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=5.0)

        # index=99 does not exist
        fake_resp = _make_gemini_response([{"index": 99, "quantity_g": 999.0}])
        with patch("core.services.gemini.gemini_call", return_value=(fake_resp, "uuid")):
            call_command("normalize_recipe_portions", recipe_id=recipe.id)

        item.refresh_from_db()
        assert float(item.quantity) == pytest.approx(5.0)
