"""Tests for clarification flags on imported recipe items.

A `RecipeItem` without a portion is interpreted as grams (see the
`RecipeItem.portion` help text), so an unresolved unit silently turns
"4 Möhren" into "4 g". Such items must be flagged instead of being persisted.
"""

import pytest

from recipe.services.url_import_service import _build_recipe_items_v2
from supply.models import Portion
from supply.tests import make_ingredient, make_measuring_unit


@pytest.mark.django_db
class TestRecipeItemClarification:
    def test_item_without_resolvable_unit_is_flagged(self):
        """ "4 Möhren" has no unit, so no portion can be resolved."""
        ingredient = make_ingredient(name="Möhre")
        # Drop the signal-created gram base portion so nothing can match.
        Portion.objects.filter(ingredient=ingredient).delete()

        items = _build_recipe_items_v2(
            [
                {
                    "ingredient_id": ingredient.id,
                    "ingredient_name": "Möhre",
                    "quantity": 4.0,
                    "unit": "",
                    "note": "",
                    "is_new_ingredient": False,
                    "estimated_portion_weight_g": 80,
                }
            ],
            [],
        )

        assert len(items) == 1
        item = items[0]
        assert item.portion_id is None
        assert item.needs_unit_clarification is True
        assert item.suggested_portion_weight_g == 80

    def test_item_with_resolvable_unit_is_not_flagged(self):
        ingredient = make_ingredient(name="Crème fraîche")
        make_measuring_unit(name="Esslöffel", unit="EL")

        items = _build_recipe_items_v2(
            [
                {
                    "ingredient_id": ingredient.id,
                    "ingredient_name": "Crème fraîche",
                    "quantity": 3.0,
                    "unit": "EL",
                    "note": "",
                    "is_new_ingredient": False,
                    "estimated_portion_weight_g": 15,
                }
            ],
            [],
        )

        assert len(items) == 1
        item = items[0]
        assert item.portion_id is not None
        assert item.needs_unit_clarification is False
        assert item.suggested_unit_name == ""

    def test_building_items_twice_is_stable(self):
        """A repeated import must not fail or create diverging portions."""
        ingredient = make_ingredient(name="Currypulver")
        make_measuring_unit(name="Teelöffel", unit="TL")

        payload = [
            {
                "ingredient_id": ingredient.id,
                "ingredient_name": "Currypulver",
                "quantity": 1.0,
                "unit": "TL",
                "note": "",
                "is_new_ingredient": False,
                "estimated_portion_weight_g": 3,
            }
        ]

        first = _build_recipe_items_v2(payload, [])
        second = _build_recipe_items_v2(payload, [])

        assert first[0].portion_id == second[0].portion_id
        assert first[0].needs_unit_clarification is False
        assert second[0].needs_unit_clarification is False
