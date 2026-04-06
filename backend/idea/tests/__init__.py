"""Factories for creating test data (idea app)."""

import datetime
from decimal import Decimal

from model_bakery import baker

from idea.choices import (
    CommentStatus,
    DifficultyChoices,
    EmotionType,
    ExecutionTimeChoices,
    IngredientStatusChoices,
    MeasuringUnitType,
    PhysicalViscosityChoices,
    StatusChoices,
)
from idea.models import (
    Comment,
    Emotion,
    Idea,
    IdeaOfTheWeek,
    IdeaView,
    Ingredient,
    IngredientAlias,
    MaterialItem,
    MaterialName,
    MeasuringUnit,
    NutritionalTag,
    Portion,
    Price,
    RetailSection,
    ScoutLevel,
    SearchLog,
    Tag,
    TagSuggestion,
    UserPreferences,
)


# ---------------------------------------------------------------------------
# Tags & Scout Levels
# ---------------------------------------------------------------------------


def make_tag(**kwargs) -> Tag:
    defaults = {}
    defaults.update(kwargs)
    if "slug" not in defaults:
        import uuid

        defaults["slug"] = f"tag-{uuid.uuid4().hex[:8]}"
    return baker.make(Tag, **defaults)


def make_scout_level(**kwargs) -> ScoutLevel:
    return baker.make(ScoutLevel, **kwargs)


def make_tag_suggestion(**kwargs) -> TagSuggestion:
    defaults = {
        "name": "Vorgeschlagener Tag",
        "is_processed": False,
    }
    defaults.update(kwargs)
    return baker.make(TagSuggestion, **defaults)


# ---------------------------------------------------------------------------
# Idea & related
# ---------------------------------------------------------------------------


def make_idea(status: str = StatusChoices.PUBLISHED, **kwargs) -> Idea:
    defaults = {
        "title": "Testidee",
        "summary": "Eine tolle Gruppenstunde",
        "difficulty": DifficultyChoices.EASY,
        "execution_time": ExecutionTimeChoices.LESS_30,
        "status": status,
    }
    defaults.update(kwargs)
    return baker.make(Idea, **defaults)


def make_comment(idea: Idea | None = None, **kwargs) -> Comment:
    if idea is None:
        idea = make_idea()
    defaults = {"status": CommentStatus.APPROVED}
    defaults.update(kwargs)
    return baker.make(Comment, idea=idea, **defaults)


def make_emotion(idea: Idea | None = None, **kwargs) -> Emotion:
    if idea is None:
        idea = make_idea()
    defaults = {"emotion_type": EmotionType.HAPPY}
    defaults.update(kwargs)
    return baker.make(Emotion, idea=idea, **defaults)


def make_idea_of_the_week(idea: Idea | None = None, **kwargs) -> IdeaOfTheWeek:
    if idea is None:
        idea = make_idea()
    defaults = {
        "release_date": datetime.date.today(),
        "description": "Idee der Woche Beschreibung",
    }
    defaults.update(kwargs)
    return baker.make(IdeaOfTheWeek, idea=idea, **defaults)


def make_idea_view(idea: Idea | None = None, **kwargs) -> IdeaView:
    if idea is None:
        idea = make_idea()
    defaults = {
        "session_key": "test-session-key-1234",
        "ip_hash": IdeaView.hash_ip("127.0.0.1"),
        "user_agent": "Mozilla/5.0 TestBrowser",
    }
    defaults.update(kwargs)
    return baker.make(IdeaView, idea=idea, **defaults)


def make_search_log(**kwargs) -> SearchLog:
    defaults = {
        "query": "Pfadfinder Spiel",
        "results_count": 5,
        "session_key": "test-session-key-1234",
        "ip_hash": IdeaView.hash_ip("127.0.0.1"),
    }
    defaults.update(kwargs)
    return baker.make(SearchLog, **defaults)


# ---------------------------------------------------------------------------
# Material
# ---------------------------------------------------------------------------


