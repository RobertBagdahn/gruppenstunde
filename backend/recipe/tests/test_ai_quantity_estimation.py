"""Tests for AI quantity estimation response conversion."""

import pytest

from recipe.services.ai_ingredients_service import (
    AiQuantityEstimate,
    AiQuantityEstimatesOutput,
    RecipeQuantityEstimationService,
)
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestRecipeQuantityEstimationService:
    def test_build_response_uses_default_editable_portion(self):
        recipe = make_recipe(title="Frühstück", portions=1)
        ingredient = make_ingredient(name="Haferflocken")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        default_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="Gramm",
            quantity=1.0,
            weight_g=1.0,
            rank=1,
        )
        package_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="800g Haferflocken",
            quantity=800.0,
            weight_g=800.0,
        )
        item = make_recipe_item(recipe=recipe, portion=package_portion, quantity=1.0)
        ai_output = AiQuantityEstimatesOutput(
            items=[
                AiQuantityEstimate(
                    item_id=item.id,
                    estimated_grams_per_person=400.0,
                )
            ]
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result == [
            {
                "item_id": item.id,
                "ingredient_name": "Haferflocken",
                "quantity_per_portion": 400.0,
                "unit": "Gramm",
            }
        ]
        assert default_portion.weight_g == 1.0

    def test_build_response_labels_composite_default_portion_by_its_own_name(self):
        """Regression test: if the rank=1 default portion is itself a composite
        portion (quantity != 1, e.g. "1 Portion Nudeln" = 125g), the response
        MUST label the unit with the portion's own name, not the underlying
        measuring_unit name ("Gramm"). Using "Gramm" is misleading: the
        quantity_per_portion value is a *count* of that portion, not grams —
        this is the same bug class documented for recipe #434.
        """
        recipe = make_recipe(title="Pasta", portions=1)
        ingredient = make_ingredient(name="Nudeln")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        composite_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="1 Portion Nudeln",
            quantity=125.0,
            weight_g=125.0,
            rank=1,
        )
        item = make_recipe_item(recipe=recipe, portion=composite_portion, quantity=1.0)
        ai_output = AiQuantityEstimatesOutput(
            items=[
                AiQuantityEstimate(
                    item_id=item.id,
                    estimated_grams_per_person=125.0,
                )
            ]
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result == [
            {
                "item_id": item.id,
                "ingredient_name": "Nudeln",
                "quantity_per_portion": 1.0,
                "unit": "1 Portion Nudeln",
            }
        ]
        # Explicitly guard against the recipe #434 regression: label must never
        # be "Gramm" when the underlying portion is a composite conversion factor.
        assert result[0]["unit"] != "Gramm"
