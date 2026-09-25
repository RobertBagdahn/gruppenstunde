"""KI-Gesamtvorschläge für Rezepte via Gemini mit Google Search Grounding.

Provides:
- suggest_recipe_metadata(): Suggest missing metadata for existing recipes
- ai_create_recipe(): Create a complete recipe from title/description
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils.text import slugify
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call
from core.services.prompt_context import build_prompt_context
from supply.choices import PortionWeightSource, PortionWeightStatus

if TYPE_CHECKING:
    from django.contrib.auth.models import User

    from recipe.models import Recipe
    from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"

# The AI schemas below prompt Gemini with a free-text recipe-type vocabulary
# ('main', 'side', 'soup', ...) that does not match `supply.choices.RecipeTypeChoices`
# ('warm_meal', 'recipe_part', ...). Map AI output to a valid choice before saving,
# otherwise the stored recipe_type is invalid and things like the type-stats
# endpoint (GET /api/recipes/type-stats/{recipe_type}/) 404 forever.
RECIPE_TYPE_MAPPING = {
    "main": "warm_meal",
    "side": "recipe_part",
    "soup": "warm_meal",
    "salad": "cold_meal",
    "baking": "dessert",
    "dessert": "dessert",
    "snack": "snack",
    "drink": "drink",
    "breakfast": "breakfast",
}
RECIPE_TYPE_FALLBACK = "warm_meal"


def _map_recipe_type(value: str | None) -> str | None:
    """Map an AI-suggested recipe_type string to a valid RecipeTypeChoices value.

    Returns None if `value` is None (so optional-suggestion callers can keep
    treating "no suggestion" as None), otherwise always a valid choice.
    """
    if value is None:
        return None
    return RECIPE_TYPE_MAPPING.get(value.lower(), RECIPE_TYPE_FALLBACK)


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
    portions: int | None = Field(None, ge=1, description="Anzahl Portionen, falls sicher erkannt")
    recipe_type: str = Field(
        description="'main', 'dessert', 'snack', 'drink', 'breakfast', 'side', 'soup', 'salad', 'baking'"
    )
    items: list[RecipeItemSuggestion] = Field(description="Zutaten mit Mengen")
    steps: list[str] = Field(default_factory=list, description="Zubereitungsschritte")


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

    prompt_context = build_prompt_context(user)

    prompt = (
        f"Recherchiere Informationen zu folgendem Rezept und schlage fehlende Metadaten vor:\n\n"
        f"{context_str}\n\n"
        f"Gib passende Metadaten für das Rezept an. "
        f"Wenn du einen Wert nicht sicher bestimmen kannst, setze ihn auf null."
    )
    if prompt_context:
        prompt = f"{prompt}\n\n{prompt_context}"

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RecipeSuggestAllSchema,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="recipe_suggest_all",
    )

    if response is None:
        logger.warning("AI client not available – returning empty suggestions")
        return {"ai_interaction_id": str(interaction_id) if interaction_id else None}

    result = RecipeSuggestAllSchema.model_validate_json(response.text)
    suggestion = result.model_dump()
    suggestion["recipe_type"] = _map_recipe_type(suggestion.get("recipe_type"))
    suggestion["ai_interaction_id"] = str(interaction_id) if interaction_id else None
    return suggestion


@transaction.atomic
def ai_create_recipe(prompt: str, user: User | None = None) -> Recipe:
    """Create a complete recipe from a free-text prompt using Gemini + Search Grounding.

    Creates Recipe, matches/creates Ingredients, creates RecipeItems.
    Returns the created Recipe instance.
    """
    from google.genai import types

    from recipe.models import Recipe, RecipeItem

    prompt_text = f"Erstelle ein vollständiges Rezept zu dieser Beschreibung: {prompt}"

    prompt_context = build_prompt_context(user, include_pantry=True)
    if prompt_context:
        prompt_text = f"{prompt_text}\n\n{prompt_context}"

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RecipeAiCreateSchema,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )

    response, interaction_id = gemini_call(
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
    is_authenticated = bool(user and user.is_authenticated)
    recipe = Recipe.objects.create(
        title=data.title,
        slug=slug,
        description=data.description,
        difficulty=data.difficulty,
        execution_time=execution_time,
        portions=1,
        recipe_type=_map_recipe_type(data.recipe_type) or "",
        status="draft",
        owner=user if is_authenticated else None,
        created_by=user if is_authenticated else None,
        # An owned recipe without visibility is neither private nor shared and
        # is skipped by every visibility filter. Match `POST /api/recipes/`.
        visibility="private" if is_authenticated else None,
    )
    if is_authenticated and user is not None:
        recipe.authors.add(user)
    # Keep the AI's source context only on this response object. The recipe model
    # remains normalized to one portion for all persisted consumers.
    recipe.input_servings = data.portions

    # Create recipe items — match or create ingredients, then resolve portions
    from recipe.services.ingredient_matcher import IngredientMatcher

    for i, item in enumerate(data.items):
        match_result = IngredientMatcher.match(item.ingredient_name, user)
        note = match_result.note

        ingredient = _resolve_ingredient_from_match(match_result, item.ingredient_name, user)
        measuring_unit = _match_measuring_unit(item.unit)
        portion = _resolve_or_create_portion(ingredient, measuring_unit, item.unit)
        from supply.services.portion_resolution import resolve_trusted_weight

        if resolve_trusted_weight(portion) is None:
            raise ValueError(
                f"Für '{ingredient.name}' konnte kein bestätigtes Gewicht für '{portion.name}' ermittelt werden."
            )

        RecipeItem.objects.create(
            recipe=recipe,
            portion=portion,
            quantity=item.quantity / max(data.portions or 1, 1),
            sort_order=i + 1,
            is_optional=item.is_optional,
            note=note,
        )

    from recipe.models import RecipeStep

    for index, instruction in enumerate(data.steps):
        if instruction.strip():
            RecipeStep.objects.create(recipe=recipe, sort_order=index, instruction=instruction.strip())

    from recipe.services.recipe_checks import recalculate_recipe_cache

    recalculate_recipe_cache(recipe)
    recipe.refresh_from_db()

    # Transient: expose the AiInteraction id so the UI can offer feedback.
    recipe.ai_interaction_id = str(interaction_id) if interaction_id else None

    return recipe


def _resolve_ingredient_from_match(match_result, fallback_name: str, user: User | None = None):
    """Get or create an Ingredient from a MatchResult."""
    from recipe.services.ingredient_enrichment import enrich_ingredient
    from supply.choices import IngredientStatusChoices
    from supply.models import Ingredient, IngredientAlias

    if match_result.ingredient_id:
        return Ingredient.objects.get(id=match_result.ingredient_id)

    if match_result.needs_review:
        existing_ing = (
            Ingredient.objects.filter(name__iexact=fallback_name, deleted_at__isnull=True)
            .order_by("-usage_count", "id")
            .first()
        )
        if not existing_ing:
            alias = IngredientAlias.objects.filter(name__iexact=fallback_name).select_related("ingredient").first()
            if alias and not alias.ingredient.is_deleted:
                existing_ing = alias.ingredient
        if existing_ing:
            return existing_ing

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
                if IngredientAlias.objects.filter(name__iexact=alias_name, is_generic=False).exists():
                    continue
                try:
                    with transaction.atomic():
                        IngredientAlias.objects.create(ingredient=ingredient, name=alias_name, rank=next_rank)
                except IntegrityError:
                    # A concurrent request may have claimed the global alias.
                    continue

            unit = resolve_canonical_unit(nutrition.portion_name)
            if not unit:
                unit = MeasuringUnit.objects.filter(name__iexact="Gramm").first()
            portion_name = nutrition.portion_name or unit.name or "Stück"
            portion = Portion.objects.filter(
                ingredient=ingredient,
                name=portion_name,
                measuring_unit=unit,
                deleted_at__isnull=True,
            ).first()
            if not portion:
                from supply.choices import PortionWeightSource, PortionWeightStatus
                from supply.services.portion_resolution import is_piece_like_name

                weight = nutrition.portion_weight_g if nutrition.portion_weight_g > 0 else None
                piece_like = is_piece_like_name(portion_name)
                Portion.objects.create(
                    ingredient=ingredient,
                    name=portion_name,
                    measuring_unit=unit,
                    quantity=1.0,
                    weight_g=weight,
                    # AI-enriched piece weights are proposals, never silently
                    # trusted gram bases.
                    weight_status=(
                        PortionWeightStatus.AI_PROPOSED if piece_like and weight else PortionWeightStatus.IMPORTED
                    ),
                    weight_source=PortionWeightSource.AI if piece_like and weight else PortionWeightSource.IMPORT,
                )

        return ingredient

    return _match_or_create_ingredient(fallback_name, user)


def _match_or_create_ingredient(name: str, user: User | None) -> Ingredient:
    """Find an existing ingredient by name/alias or create a new one.

    Only matchable candidates are considered (readable Ingredients plus system drafts),
    never private Ingredients of other users.
    """
    from content.services.food_access import matchable_ingredient_queryset
    from supply.choices import IngredientStatusChoices
    from supply.models import Ingredient, IngredientAlias

    candidates = Ingredient.objects.filter(pk__in=matchable_ingredient_queryset(user).values("pk"))

    # Exact name match
    ingredient = candidates.filter(name__iexact=name).first()
    if ingredient:
        return ingredient

    # Alias match
    alias = (
        IngredientAlias.objects.filter(name__iexact=name, ingredient_id__in=candidates.values("pk"))
        .select_related("ingredient")
        .first()
    )
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
        status=IngredientStatusChoices.DRAFT,
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
    """Find or create a Portion for the given ingredient + measuring_unit combo.

    `item.quantity` from the AI is a raw amount *in `unit_str`* (e.g. "100" for
    unit "g"), which is stored as `RecipeItem.quantity` — a multiplier on
    whichever Portion is returned here. Matching on `measuring_unit` alone
    (ignoring `Portion.quantity`) is unsafe: an ingredient can have several
    portions sharing one measuring_unit at very different scales (e.g.
    "Packung" with weight_g=None/900 vs a canonical "1g" portion, both using
    measuring_unit "g"). Picking the wrong one silently multiplies/divides the
    stored quantity by that scale factor, producing nonsensical amounts (e.g.
    "125 Packungen Nudeln" or "0.11g Gouda" instead of "125g"/"100g").
    Prefer an exact name match first, then a canonical (quantity == 1) portion
    for the measuring_unit — never an arbitrary multiplier portion.
    """
    from supply.models import Portion

    name = unit_str or (measuring_unit.name if measuring_unit else "Stück")

    # Exact name match is the most precise signal (unambiguous regardless of unit).
    existing_by_name = Portion.objects.filter(
        ingredient=ingredient,
        name__iexact=name,
        deleted_at__isnull=True,
    ).first()
    if existing_by_name:
        return existing_by_name

    if measuring_unit:
        # Canonical portion: one "count" equals exactly one `measuring_unit`
        # (quantity == 1). Avoids matching "Packung"-style multiplier portions.
        from supply.services.portion_resolution import METRIC_UNIT_GRAMS, is_direct_metric_portion

        candidates = Portion.objects.filter(
            ingredient=ingredient,
            measuring_unit=measuring_unit,
            quantity=1,
            deleted_at__isnull=True,
        ).order_by("rank", "id")
        # For metric units only a true unit portion (weight == 1 unit) is canonical;
        # pre-weighed portions like "Dose 400g" share the Gramm unit but are counts.
        if (measuring_unit.name or "").strip().lower() in METRIC_UNIT_GRAMS:
            portion = next((p for p in candidates if is_direct_metric_portion(p)), None)
        else:
            portion = candidates.first()
        if portion:
            return portion

        raise ValueError(f"Für '{ingredient.name}' konnte keine gewichtete Portion für '{name}' ermittelt werden.")

    # No measuring_unit matched → reuse any existing portion for this ingredient
    portion = Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).order_by("rank", "id").first()
    if portion:
        return portion

    from supply.models import MeasuringUnit

    fallback_unit = MeasuringUnit.objects.filter(name__iexact="Gramm").first()
    if not fallback_unit:
        fallback_unit = MeasuringUnit.objects.create(name="Gramm")

    name = unit_str or "Stück"
    existing_by_name = Portion.objects.filter(
        ingredient=ingredient,
        name__iexact=name,
        deleted_at__isnull=True,
    ).first()
    if existing_by_name:
        return existing_by_name

    return Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=fallback_unit,
        name=name,
        quantity=1.0,
        weight_g=None,
        # A piece-like name without a resolvable measuring unit has no trusted
        # weight — it must stay unresolved instead of silently becoming 1 g.
        weight_status=PortionWeightStatus.UNKNOWN,
        weight_source=PortionWeightSource.AI,
        rank=(
            Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True)
            .order_by("-rank")
            .values_list("rank", flat=True)
            .first()
            or 0
        )
        + 1,
    )
