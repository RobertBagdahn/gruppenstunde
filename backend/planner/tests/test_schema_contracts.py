import pytest
from pydantic import ValidationError

from planner.schemas.meal_plan import GroupMemberBulkCreateIn, MealItemVariantIn, ShoppingItemSourceOut


def test_shopping_source_supports_ingredient_only_items():
    source = ShoppingItemSourceOut(ingredient_id=12)
    assert source.recipe_id is None
    assert source.ingredient_id == 12


def test_shopping_source_rejects_non_numeric_ids():
    with pytest.raises(ValidationError):
        ShoppingItemSourceOut(recipe_id="recipe")


def test_numeric_contract_bounds_match_frontend():
    assert MealItemVariantIn(recipe_id=1, factor=0.01).factor == 0.01
    with pytest.raises(ValidationError):
        MealItemVariantIn(recipe_id=1, factor=0)
    with pytest.raises(ValidationError):
        MealItemVariantIn(recipe_id=1, factor=1.01)
    with pytest.raises(ValidationError):
        GroupMemberBulkCreateIn(count=51)
