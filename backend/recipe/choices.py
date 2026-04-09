"""Recipe-specific choices + re-exports from supply/content for backward compatibility."""

from django.db import models
from django.utils.translation import gettext_lazy as _

# Re-export content choices for backward compatibility
from content.choices import (
    ContentStatus,
    CostsRatingChoices,
    DifficultyChoices,
    ExecutionTimeChoices,
    PreparationTimeChoices,
)

# Re-export supply choices for backward compatibility
from supply.choices import (
    HintLevelChoices,
    HintMinMaxChoices,
    HintParameterChoices,
    MaterialQuantityType,
    RecipeObjectiveChoices,
    RecipeTypeChoices,
)

# RecipeStatusChoices is DEPRECATED — use ContentStatus instead.
# Kept as alias for backward compatibility during migration.
RecipeStatusChoices = ContentStatus


# Re-export all for backward compatibility so `from recipe.choices import X` still works
__all__ = [
    "ContentStatus",
    "RecipeStatusChoices",
    "RecipeTypeChoices",
    "DifficultyChoices",
    "CostsRatingChoices",
    "PreparationTimeChoices",
    "ExecutionTimeChoices",
    "MaterialQuantityType",
    "RecipeObjectiveChoices",
    "HintParameterChoices",
    "HintMinMaxChoices",
    "HintLevelChoices",
]
