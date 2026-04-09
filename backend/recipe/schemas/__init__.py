"""Recipe schemas package — re-exports all schemas for backward compatibility."""

from .cockpit import (
    CockpitDashboardOut,
    CockpitEvaluationOut,
    HealthRuleOut,
)
from .recipes import (
    NutritionalTagOut,
    PaginatedRecipeOut,
    RecipeCreateIn,
    RecipeDetailOut,
    RecipeFilterIn,
    RecipeListOut,
    RecipeSimilarOut,
    RecipeUpdateIn,
)
from .items import (
    RecipeItemCreateIn,
    RecipeItemOut,
    RecipeItemUpdateIn,
)
from .nutrition import (
    NutriScoreDetailOut,
    RecipeCheckOut,
    RecipeHintMatchOut,
    RecipeHintOut,
    RecipeItemNutritionOut,
    RecipeNutritionBreakdownOut,
)

__all__ = [
    "CockpitDashboardOut",
    "CockpitEvaluationOut",
    "HealthRuleOut",
    "NutriScoreDetailOut",
    "NutritionalTagOut",
    "PaginatedRecipeOut",
    "RecipeCheckOut",
    "RecipeCreateIn",
    "RecipeDetailOut",
    "RecipeFilterIn",
    "RecipeHintMatchOut",
    "RecipeHintOut",
    "RecipeItemCreateIn",
    "RecipeItemNutritionOut",
    "RecipeItemOut",
    "RecipeItemUpdateIn",
    "RecipeListOut",
    "RecipeNutritionBreakdownOut",
    "RecipeSimilarOut",
    "RecipeUpdateIn",
]
