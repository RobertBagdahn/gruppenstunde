"""KI-Gesamtvorschläge für Rezepte via Gemini mit Google Search Grounding.

Provides:
- suggest_recipe_metadata(): Suggest missing metadata for existing recipes
- ai_create_recipe(): Create a complete recipe from title/description
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser
from django.utils.text import slugify
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call

if TYPE_CHECKING:
    from recipe.models import Recipe
    from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


# ---------------------------------------------------------------------------
# Pydantic schemas for structured output
# ---------------------------------------------------------------------------


class RecipeSuggestAllSchema(BaseModel):
    """Suggestion schema for recipe metadata."""

    description: str | None = Field(None, description="Beschreibung des Rezepts (2-3 Sätze)")
    difficulty: str | None = Field(None, description="Schwierigkeit: 'easy', 'medium' oder 'hard'")
    duration_minutes: int | None = Field(None, description="Zubereitungszeit in Minuten")
    portions: int | None = Field(None, description="Anzahl Portionen")
    recipe_type: str | None = Field(
        None,
        description="Rezepttyp: 'main', 'dessert', 'snack', 'drink', 'breakfast', 'side', 'soup', 'salad', 'baking'",
    )
    scout_levels: list[str] | None = Field(
        None, description="Pfadfinderstufen: 'woelflinge', 'jungpfadfinder', 'pfadfinder', 'rover'"
    )
    tags: list[str] | None = Field(
        None, description="Passende Tags für das Rezept, z.B. 'vegetarisch', 'schnell', 'lagerküche'"
    )


class RecipeItemSuggestion(BaseModel):
    """A suggested recipe ingredient item."""

    ingredient_name: str = Field(description="Name der Zutat")
    quantity: float = Field(description="Menge")
    unit: str = Field(description="Einheit, z.B. 'g', 'ml', 'Stück', 'EL', 'TL'")
    is_optional: bool = False


class RecipeAiCreateSchema(BaseModel):
    """Schema for creating a complete recipe from title."""

    title: str = Field(description="Rezepttitel")
    description: str = Field(description="Beschreibung (2-3 Sätze)")
    difficulty: str = Field(description="'easy', 'medium' oder 'hard'")
    duration_minutes: int = Field(description="Zubereitungszeit in Minuten")
    portions: int = Field(description="Anzahl Portionen")
    recipe_type: str = Field(
        description="'main', 'dessert', 'snack', 'drink', 'breakfast', 'side', 'soup', 'salad', 'baking'"
    )
    items: list[RecipeItemSuggestion] = Field(description="Zutaten mit Mengen")


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------


def suggest_recipe_metadata(recipe: Recipe, user: AbstractBaseUser | None = None) -> dict:
    """Suggest missing metadata for an existing recipe using Gemini + Search Grounding.

    Returns a dict with suggested values (None for fields that couldn't be determined).
    """
    from google.genai import types

    # Build context from existing recipe data
    context_parts = [f"Rezept: '{recipe.title}'"]
    if recipe.description:
        context_parts.append(f"Beschreibung: {recipe.description}")

    # Include existing ingredients for context
    items = recipe.recipe_items.select_related("portion", "portion__ingredient").all()
    if items:
        ingredient_list = ", ".join(
            (
                f"{item.quantity} {item.portion.ingredient.name}"
                if item.portion and item.portion.ingredient
                else str(item.quantity)
            )
            for item in items
        )
        context_parts.append(f"Zutaten: {ingredient_list}")

    context_str = "\n".join(context_parts)

    prompt = (
        f"Recherchiere Informationen zu folgendem Rezept und schlage fehlende Metadaten vor:\n\n"
        f"{context_str}\n\n"
        f"Gib passende Metadaten für das Rezept an. "
        f"Wenn du einen Wert nicht sicher bestimmen kannst, setze ihn auf null."
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RecipeSuggestAllSchema,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )

    response, _interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="recipe_suggest_all",
    )

    if response is None:
        logger.warning("AI client not available – returning empty suggestions")
        return {}

    result = RecipeSuggestAllSchema.model_validate_json(response.text)
    return result.model_dump()


def ai_create_recipe(title: str, description: str | None, user: AbstractBaseUser | None = None) -> Recipe:
    """Create a complete recipe from title/description using Gemini + Search Grounding.

    Creates Recipe, matches/creates Ingredients, creates RecipeItems.
    Returns the created Recipe instance.
    """
    from google.genai import types

    from recipe.models import Recipe, RecipeItem

    prompt_parts = [f"Recherchiere das Rezept '{title}'."]
    if description:
        prompt_parts.append(f"Beschreibung: {description}")
    prompt_parts.append(
        "Gib alle Metadaten und eine vollständige Zutatenliste mit Mengen und Einheiten an. "
        "Verwende gängige deutsche Lebensmittelbezeichnungen."
    )
    prompt = "\n".join(prompt_parts)

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RecipeAiCreateSchema,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )

    response, _interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="recipe_ai_create",
    )

    if response is None:
        from ninja.errors import HttpError

        raise HttpError(503, "KI nicht verfügbar")

    data = RecipeAiCreateSchema.model_validate_json(response.text)

    # Generate unique slug
    base_slug = slugify(data.title)
    slug = base_slug
    counter = 1
    while Recipe.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    execution_time = _duration_to_execution_time_choice(data.duration_minutes)

    # Create recipe
    recipe = Recipe.objects.create(
        title=data.title,
        slug=slug,
        description=data.description,
        difficulty=data.difficulty,
        execution_time=execution_time,
        portions=data.portions,
        recipe_type=data.recipe_type,
        status="draft",
        owner=user if user and user.is_authenticated else None,
        created_by=user if user and user.is_authenticated else None,
    )

    # Create recipe items — match or create ingredients, then resolve portions
    for i, item in enumerate(data.items):
        ingredient = _match_or_create_ingredient(item.ingredient_name, user)
        measuring_unit = _match_measuring_unit(item.unit)
        portion = _resolve_or_create_portion(ingredient, measuring_unit, item.unit)

        RecipeItem.objects.create(
            recipe=recipe,
            portion=portion,
            quantity=item.quantity,
            sort_order=i + 1,
            is_optional=item.is_optional,
        )

    return recipe


def _match_or_create_ingredient(name: str, user: AbstractBaseUser | None) -> Ingredient:
    """Find an existing ingredient by name/alias or create a new one."""
    from supply.models import Ingredient, IngredientAlias

    # Exact name match
    ingredient = Ingredient.objects.filter(name__iexact=name).first()
    if ingredient:
        return ingredient

    # Alias match
    alias = IngredientAlias.objects.filter(name__iexact=name).select_related("ingredient").first()
    if alias:
        return alias.ingredient

    # Create new minimal ingredient
    base_slug = slugify(name)
    slug = base_slug
    counter = 1
    while Ingredient.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    return Ingredient.objects.create(
        name=name,
        slug=slug,
        status="user_content",
        created_by=user if user and user.is_authenticated else None,
    )


def _match_measuring_unit(unit_str: str):
    """Try to match a unit string to a MeasuringUnit in the database."""
    from supply.models import MeasuringUnit

    if not unit_str:
        return None

    mu = MeasuringUnit.objects.filter(name__iexact=unit_str).first()
    return mu


def _duration_to_execution_time_choice(minutes: int) -> str:
    if minutes < 30:
        return "less_30"
    if minutes < 60:
        return "30_60"
    if minutes < 90:
        return "60_90"
    return "more_90"


def _resolve_or_create_portion(ingredient, measuring_unit, unit_str: str):
    """Find or create a Portion for the given ingredient + measuring_unit combo."""
    from supply.models import Portion

    if measuring_unit:
        portion = Portion.objects.filter(
            ingredient=ingredient,
            measuring_unit=measuring_unit,
        ).first()
        if portion:
            return portion

        portion = Portion.objects.create(
            ingredient=ingredient,
            measuring_unit=measuring_unit,
            name=unit_str or measuring_unit.name,
            quantity=1.0,
        )
        return portion

    # No measuring_unit matched → create a generic portion
    portion = Portion.objects.filter(ingredient=ingredient).first()
    if portion:
        return portion

    from supply.models import MeasuringUnit

    fallback_unit = MeasuringUnit.objects.filter(name__iexact="Stück").first()
    if not fallback_unit:
        fallback_unit = MeasuringUnit.objects.create(name="Stück")

    portion = Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=fallback_unit,
        name="Stück",
        quantity=1.0,
    )
    return portion
