"""Factories for creating test data (recipe app)."""

from model_bakery import baker

from content.choices import ContentStatus
from content.models import ContentComment, ContentEmotion, ContentView
from django.contrib.contenttypes.models import ContentType

from recipe.models import (
    Recipe,
    RecipeItem,
    Rule,
)


# ---------------------------------------------------------------------------
# Recipe
# ---------------------------------------------------------------------------


def make_recipe(status: str = ContentStatus.APPROVED, **kwargs) -> Recipe:
    defaults = {
        "title": "Pfannkuchen",
        "summary": "Einfache Pfannkuchen für die Gruppe",
        "description": "## Zubereitung\n1. Mehl, Eier und Milch verrühren\n2. In der Pfanne ausbacken",
        "difficulty": "easy",
        "execution_time": "less_30",
        "recipe_type": "warm_meal",
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
# Rule
# ---------------------------------------------------------------------------


def make_rule(**kwargs) -> Rule:
    defaults = {
        "name": "Zuckergehalt pro Mahlzeit",
        "description": "Bewertung des Zuckergehalts pro 100g",
        "parameter": "sugar_g",
        "scope": "meal",
        "rule_type": "nutrition",
        "max_green": 10.0,
        "max_yellow": 20.0,
        "unit": "g",
        "hint_level": "warn",
        "tip_text": "Zucker reduzieren.",
        "is_active": True,
        "sort_order": 1,
    }
    defaults.update(kwargs)
    return baker.make(Rule, **defaults)


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
