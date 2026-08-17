from planner.schemas import MealPlanDetailOut, MealPlanOut
from recipe.schemas import RecipeDetailOut, RecipeListOut
from supply.schemas import IngredientDetailOut, IngredientListOut


def test_food_resource_schemas_expose_server_permissions():
    for schema in (
        RecipeDetailOut,
        RecipeListOut,
        IngredientDetailOut,
        IngredientListOut,
        MealPlanOut,
        MealPlanDetailOut,
    ):
        fields = set(getattr(schema, "__annotations__", {}))
        fields.update(getattr(schema, "__fields__", {}))
        fields.update(getattr(schema, "model_fields", {}))
        assert "can_edit" in fields
        assert "can_delete" in fields
