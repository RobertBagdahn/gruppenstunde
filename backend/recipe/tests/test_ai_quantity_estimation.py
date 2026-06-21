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
            is_default=True,
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
