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
    VisibilityUpdateIn,
)
from .items import (
    RecipeItemCreateIn,
    RecipeItemOut,
    RecipeItemUpdateIn,
)
from .nutrition import (
    ContributionOut,
    ImprovementListOut,
    ImprovementOut,
    LlmSuggestionOut,
    LlmSuggestionRequestIn,
    NutriScoreDetailOut,
    RecipeHintOut,
    RecipeItemNutritionOut,
    RecipeNutritionBreakdownOut,
    SuggestedIngredientOut,
)

__all__ = [
    "CockpitDashboardOut",
    "CockpitEvaluationOut",
    "ContributionOut",
    "HealthRuleOut",
    "ImprovementListOut",
    "ImprovementOut",
    "LlmSuggestionOut",
    "LlmSuggestionRequestIn",
    "NutriScoreDetailOut",
    "NutritionalTagOut",
    "PaginatedRecipeOut",
    "RecipeCreateIn",
    "RecipeDetailOut",
    "RecipeFilterIn",
    "RecipeHintOut",
    "RecipeItemCreateIn",
    "RecipeItemNutritionOut",
    "RecipeItemOut",
    "RecipeItemUpdateIn",
    "RecipeListOut",
    "RecipeNutritionBreakdownOut",
    "RecipeSimilarOut",
    "RecipeUpdateIn",
    "SuggestedIngredientOut",
    "VisibilityUpdateIn",
]
