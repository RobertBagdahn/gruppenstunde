"""Factories for creating test data (recipe app)."""

from decimal import Decimal

from model_bakery import baker

from recipe.choices import (
    DifficultyChoices,
    ExecutionTimeChoices,
    HintLevelChoices,
    HintMinMaxChoices,
    HintParameterChoices,
    RecipeObjectiveChoices,
    RecipeStatusChoices,
    RecipeTypeChoices,
)
from recipe.models import (
    Recipe,
    RecipeComment,
    RecipeEmotion,
    RecipeHint,
    RecipeItem,
    RecipeView,
)


# ---------------------------------------------------------------------------
# Recipe
# ---------------------------------------------------------------------------


def make_recipe(status: str = RecipeStatusChoices.PUBLISHED, **kwargs) -> Recipe:
    defaults = {
        "title": "Pfannkuchen",
        "summary": "Einfache Pfannkuchen für die Gruppe",
        "description": "## Zubereitung\n1. Mehl, Eier und Milch verrühren\n2. In der Pfanne ausbacken",
        "difficulty": DifficultyChoices.EASY,
        "execution_time": ExecutionTimeChoices.LESS_30,
        "recipe_type": RecipeTypeChoices.WARM_MEAL,
        "servings": 4,
        "status": status,
    }
    defaults.update(kwargs)
    return baker.make(Recipe, **defaults)


# ---------------------------------------------------------------------------
# RecipeItem
# ---------------------------------------------------------------------------


def make_recipe_item(recipe: Recipe | None = None, **kwargs) -> RecipeItem:
    if recipe is None:
        recipe = make_recipe()
    defaults = {
        "quantity": 500.0,
        "sort_order": 0,
        "note": "",
    }
    defaults.update(kwargs)
    return baker.make(RecipeItem, recipe=recipe, **defaults)


# ---------------------------------------------------------------------------
# RecipeHint
# ---------------------------------------------------------------------------


def make_recipe_hint(**kwargs) -> RecipeHint:
    defaults = {
        "name": "Zu viel Salz",
        "description": "Der Salzgehalt pro Portion ist zu hoch.",
        "parameter": HintParameterChoices.SALT_G,
        "max_value": 2.0,
        "min_max": HintMinMaxChoices.MAX,
        "hint_level": HintLevelChoices.WARNING,
        "recipe_objective": RecipeObjectiveChoices.HEALTH,
    }
    defaults.update(kwargs)
    return baker.make(RecipeHint, **defaults)


# ---------------------------------------------------------------------------
# RecipeComment
# ---------------------------------------------------------------------------


def make_recipe_comment(recipe: Recipe | None = None, **kwargs) -> RecipeComment:
    if recipe is None:
        recipe = make_recipe()
    defaults = {
        "text": "Sehr leckeres Rezept!",
        "status": "approved",
    }
    defaults.update(kwargs)
    return baker.make(RecipeComment, recipe=recipe, **defaults)


# ---------------------------------------------------------------------------
# RecipeEmotion
# ---------------------------------------------------------------------------


def make_recipe_emotion(recipe: Recipe | None = None, **kwargs) -> RecipeEmotion:
    if recipe is None:
        recipe = make_recipe()
    defaults = {
        "emotion_type": "happy",
    }
    defaults.update(kwargs)
    return baker.make(RecipeEmotion, recipe=recipe, **defaults)


# ---------------------------------------------------------------------------
# RecipeView
# ---------------------------------------------------------------------------


def make_recipe_view(recipe: Recipe | None = None, **kwargs) -> RecipeView:
    if recipe is None:
        recipe = make_recipe()
    defaults = {
        "session_key": "test-session-key-1234",
        "ip_hash": RecipeView.hash_ip("127.0.0.1"),
        "user_agent": "Mozilla/5.0 TestBrowser",
    }
    defaults.update(kwargs)
    return baker.make(RecipeView, recipe=recipe, **defaults)