def make_measuring_unit(**kwargs) -> MeasuringUnit:
    defaults = {
        "name": "Gramm",
        "description": "Gewichtseinheit",
        "quantity": 1.0,
        "unit": MeasuringUnitType.MASS,
    }
    defaults.update(kwargs)
    return baker.make(MeasuringUnit, **defaults)


def make_material_name(**kwargs) -> MaterialName:
    defaults = {
        "name": "Papier",
        "description": "Einfaches Papier",
    }
    defaults.update(kwargs)
    return baker.make(MaterialName, **defaults)


def make_material_item(idea: Idea | None = None, **kwargs) -> MaterialItem:
    if idea is None:
        idea = make_idea()
    defaults = {
        "quantity": "10",
    }
    defaults.update(kwargs)
    return baker.make(MaterialItem, idea=idea, **defaults)


# ---------------------------------------------------------------------------
# Nutritional & Retail
# ---------------------------------------------------------------------------


def make_nutritional_tag(**kwargs) -> NutritionalTag:
    defaults = {
        "name": "Fleisch",
        "name_opposite": "Vegetarisch",
        "description": "Enthält tierische Produkte",
        "rank": 1,
        "is_dangerous": False,
    }
    defaults.update(kwargs)
    return baker.make(NutritionalTag, **defaults)


def make_retail_section(**kwargs) -> RetailSection:
    defaults = {
        "name": "Obst & Gemüse",
        "description": "Frische Abteilung",
        "rank": 1,
    }
    defaults.update(kwargs)
    return baker.make(RetailSection, **defaults)


# ---------------------------------------------------------------------------
# Ingredients, Portions & Prices
# ---------------------------------------------------------------------------


def make_ingredient(**kwargs) -> Ingredient:
    defaults = {
        "name": "Kartoffel",
        "description": "Festkochende Kartoffel",
        "physical_density": 1.1,
        "physical_viscosity": PhysicalViscosityChoices.SOLID,
        "energy_kj": 322.0,
        "protein_g": 2.0,
        "fat_g": 0.1,
        "carbohydrate_g": 17.0,
        "sugar_g": 0.8,
        "fibre_g": 2.2,
        "salt_g": 0.01,
        "status": IngredientStatusChoices.VERIFIED,
    }
    defaults.update(kwargs)
    return baker.make(Ingredient, **defaults)


def make_ingredient_alias(ingredient: Ingredient | None = None, **kwargs) -> IngredientAlias:
    if ingredient is None:
        ingredient = make_ingredient()
    defaults = {
        "name": "Erdapfel",
        "rank": 1,
    }
    defaults.update(kwargs)
    return baker.make(IngredientAlias, ingredient=ingredient, **defaults)


def make_portion(ingredient: Ingredient | None = None, **kwargs) -> Portion:
    if ingredient is None:
        ingredient = make_ingredient()
    defaults = {
        "name": "Mittelgroße Kartoffel",
        "quantity": 1.0,
        "weight_g": 150.0,
        "rank": 1,
    }
    defaults.update(kwargs)
    return baker.make(Portion, ingredient=ingredient, **defaults)


def make_price(portion: Portion | None = None, **kwargs) -> Price:
    if portion is None:
        portion = make_portion()
    defaults = {
        "price_eur": Decimal("1.99"),
        "quantity": 1,
        "name": "1kg Beutel",
        "retailer": "Aldi",
        "quality": "Standard",
    }
    defaults.update(kwargs)
    return baker.make(Price, portion=portion, **defaults)


# ---------------------------------------------------------------------------
# User Preferences
# ---------------------------------------------------------------------------


def make_user_preferences(user=None, **kwargs) -> UserPreferences:
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    defaults = {
        "preferred_difficulty": DifficultyChoices.EASY,
        "preferred_location": "indoor",
    }
    defaults.update(kwargs)
    return baker.make(UserPreferences, user=user, **defaults)
