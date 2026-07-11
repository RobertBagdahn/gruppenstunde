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

GEMINI_MODEL = "gemini-3.1-flash-lite"


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


def ai_create_recipe(prompt: str, user: AbstractBaseUser | None = None) -> Recipe:
    """Create a complete recipe from a free-text prompt using Gemini + Search Grounding.

    Creates Recipe, matches/creates Ingredients, creates RecipeItems.
    Returns the created Recipe instance.
    """
    from google.genai import types

    from recipe.models import Recipe, RecipeItem

    prompt_text = f"Erstelle ein vollständiges Rezept zu dieser Beschreibung: {prompt}"

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RecipeAiCreateSchema,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )

    response, _interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt_text,
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
    from recipe.services.ingredient_matcher import IngredientMatcher
    from recipe.services.ingredient_enrichment import enrich_ingredient

    for i, item in enumerate(data.items):
        match_result = IngredientMatcher.match(item.ingredient_name, user)
        note = match_result.note

        ingredient = _resolve_ingredient_from_match(match_result, item.ingredient_name, user)
        measuring_unit = _match_measuring_unit(item.unit)
        portion = _resolve_or_create_portion(ingredient, measuring_unit, item.unit)

        RecipeItem.objects.create(
            recipe=recipe,
            portion=portion,
            quantity=item.quantity,
            sort_order=i + 1,
            is_optional=item.is_optional,
            note=note,
        )

    return recipe


def _resolve_ingredient_from_match(match_result, fallback_name: str, user: AbstractBaseUser | None = None):
    """Get or create an Ingredient from a MatchResult."""
    from recipe.services.ingredient_enrichment import enrich_ingredient
    from supply.choices import IngredientStatusChoices
    from supply.models import Ingredient

    if match_result.ingredient_id:
        return Ingredient.objects.get(id=match_result.ingredient_id)

    if match_result.needs_review:
        base_slug = slugify(fallback_name)
        slug = base_slug
        counter = 1
        while Ingredient.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        ingredient = Ingredient.objects.create(
            name=fallback_name,
            slug=slug,
            status=IngredientStatusChoices.DRAFT,
            created_by=user if user and user.is_authenticated else None,
        )

        nutrition = enrich_ingredient(fallback_name, user)
        if nutrition and nutrition.name:
            from supply.choices import PhysicalViscosityChoices
            from supply.models import MeasuringUnit, Portion
            from supply.services.unit_resolution import resolve_canonical_unit

            ingredient.name = nutrition.name
            ingredient.energy_kcal = nutrition.energy_kcal
            ingredient.protein_g = nutrition.protein_g
            ingredient.fat_g = nutrition.fat_g
            ingredient.fat_sat_g = nutrition.fat_sat_g
            ingredient.carbohydrate_g = nutrition.carbohydrate_g
            ingredient.sugar_g = nutrition.sugar_g
            ingredient.fibre_g = nutrition.fibre_g
            ingredient.salt_g = nutrition.salt_g
            ingredient.child_score = nutrition.child_score
            ingredient.scout_score = nutrition.scout_score
            ingredient.environmental_score = nutrition.environmental_score
            ingredient.nova_score = nutrition.nova_score
            ingredient.nutri_score = nutrition.nutri_score
            ingredient.nutri_class = nutrition.nutri_class
            ingredient.physical_density = nutrition.physical_density
            ingredient.physical_viscosity = (
                PhysicalViscosityChoices.BEVERAGE
                if nutrition.physical_viscosity in ("liquid", "beverage")
                else PhysicalViscosityChoices.SOLID
            )
            ingredient.save()

            for raw_alias_name in nutrition.aliases:
                from django.db import IntegrityError
                from django.db.models import Max

                from supply.models import IngredientAlias

                alias_name = raw_alias_name.strip()
                if not alias_name:
                    continue
                if IngredientAlias.objects.filter(ingredient=ingredient, name__iexact=alias_name).exists():
                    continue
                next_rank = (
                    IngredientAlias.objects.filter(ingredient=ingredient).aggregate(Max("rank"))["rank__max"] or 0
                ) + 1
                try:
                    IngredientAlias.objects.create(ingredient=ingredient, name=alias_name, rank=next_rank)
                except IntegrityError:
                    # Alias name already taken globally (unique_alias_name_when_not_generic) — skip.
                    continue

            unit = resolve_canonical_unit(nutrition.portion_name)
            if not unit:
                unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm")
            Portion.objects.get_or_create(
                ingredient=ingredient,
                name=nutrition.portion_name or unit.name or "Stück",
                measuring_unit=unit,
                quantity=1.0,
                defaults={"weight_g": nutrition.portion_weight_g if nutrition.portion_weight_g > 0 else None},
            )

        return ingredient

    return _match_or_create_ingredient(fallback_name, user)


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

        # Portion names must be unique per ingredient (case-insensitive), regardless
        # of measuring_unit — reuse an existing portion with the same name if present.
        name = unit_str or measuring_unit.name
        existing_by_name = Portion.objects.filter(ingredient=ingredient, name__iexact=name).first()
        if existing_by_name:
            return existing_by_name

        return Portion.objects.create(
            ingredient=ingredient,
            measuring_unit=measuring_unit,
            name=name,
            quantity=1.0,
        )

    # No measuring_unit matched → reuse any existing portion for this ingredient
    portion = Portion.objects.filter(ingredient=ingredient).first()
    if portion:
        return portion

    from supply.models import MeasuringUnit

    fallback_unit = MeasuringUnit.objects.filter(name__iexact="Stück").first()
    if not fallback_unit:
        fallback_unit = MeasuringUnit.objects.create(name="Stück")

    name = "Stück"
    existing_by_name = Portion.objects.filter(ingredient=ingredient, name__iexact=name).first()
    if existing_by_name:
        return existing_by_name

    return Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=fallback_unit,
        name=name,
        quantity=1.0,
    )
