"""Factories for creating test data (recipe app)."""

from model_bakery import baker

from content.choices import ContentStatus
from content.models import ContentComment, ContentEmotion, ContentView
from django.contrib.contenttypes.models import ContentType

from recipe.choices import (
    DifficultyChoices,
    ExecutionTimeChoices,
    HintLevelChoices,
    HintMinMaxChoices,
    HintParameterChoices,
    RecipeObjectiveChoices,
    RecipeTypeChoices,
)
from recipe.models import (
    HealthRule,
    Recipe,
    RecipeHint,
    RecipeItem,
)


# ---------------------------------------------------------------------------
# Recipe
# ---------------------------------------------------------------------------


def make_recipe(status: str = ContentStatus.APPROVED, **kwargs) -> Recipe:
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
# HealthRule
# ---------------------------------------------------------------------------


def make_health_rule(**kwargs) -> HealthRule:
    defaults = {
        "name": "Zuckergehalt pro Mahlzeit",
        "description": "Bewertung des Zuckergehalts pro 100g",
        "parameter": "sugar_g",
        "scope": "meal",
        "threshold_green": 10.0,
        "threshold_yellow": 20.0,
        "unit": "g",
        "tip_text": "Zucker reduzieren.",
        "is_active": True,
        "sort_order": 1,
    }
    defaults.update(kwargs)
    return baker.make(HealthRule, **defaults)


# ---------------------------------------------------------------------------
# Content Interactions (Comments, Emotions, Views) — using generic models
# ---------------------------------------------------------------------------


def make_recipe_comment(recipe: Recipe | None = None, **kwargs) -> ContentComment:
    if recipe is None:
        recipe = make_recipe()
    ct = ContentType.objects.get_for_model(Recipe)
    defaults = {
        "content_type": ct,
        "object_id": recipe.id,
        "text": "Sehr leckeres Rezept!",
        "status": "approved",
    }
    defaults.update(kwargs)
    return baker.make(ContentComment, **defaults)


def make_recipe_emotion(recipe: Recipe | None = None, **kwargs) -> ContentEmotion:
    if recipe is None:
        recipe = make_recipe()
    ct = ContentType.objects.get_for_model(Recipe)
    defaults = {
        "content_type": ct,
        "object_id": recipe.id,
        "emotion_type": "happy",
    }
    defaults.update(kwargs)
    return baker.make(ContentEmotion, **defaults)


def make_recipe_view(recipe: Recipe | None = None, **kwargs) -> ContentView:
    if recipe is None:
        recipe = make_recipe()
    ct = ContentType.objects.get_for_model(Recipe)
    defaults = {
        "content_type": ct,
        "object_id": recipe.id,
        "session_key": "test-session-key-1234",
        "ip_hash": ContentView.hash_ip("127.0.0.1"),
        "user_agent": "Mozilla/5.0 TestBrowser",
    }
    defaults.update(kwargs)
    return baker.make(ContentView, **defaults)
