"""Recipe-specific choices + re-exports from supply/content for backward compatibility."""

# Re-export content choices for backward compatibility
from content.choices import (
    ContentStatus,
    DifficultyChoices,
    ExecutionTimeChoices,
    PreparationTimeChoices,
)

# Re-export supply choices for backward compatibility
from supply.choices import (
    HintLevelChoices,
    HintMinMaxChoices,
    HintParameterChoices,
    RecipeObjectiveChoices,
    RecipeTypeChoices,
)

# RecipeStatusChoices is DEPRECATED — use ContentStatus instead.
# Kept as alias for backward compatibility during migration.
RecipeStatusChoices = ContentStatus


# Re-export all for backward compatibility so `from recipe.choices import X` still works
__all__ = [
    "ContentStatus",
    "DifficultyChoices",
    "ExecutionTimeChoices",
    "HintLevelChoices",
    "HintMinMaxChoices",
    "HintParameterChoices",
    "PreparationTimeChoices",
    "RecipeObjectiveChoices",
    "RecipeStatusChoices",
    "RecipeTypeChoices",
]
