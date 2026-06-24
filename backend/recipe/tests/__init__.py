"""Factories for creating test data (recipe app)."""

from django.contrib.contenttypes.models import ContentType
from model_bakery import baker

from content.choices import ContentStatus
from content.models import ContentComment, ContentEmotion, ContentView
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
        "portions": 4,
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

    ingredient = kwargs.pop("ingredient", None)
    portion = kwargs.get("portion")

    if portion is None and ingredient is not None:
        from supply.models import MeasuringUnit, Portion

        portion = Portion.objects.filter(ingredient=ingredient).first()
        if not portion:
            unit, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0})
            portion = Portion.objects.create(
                ingredient=ingredient,
                measuring_unit=unit,
                name="Gramm",
                quantity=1.0,
                weight_g=1.0,
            )
        kwargs["portion"] = portion

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


def make_health_rule(**kwargs) -> Rule:
    """Factory helper to create a Rule with scope=meal (formerly HealthRule)."""
    return make_rule(**kwargs)


def make_recipe_hint(**kwargs) -> Rule:
    """Factory helper to create a Rule with scope=recipe (formerly RecipeHint)."""
    defaults = {
        "name": kwargs.get("name", "Rezeptregel"),
        "parameter": kwargs.get("parameter", "salt_g"),
        "scope": "recipe",
        "rule_type": "nutrition",
        "is_active": True,
        "sort_order": 0,
    }

    # Map old min/max/min_max to Rule green/yellow bounds
    min_max = kwargs.pop("min_max", "min")
    min_value = kwargs.pop("min_value", None)
    max_value = kwargs.pop("max_value", None)
    hint_level = kwargs.pop("hint_level", "warn")

    # Standardize hint level strings
    if hint_level == "warning":
        mapped_hint_level = "warn"
    elif hint_level == "info":
        mapped_hint_level = "info"
    elif hint_level == "error":
        mapped_hint_level = "error"
    else:
        mapped_hint_level = hint_level

    defaults["hint_level"] = mapped_hint_level

    if min_max == "min":
        if mapped_hint_level == "error":
            defaults["min_yellow"] = min_value
            defaults["min_green"] = None
        else:
            defaults["min_yellow"] = None
            defaults["min_green"] = min_value
    else:
        if mapped_hint_level == "error":
            defaults["max_yellow"] = max_value
            defaults["max_green"] = None
        else:
            defaults["max_yellow"] = None
            defaults["max_green"] = max_value

    # The old recipe_objective kwargs can be popped or ignored
    kwargs.pop("recipe_objective", None)

    defaults.update(kwargs)

    # Ensure tip_text has a default value
    if "tip_text" not in defaults:
        defaults["tip_text"] = defaults["name"]

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
