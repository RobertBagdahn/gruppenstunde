"""URL Import Service with Gemini-based ingredient matching and enrichment.

Orchestrates:
1. Fetch URL and parse recipe (schema.org / Gemini fallback)
2. Pre-filter ingredients via text search
3. Single Gemini + Google Search Grounding call for matching + new ingredient data
4. Create missing Ingredients with full nutritional data
5. Return draft recipe with RecipeItems
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from urllib.parse import urlparse

from django.contrib.auth.models import AbstractBaseUser
from django.db import IntegrityError, transaction
from django.db.models import Q
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call
from recipe.services.exceptions import NoRecipeFoundError
from supply.services.portion_knowledge import TYPICAL_UNIT_WEIGHTS_PROMPT_TEXT

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"

# Valid choice values for validation
VALID_RECIPE_TYPES = {"breakfast", "warm_meal", "cold_meal", "dessert", "recipe_part", "drink", "snack"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}
VALID_EXECUTION_TIMES = {"less_30", "30_60", "60_90", "more_90"}
VALID_PREPARATION_TIMES = {"none", "less_15", "15_30", "30_60", "more_60"}


def _validate_choice(value: str, valid_set: set[str], default: str) -> str:
    """Return value if valid, otherwise default."""
    return value if value in valid_set else default


def _minutes_to_execution_choice(minutes: int) -> str:
    """Map minutes to execution_time choice bucket."""
    if minutes < 30:
        return "less_30"
    elif minutes < 60:
        return "30_60"
    elif minutes < 90:
        return "60_90"
    return "more_90"


def _minutes_to_preparation_choice(minutes: int) -> str:
    """Map minutes to preparation_time choice bucket."""
    if minutes == 0:
        return "none"
    elif minutes < 15:
        return "less_15"
    elif minutes < 30:
        return "15_30"
    elif minutes < 60:
        return "30_60"
    return "more_60"


# ---------------------------------------------------------------------------
# Pydantic schemas for Gemini structured output
# ---------------------------------------------------------------------------


class GeminiIngredientMatch(BaseModel):
    """Single ingredient result from Gemini."""

    source_index: int = Field(
        -1,
        description="Zero-based index of the source ingredient this entry refers to. Echo it unchanged.",
    )
    original_name: str = Field(description="Original ingredient name from recipe")
    matched_ingredient_id: int | None = Field(None, description="ID of matched existing ingredient, or null if new")
    quantity: float = Field(description="Numeric quantity")
    unit: str = Field(description="Measuring unit (e.g. g, ml, EL, Stück)")
    note: str = Field("", description="Additional note (e.g. 'fein gewürfelt')")
    estimated_portion_weight_g: float = Field(
        100,
        description="Estimated weight in grams for one unit of this ingredient (e.g. 1 EL = 10g, 1 Stück Zwiebel = 120g, 1 g = 1g)",
    )
    # Fields for new ingredients (only if matched_ingredient_id is null)
    new_ingredient: GeminiNewIngredient | None = Field(None, description="Data for creating a new ingredient")


class GeminiNewIngredient(BaseModel):
    """Full ingredient data for creation via Gemini + Grounding."""

    name: str = Field(description="Canonical German name")
    aliases: list[str] = Field(default_factory=list, description="Alternative names")
    energy_kcal: float = Field(0, description="Energy per 100g in kcal")
    protein_g: float = Field(0, description="Protein per 100g")
    fat_g: float = Field(0, description="Fat per 100g")
    fat_sat_g: float | None = Field(None, description="Saturated fat per 100g")
    carbohydrate_g: float = Field(0, description="Carbohydrates per 100g")
    sugar_g: float = Field(0, description="Sugar per 100g")
    fibre_g: float = Field(0, description="Fibre per 100g")
    salt_g: float = Field(0, description="Salt per 100g")
    child_score: int = Field(5, ge=1, le=10, description="Child-friendliness 1-10")
    scout_score: int = Field(5, ge=1, le=10, description="Scout-suitability 1-10")
    environmental_score: int = Field(5, ge=1, le=10, description="Environmental impact 1-10")
    nova_score: int = Field(1, ge=1, le=4, description="NOVA processing level 1-4")
    nutri_score: int | None = Field(None, description="Nutri-Score points")
    nutri_class: int | None = Field(None, ge=1, le=5, description="Nutri-Score class 1=A to 5=E")
    physical_density: float = Field(1.0, description="Density g/ml")
    physical_viscosity: str = Field("solid", description="solid or beverage")
    portion_name: str = Field("Stück", description="Default portion name")
    portion_weight_g: float = Field(100, description="Weight of one portion in grams")


class GeminiRecipeExtraction(BaseModel):
    """Full Gemini response for recipe import."""

    title: str = Field(description="Recipe title")
    description: str = Field("", description="Recipe description/summary")
    summary: str = Field("", description="Short summary of the recipe (1-2 sentences)")
    servings: int | None = Field(None, ge=1, description="Number of servings")
    preparation_time: int | None = Field(None, description="Prep time in minutes")
    execution_time: int | None = Field(None, description="Cook/execution time in minutes")
    recipe_type: str = Field(
        "", description="One of: breakfast, warm_meal, cold_meal, dessert, recipe_part, drink, snack"
    )
    difficulty: str = Field("easy", description="One of: easy, medium, hard")
    execution_time_choice: str = Field("less_30", description="One of: less_30, 30_60, 60_90, more_90")
    preparation_time_choice: str = Field("none", description="One of: none, less_15, 15_30, 30_60, more_60")
    scout_level_ids: list[int] = Field(default_factory=list, description="IDs of suitable scout levels")
    tag_ids: list[str] = Field(default_factory=list, description="IDs of matching tags")
    steps: list[str] = Field(default_factory=list, description="Cooking steps")
    ingredients: list[GeminiIngredientMatch] = Field(default_factory=list, description="Matched/new ingredients")


# Need forward ref update since GeminiIngredientMatch references GeminiNewIngredient
GeminiIngredientMatch.model_rebuild()


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


class RecipeItemDraftResult:
    """A single recipe item in the draft response."""

    def __init__(
        self,
        ingredient_id: int,
        ingredient_name: str,
        quantity: float,
        measuring_unit_id: int | None,
        measuring_unit_name: str,
        note: str,
        is_new_ingredient: bool,
        portion_id: int | None = None,
        needs_unit_clarification: bool = False,
        suggested_unit_name: str = "",
        suggested_portion_weight_g: float | None = None,
        available_portions: list[dict[str, Any]] | None = None,
    ):
        self.ingredient_id = ingredient_id
        self.ingredient_name = ingredient_name
        self.quantity = quantity
        self.measuring_unit_id = measuring_unit_id
        self.measuring_unit_name = measuring_unit_name
        self.note = note
        self.is_new_ingredient = is_new_ingredient
        self.portion_id = portion_id
        # A null portion would be stored as grams (see RecipeItem.portion help
        # text), silently turning "4 Möhren" into "4 g". Such items must be
        # clarified by the user instead.
        self.needs_unit_clarification = needs_unit_clarification
        self.suggested_unit_name = suggested_unit_name
        self.suggested_portion_weight_g = suggested_portion_weight_g
        self.available_portions = available_portions or []


class CreatedIngredientResult:
    """Info about a newly created ingredient."""

    def __init__(self, id: int, name: str, aliases: list[str], nutri_class: int | None):
        self.id = id
        self.name = name
        self.aliases = aliases
        self.nutri_class = nutri_class


class UrlImportResult:
    """Complete result of URL import."""

    def __init__(
        self,
        title: str,
        description: str,
        summary: str,
        servings: int | None,
        preparation_time: int | None,
        execution_time: int | None,
        recipe_type: str,
        difficulty: str,
        execution_time_choice: str,
        preparation_time_choice: str,
        scout_level_ids: list[int],
        tag_ids: list[str],
        steps: list[str],
        source_url: str,
        recipe_items: list[RecipeItemDraftResult],
        created_ingredients: list[CreatedIngredientResult],
        image_url: str = "",
        is_reconstructed: bool = False,
        input_type: str = "url",
        ai_interaction_id: str | None = None,
    ):
        self.title = title
        self.description = description
        self.summary = summary
        self.servings = servings
        self.preparation_time = preparation_time
        self.execution_time = execution_time
        self.recipe_type = recipe_type
        self.difficulty = difficulty
        self.execution_time_choice = execution_time_choice
        self.preparation_time_choice = preparation_time_choice
        self.scout_level_ids = scout_level_ids
        self.tag_ids = tag_ids
        self.steps = steps
        self.source_url = source_url
        self.recipe_items = recipe_items
        self.created_ingredients = created_ingredients
        self.image_url = image_url
        # True when the page could not be fetched and the data was
        # reconstructed via search grounding, so the user must review it.
        self.is_reconstructed = is_reconstructed
        self.input_type = input_type
        self.ai_interaction_id = ai_interaction_id


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------


def import_recipe_from_url(
    url: str,
    user: AbstractBaseUser,
    *,
    parsed_override: Any | None = None,
    gemini_result_override: GeminiRecipeExtraction | None = None,
    input_type: str = "url",
    source_url: str | None = None,
) -> UrlImportResult:
    """Full URL import pipeline with IngredientMatcher + Gemini metadata."""
    from recipe.services.exceptions import SourceUnreachableError
    from recipe.services.import_service import import_from_url
    from recipe.services.ingredient_enrichment import enrich_ingredient
    from recipe.services.ingredient_matcher import IngredientMatcher

    # Step 1: Fetch and parse (schema.org / fallback)
    is_reconstructed = False
    if parsed_override is not None:
        parsed = parsed_override
    else:
        try:
            parsed = import_from_url(url)
        except SourceUnreachableError:
            # Many recipe sites block automated fetches. Reconstruct via search
            # grounding before giving up; only then report the source as
            # unreachable. A NoRecipeFoundError from the fallback would be
            # misleading, because the page itself was never readable.
            try:
                parsed = _reconstruct_recipe_via_search(url, user)
            except NoRecipeFoundError as fallback_exc:
                raise SourceUnreachableError(
                    "Seite blockiert und ueber die Websuche nicht rekonstruierbar."
                ) from fallback_exc
            is_reconstructed = True

    # Step 2: Gemini call for recipe metadata + quantity/unit parsing only
    if gemini_result_override is not None:
        gemini_result = gemini_result_override
        ai_interaction_id = None
    else:
        metadata_result = _call_gemini_for_metadata(
            parsed=parsed,
            user=user,
        )
        if isinstance(metadata_result, tuple):
            gemini_result, ai_interaction_id = metadata_result
        else:
            gemini_result, ai_interaction_id = metadata_result, None

    extracted_ingredients = _merge_ingredient_sources(parsed.ingredients, gemini_result.ingredients)

    if not (gemini_result.title or parsed.title) and not gemini_result.ingredients and not parsed.ingredients:
        raise NoRecipeFoundError("Keine verwertbaren Rezeptdaten gefunden")

    # Step 3: Match ingredients via IngredientMatcher (algorithmic cascading)
    created_ingredients: list[dict[str, Any]] = []
    matched_items: list[dict[str, Any]] = []

    for ing in extracted_ingredients:
        match_result = IngredientMatcher.match(ing.original_name, user)

        if match_result.ingredient_id:
            matched_items.append(
                {
                    "ingredient_id": match_result.ingredient_id,
                    "ingredient_name": match_result.name,
                    "quantity": ing.quantity,
                    "unit": ing.unit,
                    "note": match_result.note or ing.note,
                    "is_new_ingredient": match_result.is_new,
                    "estimated_portion_weight_g": ing.estimated_portion_weight_g,
                }
            )
            continue

        if match_result.needs_review:
            from django.utils.text import slugify

            from supply.choices import IngredientStatusChoices
            from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion
            from supply.services.generic_terms import generic_name_warning
            from supply.services.unit_resolution import resolve_canonical_unit

            raw_name = ing.original_name.strip()

            # Reuse existing ingredient or alias if available to prevent duplicate explosion
            existing_ing = (
                Ingredient.objects.filter(name__iexact=raw_name, deleted_at__isnull=True)
                .order_by("-usage_count", "id")
                .first()
            )
            if not existing_ing:
                alias = IngredientAlias.objects.filter(name__iexact=raw_name).select_related("ingredient").first()
                if alias and not alias.ingredient.is_deleted:
                    existing_ing = alias.ingredient

            if existing_ing:
                matched_items.append(
                    {
                        "ingredient_id": existing_ing.id,
                        "ingredient_name": existing_ing.name,
                        "quantity": ing.quantity,
                        "unit": ing.unit,
                        "note": match_result.note or ing.note,
                        "is_new_ingredient": False,
                        "estimated_portion_weight_g": ing.estimated_portion_weight_g,
                    }
                )
                continue

            base_slug = slugify(raw_name)
            slug = base_slug
            counter = 1
            while Ingredient.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            new_ing = Ingredient.objects.create(
                name=raw_name,
                slug=slug,
                status=IngredientStatusChoices.DRAFT,
            )

            nutrition = enrich_ingredient(raw_name, user)
            if nutrition and nutrition.name:
                from supply.choices import PhysicalViscosityChoices

                new_ing.name = nutrition.name
                new_ing.energy_kcal = nutrition.energy_kcal
                new_ing.protein_g = nutrition.protein_g
                new_ing.fat_g = nutrition.fat_g
                new_ing.fat_sat_g = nutrition.fat_sat_g
                new_ing.carbohydrate_g = nutrition.carbohydrate_g
                new_ing.sugar_g = nutrition.sugar_g
                new_ing.fibre_g = nutrition.fibre_g
                new_ing.salt_g = nutrition.salt_g
                new_ing.child_score = nutrition.child_score
                new_ing.scout_score = nutrition.scout_score
                new_ing.environmental_score = nutrition.environmental_score
                new_ing.nova_score = nutrition.nova_score
                new_ing.nutri_score = nutrition.nutri_score
                new_ing.nutri_class = nutrition.nutri_class
                new_ing.physical_density = nutrition.physical_density
                new_ing.physical_viscosity = (
                    PhysicalViscosityChoices.BEVERAGE
                    if nutrition.physical_viscosity in ("liquid", "beverage")
                    else PhysicalViscosityChoices.SOLID
                )
                new_ing.save()

                for alias_name in nutrition.aliases:
                    alias_str = alias_name.strip()
                    if not alias_str:
                        continue
                    if IngredientAlias.objects.filter(name__iexact=alias_str).exists():
                        continue
                    if Ingredient.objects.filter(name__iexact=alias_str).exists():
                        continue
                    try:
                        with transaction.atomic():
                            IngredientAlias.objects.create(ingredient=new_ing, name=alias_str)
                    except IntegrityError:
                        pass

                unit = resolve_canonical_unit(nutrition.portion_name)
                if unit is None:
                    unit = MeasuringUnit.objects.filter(name__iexact="Gramm").first()
                if unit is not None:
                    Portion.objects.get_or_create(
                        ingredient=new_ing,
                        name=nutrition.portion_name or unit.name,
                        measuring_unit=unit,
                        quantity=1.0,
                        defaults={"weight_g": nutrition.portion_weight_g},
                    )

            created_ingredients.append(
                {
                    "id": new_ing.id,
                    "name": new_ing.name,
                    "aliases": list(new_ing.aliases.values_list("name", flat=True)),
                    "nutri_class": new_ing.nutri_class,
                    "name_warning": generic_name_warning(raw_name),
                }
            )

            matched_items.append(
                {
                    "ingredient_id": new_ing.id,
                    "ingredient_name": new_ing.name,
                    "quantity": ing.quantity,
                    "unit": ing.unit,
                    "note": match_result.note or ing.note,
                    "is_new_ingredient": True,
                    "estimated_portion_weight_g": ing.estimated_portion_weight_g,
                }
            )

    # Step 4: Resolve measuring units and build recipe items
    recipe_items = _build_recipe_items_v2(matched_items, created_ingredients)

    # Step 5: Resolve time choices
    execution_time_choice = gemini_result.execution_time_choice
    preparation_time_choice = gemini_result.preparation_time_choice
    if parsed.cook_time_minutes is not None:
        execution_time_choice = _minutes_to_execution_choice(parsed.cook_time_minutes)
    if parsed.prep_time_minutes is not None:
        preparation_time_choice = _minutes_to_preparation_choice(parsed.prep_time_minutes)

    from content.models.tags import ScoutLevel

    valid_scout_level_ids = set(
        ScoutLevel.objects.filter(id__in=gemini_result.scout_level_ids).values_list("id", flat=True)
    )

    return UrlImportResult(
        title=gemini_result.title or parsed.title,
        description=gemini_result.description or parsed.description,
        summary=gemini_result.summary,
        servings=parsed.servings or gemini_result.servings,
        preparation_time=parsed.prep_time_minutes or gemini_result.preparation_time,
        execution_time=parsed.cook_time_minutes or gemini_result.execution_time,
        recipe_type=_validate_choice(gemini_result.recipe_type, VALID_RECIPE_TYPES, ""),
        difficulty=_validate_choice(gemini_result.difficulty, VALID_DIFFICULTIES, "easy"),
        execution_time_choice=_validate_choice(execution_time_choice, VALID_EXECUTION_TIMES, "less_30"),
        preparation_time_choice=_validate_choice(preparation_time_choice, VALID_PREPARATION_TIMES, "none"),
        scout_level_ids=list(valid_scout_level_ids),
        tag_ids=[str(tag_id) for tag_id in gemini_result.tag_ids],
        steps=_merge_steps(parsed.steps, gemini_result.steps),
        source_url=url if source_url is None else source_url,
        recipe_items=recipe_items,
        image_url=parsed.image_url,
        is_reconstructed=is_reconstructed,
        input_type=input_type,
        created_ingredients=[
            CreatedIngredientResult(id=ci["id"], name=ci["name"], aliases=ci["aliases"], nutri_class=ci["nutri_class"])
            for ci in created_ingredients
        ],
        ai_interaction_id=ai_interaction_id,
    )


def classify_smart_input(value: str) -> str:
    """Classify smart input without exposing that heuristic to the frontend."""
    stripped = value.strip()
    parsed = urlparse(stripped)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return "url"
    has_quantity = bool(re.search(r"\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|el|tl|stk|stück|packung|dose)\b", stripped, re.I))
    has_recipe_sections = bool(re.search(r"\b(zutaten|zubereitung|portionen|personen)\b", stripped, re.I))
    if "\n" in stripped and (has_quantity or has_recipe_sections):
        return "text"
    return "prompt"


def extract_smart_recipe_input(
    value: str,
    user: AbstractBaseUser,
) -> tuple[str, Any, GeminiRecipeExtraction]:
    """Use Gemini to turn copied text or a recipe idea into import data."""
    from google.genai import types

    from recipe.services.import_service import ImportedIngredient, ImportedRecipe

    input_type = classify_smart_input(value)
    if input_type == "url":
        raise ValueError("URL-Eingaben müssen über den URL-Import verarbeitet werden")

    if input_type == "text":
        instruction = (
            "Extrahiere das folgende kopierte Rezept exakt. Übernimm vorhandene Mengen, Einheiten und Schritte "
            "und erfinde keine fehlenden Zutaten. Wenn es sich um eine reine Zutatenliste handelt, "
            "darfst du KEINE zusätzlichen Zutaten, Gewürze oder Kräuter hinzufügen."
        )
    else:
        instruction = (
            "Erstelle aus der folgenden Rezeptidee ein vollständiges, realistisches Rezept mit Zutaten, "
            "Mengen, Portionen und Zubereitungsschritten."
        )
    prompt = f"""{instruction}

EINGABE:
{value.strip()}

Antworte ausschließlich im angegebenen JSON-Format. Für jede Zutat müssen quantity, unit und original_name angegeben werden.
WICHTIG:
- Für Massen- und Volumeneinheiten ('g', 'ml') gilt immer 1g = 1g bzw. 1ml = 1g.
- Niemals Zutaten hinzuerfinden, die nicht in der EINGABE stehen."""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GeminiRecipeExtraction,
    )
    response, _interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="recipe_smart_input",
    )
    if response is None:
        raise GeminiUnavailableError()

    extracted = GeminiRecipeExtraction.model_validate_json(response.text)
    if not extracted.title or not (extracted.ingredients or extracted.steps):
        raise NoRecipeFoundError("Keine verwertbaren Rezeptdaten gefunden")
    parsed = ImportedRecipe(
        title=extracted.title,
        description=extracted.description,
        servings=extracted.servings,
        ingredients=[
            ImportedIngredient(
                name=item.original_name,
                quantity=str(item.quantity),
                unit=item.unit,
            )
            for item in extracted.ingredients
        ],
        steps=extracted.steps,
        source_url="",
        prep_time_minutes=extracted.preparation_time,
        cook_time_minutes=extracted.execution_time,
    )
    return input_type, parsed, extracted


class GroundedIngredient(BaseModel):
    """One ingredient of a recipe reconstructed via search grounding."""

    name: str = Field(description="Zutatenname ohne Menge und Einheit")
    quantity: str = Field("", description="Menge als Zahl, z.B. '300'")
    unit: str = Field("", description="Einheit, z.B. g, ml, EL, TL, Stück")


class GroundedRecipe(BaseModel):
    """Recipe data reconstructed from the web when the page cannot be fetched."""

    found: bool = Field(description="Ob ein Rezept zu dieser URL gefunden wurde")
    title: str = Field("", description="Rezepttitel")
    description: str = Field("", description="Beschreibung oder Zubereitungstext")
    servings: int | None = Field(None, description="Anzahl Portionen des Originalrezepts")
    ingredients: list[GroundedIngredient] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list, description="Zubereitungsschritte")
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None


def _reconstruct_recipe_via_search(url: str, user: AbstractBaseUser):
    """Rebuild recipe data from the web when the page itself is unreachable.

    Many recipe sites block automated fetches. Instead of failing outright, the
    model is asked to look the URL up via Google Search Grounding. The caller
    marks the result as reconstructed so the user reviews it.

    Raises `NoRecipeFoundError` when nothing usable could be reconstructed.
    """
    from google.genai import types

    from recipe.services.import_service import ImportedIngredient, ImportedRecipe

    prompt = f"""Diese Rezeptseite konnte nicht abgerufen werden: {url}

Suche im Web nach genau diesem Rezept und rekonstruiere seine Daten.
Nutze ausschliesslich Informationen, die du tatsaechlich findest.

- found: true nur, wenn du das Rezept sicher identifizieren konntest.
- ingredients: Name OHNE Mengen- und Einheitenpraefix, Menge und Einheit getrennt.
- servings: Portionsanzahl des Originalrezepts.
- steps: Zubereitungsschritte in der richtigen Reihenfolge.

Wenn du das Rezept nicht findest, setze found=false und lasse die Felder leer."""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GroundedRecipe,
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )

    response, _interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="url_import_grounding_fallback",
    )
    if response is None:
        raise GeminiUnavailableError()

    data = GroundedRecipe.model_validate_json(response.text)
    if not data.found or not data.title or not (data.ingredients or data.steps):
        raise NoRecipeFoundError("Kein Rezept ueber die Websuche rekonstruierbar")

    return ImportedRecipe(
        title=data.title,
        description=data.description,
        servings=data.servings,
        ingredients=[
            ImportedIngredient(name=item.name, quantity=item.quantity, unit=item.unit) for item in data.ingredients
        ],
        steps=data.steps,
        image_url="",
        source_url=url,
        prep_time_minutes=data.prep_time_minutes,
        cook_time_minutes=data.cook_time_minutes,
    )


def _parse_import_quantity(value: str) -> float:
    """Convert a parser quantity into the numeric form used by recipe items."""
    try:
        return float(value.replace(",", ".")) if value else 1.0
    except ValueError:
        return 1.0


def _ingredient_key(value: str) -> str:
    """Normalize an ingredient name for fallback matching.

    Leading quantity and unit tokens are stripped, because models frequently
    echo the full source line ("300 g Hähnchenbrustfilet(s)") instead of the
    bare name.
    """
    cleaned = " ".join(value.lower().split())
    cleaned = re.sub(r"^[\d.,/\s]+", "", cleaned)
    cleaned = re.sub(
        r"^(g|kg|ml|l|el|tl|msp|prise[n]?|pck\.?|packung|bd\.?|bund|stk\.?|stück|dose[n]?|glas|tasse[n]?)\b\s*",
        "",
        cleaned,
    )
    return re.sub(r"[^\wäöüß]+", "", cleaned)


def _merge_ingredient_sources(
    parsed_ingredients: list[Any],
    gemini_ingredients: list[GeminiIngredientMatch],
) -> list[GeminiIngredientMatch]:
    """Combine parser and model output into exactly one entry per source ingredient.

    Matching is primarily done via the echoed `source_index`; a normalized-name
    lookup remains as a fallback for degraded responses. Every source
    ingredient yields exactly one result, so the pipeline cannot emit
    duplicated recipe items.
    """
    slots: list[GeminiIngredientMatch | None] = [None] * len(parsed_ingredients)
    name_to_index: dict[str, int] = {}
    for index, ingredient in enumerate(parsed_ingredients):
        name_to_index.setdefault(_ingredient_key(ingredient.name), index)

    leftovers: list[GeminiIngredientMatch] = []
    for entry in gemini_ingredients:
        index = entry.source_index
        if not (0 <= index < len(slots)) or slots[index] is not None:
            index = name_to_index.get(_ingredient_key(entry.original_name), -1)
        if 0 <= index < len(slots) and slots[index] is None:
            slots[index] = entry
        else:
            leftovers.append(entry)

    merged: list[GeminiIngredientMatch] = []
    for index, source in enumerate(parsed_ingredients):
        matched_entry = slots[index]
        if matched_entry is None:
            matched_entry = leftovers.pop(0) if leftovers else None
        if matched_entry is None:
            merged.append(
                GeminiIngredientMatch(
                    source_index=index,
                    original_name=source.name,
                    matched_ingredient_id=None,
                    quantity=_parse_import_quantity(source.quantity),
                    unit=source.unit,
                    note="",
                    estimated_portion_weight_g=100,
                    new_ingredient=None,
                )
            )
            continue
        # The parser is authoritative for values the model left empty.
        if not matched_entry.unit:
            matched_entry.unit = source.unit
        if not matched_entry.quantity:
            matched_entry.quantity = _parse_import_quantity(source.quantity)
        # The model only parses quantities and units here; ingredient matching
        # runs on the parser name. Echoing the model name would feed
        # "300 g Hähnchenbrustfilet(s)" into IngredientMatcher.
        matched_entry.original_name = source.name
        merged.append(matched_entry)

    return merged


def _merge_steps(source_steps: list[str], ai_steps: list[str]) -> list[str]:
    if not source_steps:
        return ai_steps
    if not ai_steps:
        return source_steps
    return list(dict.fromkeys([*source_steps, *ai_steps]))


# ---------------------------------------------------------------------------
# Step 2: Pre-filter ingredient candidates from DB
# ---------------------------------------------------------------------------


def _clean_ingredient_name(raw_name: str) -> list[str]:
    """Extract clean search terms from a raw ingredient name.

    Returns a list of search terms to try (best match first).
    E.g. "m.-große Möhre(n)" -> ["Möhre", "Möhren"]
         "Petersilie (gehackte)" -> ["Petersilie"]
         "Hähnchenbrustfilet(s)" -> ["Hähnchenbrustfilet", "Hähnchenbrustfilets"]
    """
    import re

    name = raw_name.strip()

    # Remove parenthetical descriptions: "Petersilie (gehackte)" -> "Petersilie"
    name = re.sub(r"\s*\([^)]*[a-zA-ZäöüÄÖÜß]{3,}[^)]*\)", "", name)

    # Handle "(s)" and "(n)" plural markers
    # "Hähnchenbrustfilet(s)" -> base="Hähnchenbrustfilet", also try with suffix
    plural_match = re.search(r"(\w+)\(([sn])\)", name)
    if plural_match:
        base = plural_match.group(1)
        suffix = plural_match.group(2)
        name = re.sub(r"\(\w\)", "", name)  # Remove all (x) markers
        variants = [name.strip()]
        # Also try the plural form
        variants.append(base + suffix)
    else:
        variants = [name.strip()]

    # Remove size/quantity prefixes: "m.-große", "große", "kleine", "mittelgroße"
    size_prefixes = re.compile(
        r"^(m\.\s*-?\s*große|mittelgroße|große|kleine|dicke|dünne|frische|getrocknete|gehackte|geriebene|geschälte)\s+",
        re.IGNORECASE,
    )
    cleaned_variants = []
    for v in variants:
        cleaned = size_prefixes.sub("", v).strip()
        if cleaned:
            cleaned_variants.append(cleaned)
        if cleaned != v and v.strip():
            cleaned_variants.append(v.strip())

    # Deduplicate while preserving order
    seen = set()
    result = []
    for v in cleaned_variants:
        lower = v.lower()
        if lower not in seen and lower:
            seen.add(lower)
            result.append(v)

    return result or [raw_name.strip()]


def _get_ingredient_candidates(
    ingredients: list,
) -> dict[str, list[dict[str, Any]]]:
    """For each extracted ingredient name, find DB candidates via multi-strategy search."""
    from django.contrib.postgres.search import TrigramSimilarity

    from supply.models import Ingredient, IngredientAlias

    candidates: dict[str, list[dict[str, Any]]] = {}

    for ing in ingredients:
        raw_name = ing.name.strip()
        if not raw_name:
            continue

        search_terms = _clean_ingredient_name(raw_name)
        found_ids: set[int] = set()
        results: list[dict[str, Any]] = []

        for term in search_terms:
            if len(results) >= 8:
                break

            # Strategy 1: Exact name match (case-insensitive)
            exact = Ingredient.objects.filter(name__iexact=term).exclude(id__in=found_ids)[:3]
            for i in exact:
                if i.id not in found_ids:
                    found_ids.add(i.id)
                    results.append(
                        {
                            "id": i.id,
                            "name": i.name,
                            "aliases": list(i.aliases.values_list("name", flat=True)),
                        }
                    )

            if len(results) >= 8:
                break

            # Strategy 2: Alias exact match
            alias_exact = (
                IngredientAlias.objects.filter(name__iexact=term)
                .select_related("ingredient")
                .exclude(ingredient_id__in=found_ids)[:3]
            )
            for a in alias_exact:
                if a.ingredient_id not in found_ids:
                    found_ids.add(a.ingredient_id)
                    results.append(
                        {
                            "id": a.ingredient_id,
                            "name": a.ingredient.name,
                            "aliases": list(a.ingredient.aliases.values_list("name", flat=True)),
                        }
                    )

            if len(results) >= 8:
                break

            # Strategy 3: startswith / contains
            partial = (
                Ingredient.objects.filter(Q(name__istartswith=term) | Q(name__icontains=term))
                .exclude(id__in=found_ids)
                .distinct()[:3]
            )
            for i in partial:
                if i.id not in found_ids:
                    found_ids.add(i.id)
                    results.append(
                        {
                            "id": i.id,
                            "name": i.name,
                            "aliases": list(i.aliases.values_list("name", flat=True)),
                        }
                    )

            if len(results) >= 8:
                break

            # Strategy 4: Trigram similarity (fuzzy matching)
            if len(term) >= 4:
                trigram = (
                    Ingredient.objects.annotate(similarity=TrigramSimilarity("name", term))
                    .filter(similarity__gt=0.3)
                    .exclude(id__in=found_ids)
                    .order_by("-similarity")[:3]
                )
                for i in trigram:
                    if i.id not in found_ids:
                        found_ids.add(i.id)
                        results.append(
                            {
                                "id": i.id,
                                "name": i.name,
                                "aliases": list(i.aliases.values_list("name", flat=True)),
                            }
                        )

        candidates[raw_name] = results[:8]

    return candidates


# ---------------------------------------------------------------------------
# Step 3: Gemini call
# ---------------------------------------------------------------------------


def _call_gemini_for_matching(
    parsed: Any,
    candidates: dict[str, list[dict[str, Any]]],
    user: AbstractBaseUser,
) -> GeminiRecipeExtraction:
    """Single Gemini call with Google Search Grounding for ingredient matching + enrichment."""
    from google.genai import types

    from content.models.tags import ScoutLevel, Tag

    # Load DB lists for scout levels and tags
    scout_levels = list(ScoutLevel.objects.values("id", "name"))
    tags = [{"id": str(tag["id"]), "name": tag["name"]} for tag in Tag.objects.values("id", "name")]

    scout_levels_str = json.dumps(scout_levels, ensure_ascii=False)
    tags_str = json.dumps(tags, ensure_ascii=False)

    # Build prompt
    ingredients_context = ""
    for ing_name, cands in candidates.items():
        if cands:
            cand_str = ", ".join(f"[id={c['id']}] {c['name']} (aliases: {', '.join(c['aliases'])})" for c in cands)
            ingredients_context += f'- "{ing_name}" → Kandidaten: {cand_str}\n'
        else:
            ingredients_context += f'- "{ing_name}" → Keine Kandidaten gefunden\n'

    # Recipe text from parsed data
    recipe_text = f"""Titel: {parsed.title}
Beschreibung: {parsed.description}
Portionen: {parsed.servings}
Zutaten: {", ".join(f"{i.quantity} {i.unit} {i.name}" for i in parsed.ingredients)}
Schritte: {chr(10).join(parsed.steps[:10])}"""

    prompt = f"""Du bist ein Ernährungsexperte. Analysiere dieses Rezept und ordne die Zutaten zu.

REZEPT:
{recipe_text}

EXISTIERENDE ZUTATEN IN DER DATENBANK (zum Matching):
{ingredients_context}

VERFÜGBARE PFADFINDER-STUFEN (wähle alle passenden IDs):
{scout_levels_str}

VERFÜGBARE TAGS (wähle alle passenden IDs):
{tags_str}

AUFGABEN:
1. Extrahiere/validiere die Rezept-Metadaten (title, description, summary, servings, preparation_time, execution_time, steps)
2. Schätze folgende Felder:
   - summary: Kurzbeschreibung in 1-2 Sätzen
   - recipe_type: MUSS einer dieser Werte sein: breakfast, warm_meal, cold_meal, dessert, recipe_part, drink, snack
   - difficulty: MUSS sein: easy, medium, hard
   - execution_time_choice: MUSS sein: less_30, 30_60, 60_90, more_90 (basierend auf Gesamtkochzeit)
   - preparation_time_choice: MUSS sein: none, less_15, 15_30, 30_60, more_60 (basierend auf Vorbereitungszeit)
   - scout_level_ids: Passende Altersgruppen aus obiger Liste
   - tag_ids: Passende Tags aus obiger Liste
3. Für jede Zutat:
   a) Prüfe ob ein Kandidat aus der DB passt (semantisch, nicht nur String-Match). Wenn ja: setze matched_ingredient_id
   b) Wenn kein Match: erstelle new_ingredient mit ALLEN Feldern (Nährwerte pro 100g, Scores, physikalische Eigenschaften)
   c) estimated_portion_weight_g: Gewicht einer Einheit in Gramm. {TYPICAL_UNIT_WEIGHTS_PROMPT_TEXT} Zusätzlich ingredient-spezifisch schätzen (z.B. 1 Stück Zwiebel = 80g, 1 Stück Tomate = 120g, 1 Stück Champignon = 20g, 1 Stück Paprika = 150g, 1 Packung/Pck. = Packungsgewicht z.B. 200g bei Feta, 400g bei Dosentomaten)
4. Nährwerte müssen realistisch und korrekt sein (recherchiere via Google wenn nötig)
5. quantity und unit aus dem Rezept-Kontext korrekt parsen:
   - "2 rote Zwiebeln" → quantity=2, unit="Stück", note="rot"
   - "0.25 Pck. Feta" → quantity=0.25, unit="Packung", estimated_portion_weight_g=200
   - "2 kleine Champignons" → quantity=2, unit="Stück", note="klein", estimated_portion_weight_g=15
   - "1 Dose Tomaten (400g)" → quantity=400, unit="g"
   - "etwas Petersilie" → quantity=1, unit="EL", note="etwas"
   - Abkürzungen auflösen: Pck.=Packung, Bd.=Bund, EL=Esslöffel, TL=Teelöffel, Msp.=Messerspitze

WICHTIGE REGELN FÜR ZUTATEN:
- VERBOTEN: Zutaten mit "und" im Namen (z.B. "Salz und Pfeffer" ist VERBOTEN)
- Jede Zutat ist genau eine Sache — niemals zwei Zutaten mit "und" verbinden
- "Salz und Pfeffer nach Geschmack" → diese Zutat WEGLASSEN (Grundausstattung)
- "Salz" alleine → WEGLASSEN (zu generisch, Grundausstattung)
- "Pfeffer" alleine → WEGLASSEN (zu generisch, Grundausstattung)
- "Wasser" alleine → WEGLASSEN (Grundausstattung)
- Für neue Zutaten (new_ingredient.name): MUSS immer eine Zustandsform enthalten
  Erlaubt: "Zwiebel frisch", "Erdbeere frisch", "Erdbeere TK", "Fusilli trocken", "Tomaten aus der Dose", "Hähnchenbrust frisch"
  VERBOTEN: "Nudeln", "Erdbeere", "Zwiebel", "Tomaten" (zu generisch, keine Zustandsform)
  Zustandsformen: frisch, tiefgefroren (TK), getrocknet, geräuchert, aus der Dose, eingelegt, gemahlen, gerieben, geröstet

physical_viscosity muss sein: solid, beverage

Antworte ausschließlich im angegebenen JSON-Format."""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GeminiRecipeExtraction,
    )

    response, _interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="url_import_matching",
    )

    if response is None:
        raise GeminiUnavailableError()

    return GeminiRecipeExtraction.model_validate_json(response.text)


# ---------------------------------------------------------------------------
# Simplified Gemini call: metadata + quantity/unit only (no ingredient matching)
# ---------------------------------------------------------------------------


def _call_gemini_for_metadata(
    parsed: Any,
    user: AbstractBaseUser,
) -> tuple[GeminiRecipeExtraction, str | None]:
    """Gemini call for recipe metadata and quantity/unit parsing only.

    No ingredient matching — that is handled by IngredientMatcher.
    No nutritional enrichment — that is handled by enrich_ingredient().
    """
    from google.genai import types

    from content.models.tags import ScoutLevel, Tag

    scout_levels = list(ScoutLevel.objects.values("id", "name"))
    tags = [{"id": str(tag["id"]), "name": tag["name"]} for tag in Tag.objects.values("id", "name")]

    scout_levels_str = json.dumps(scout_levels, ensure_ascii=False)
    tags_str = json.dumps(tags, ensure_ascii=False)

    # The ingredients are passed as an indexed list with separate fields. A
    # concatenated "300 g Mehl" string makes the model echo the whole string as
    # `original_name`, which then no longer matches the parser entry and
    # produces duplicated recipe items.
    ingredient_lines = "\n".join(
        f"  [{index}] menge={ingredient.quantity!r} einheit={ingredient.unit!r} name={ingredient.name!r}"
        for index, ingredient in enumerate(parsed.ingredients)
    )
    recipe_text = f"""Titel: {parsed.title}
Beschreibung: {parsed.description}
Portionen: {parsed.servings}
Zutaten (indiziert):
{ingredient_lines}
Schritte: {chr(10).join(parsed.steps[:10])}"""

    prompt = f"""Du bist ein Ernährungsexperte. Analysiere dieses Rezept und extrahiere Metadaten.

REZEPT:
{recipe_text}

VERFÜGBARE PFADFINDER-STUFEN (wähle alle passenden IDs):
{scout_levels_str}

VERFÜGBARE TAGS (wähle alle passenden IDs):
{tags_str}

AUFGABEN:
1. Extrahiere/validiere die Rezept-Metadaten (title, description, summary, servings, preparation_time, execution_time, steps)
2. Schätze folgende Felder:
   - summary: Kurzbeschreibung in 1-2 Sätzen
   - recipe_type: MUSS einer dieser Werte sein: breakfast, warm_meal, cold_meal, dessert, recipe_part, drink, snack
   - difficulty: MUSS sein: easy, medium, hard
   - execution_time_choice: MUSS sein: less_30, 30_60, 60_90, more_90
   - preparation_time_choice: MUSS sein: none, less_15, 15_30, 30_60, more_60
   - scout_level_ids: Passende Altersgruppen
   - tag_ids: Passende Tags
3. Für jede Zutat: quantity und unit aus dem Rezept-Kontext parsen (KEIN Ingredient-Matching, KEIN new_ingredient):
   - Gib GENAU EINEN Eintrag pro indizierter Quellzutat zurück, in derselben Reihenfolge.
   - source_index: MUSS der Index [n] der Quellzutat sein, unverändert übernommen.
   - original_name: MUSS exakt der Wert aus name=... sein, OHNE Mengen- oder Einheitenangabe.
   - "2 rote Zwiebeln" → quantity=2, unit="Stück"
   - "0.25 Pck. Feta" → quantity=0.25, unit="Packung"
   - "200g Mehl" → quantity=200, unit="g"
   - Abkürzungen auflösen: Pck.=Packung, Bd.=Bund, EL=Esslöffel, TL=Teelöffel
   - estimated_portion_weight_g schätzen. {TYPICAL_UNIT_WEIGHTS_PROMPT_TEXT} Zusätzlich ingredient-spezifisch (z.B. 1 Zwiebel=80g)

Antworte ausschließlich im angegebenen JSON-Format."""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GeminiRecipeExtraction,
    )

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="url_import_metadata",
    )

    if response is None:
        raise GeminiUnavailableError()

    return GeminiRecipeExtraction.model_validate_json(response.text), str(interaction_id) if interaction_id else None


# ---------------------------------------------------------------------------
# Step 4: Create new ingredients (DEPRECATED — kept for backward compat)
# ---------------------------------------------------------------------------


def _create_new_ingredients(
    ingredients: list[GeminiIngredientMatch],
) -> list[dict[str, Any]]:
    """Create new Ingredient records for unmatched items."""
    from supply.choices import IngredientStatusChoices, PhysicalViscosityChoices
    from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion
    from supply.services.generic_terms import generic_name_warning
    from supply.services.term_normalization import normalize_term

    created: list[dict[str, Any]] = []

    # Normalized-name -> ingredient_id map, used as a fallback reuse path
    # (never the sole criterion) so singular/plural variants (e.g.
    # "Kartoffel"/"Kartoffeln") reuse the existing ingredient instead of
    # creating a duplicate.
    normalized_index: dict[str, int] = {}
    for ing_id, ing_name in Ingredient.objects.values_list("id", "name"):
        normalized_index.setdefault(normalize_term(ing_name), ing_id)
    for alias_ing_id, alias_name in IngredientAlias.objects.values_list("ingredient_id", "name"):
        normalized_index.setdefault(normalize_term(alias_name), alias_ing_id)

    for ing in ingredients:
        if ing.matched_ingredient_id is not None or ing.new_ingredient is None:
            continue

        data = ing.new_ingredient

        # Check if ingredient with same name already exists – reuse it
        existing = Ingredient.objects.filter(name__iexact=data.name).first()

        # Normalized (stemmed) match — additional fallback path
        if not existing:
            normalized = normalize_term(data.name)
            matched_id = normalized_index.get(normalized) if normalized else None
            if matched_id:
                existing = Ingredient.objects.filter(id=matched_id).first()

        if existing:
            ing.matched_ingredient_id = existing.id
            created.append(
                {
                    "id": existing.id,
                    "name": existing.name,
                    "aliases": [],
                    "nutri_class": data.nutri_class,
                    # Warning is based on the originally requested name, not
                    # the (possibly more specific) reused ingredient's name.
                    "name_warning": generic_name_warning(data.name),
                }
            )
            continue

        # Map viscosity
        viscosity = PhysicalViscosityChoices.SOLID
        if data.physical_viscosity in ("liquid", "beverage"):
            viscosity = PhysicalViscosityChoices.BEVERAGE

        ingredient = Ingredient.objects.create(
            name=data.name,
            status=IngredientStatusChoices.DRAFT,
            energy_kcal=data.energy_kcal,
            protein_g=data.protein_g,
            fat_g=data.fat_g,
            fat_sat_g=data.fat_sat_g,
            carbohydrate_g=data.carbohydrate_g,
            sugar_g=data.sugar_g,
            fibre_g=data.fibre_g,
            salt_g=data.salt_g,
            child_score=data.child_score,
            scout_score=data.scout_score,
            environmental_score=data.environmental_score,
            nova_score=data.nova_score,
            nutri_score=data.nutri_score,
            nutri_class=data.nutri_class,
            physical_density=data.physical_density,
            physical_viscosity=viscosity,
        )

        # Create aliases
        for alias_name in data.aliases:
            IngredientAlias.objects.create(
                ingredient=ingredient,
                name=alias_name,
            )

        # Create default portion
        from supply.services.unit_resolution import resolve_canonical_unit

        unit = resolve_canonical_unit(data.portion_name)
        if not unit:
            unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm")

        portion_name = data.portion_name.strip() if data.portion_name else unit.name
        if not portion_name:
            portion_name = "Stück"

        weight = data.portion_weight_g if data.portion_weight_g and data.portion_weight_g > 0 else None

        Portion.objects.get_or_create(
            ingredient=ingredient,
            name=portion_name,
            measuring_unit=unit,
            quantity=1.0,
            defaults={
                "weight_g": weight,
            },
        )

        # Store the ID on the match object for later reference
        ing.matched_ingredient_id = ingredient.id

        created.append(
            {
                "id": ingredient.id,
                "name": data.name,
                "aliases": data.aliases,
                "nutri_class": data.nutri_class,
                "name_warning": generic_name_warning(data.name),
            }
        )

    return created


# ---------------------------------------------------------------------------
# Step 5: Build recipe items
# ---------------------------------------------------------------------------


def _build_recipe_items(
    ingredients: list[GeminiIngredientMatch],
    created_ingredients: list[dict[str, Any]],
) -> list[RecipeItemDraftResult]:
    """Map Gemini results to RecipeItemDraftResult list with portion resolution."""
    from supply.models import Ingredient, MeasuringUnit

    results: list[RecipeItemDraftResult] = []
    created_ids = {ci["id"] for ci in created_ingredients}

    for ing in ingredients:
        ingredient_id = ing.matched_ingredient_id
        if ingredient_id is None:
            continue

        # Get ingredient name
        try:
            ingredient = Ingredient.objects.get(id=ingredient_id)
            ingredient_name = ingredient.name
        except Ingredient.DoesNotExist:
            continue

        # Resolve measuring unit
        measuring_unit_id = None
        measuring_unit_name = ing.unit
        if ing.unit:
            # Normalize common abbreviations
            unit_aliases = {
                "Pck.": "Packung",
                "Pck": "Packung",
                "Pkg.": "Packung",
                "Pkg": "Packung",
                "Bd.": "Bund",
                "Bd": "Bund",
                "Msp.": "Messerspitze",
                "Msp": "Messerspitze",
                "kl.": "Stück",
                "gr.": "Stück",
            }
            normalized_unit = unit_aliases.get(ing.unit, ing.unit)
            mu = MeasuringUnit.objects.filter(
                Q(name__iexact=normalized_unit)
                | Q(description__iexact=normalized_unit)
                | Q(name__iexact=ing.unit)
                | Q(description__iexact=ing.unit)
            ).first()
            if mu:
                measuring_unit_id = mu.id
                measuring_unit_name = mu.name
            elif normalized_unit != ing.unit:
                # Create the unit with the normalized name
                mu, _ = MeasuringUnit.objects.get_or_create(name=normalized_unit)
                measuring_unit_id = mu.id
                measuring_unit_name = mu.name

        # Resolve or create portion
        portion_id = _resolve_portion(
            ingredient_id=ingredient_id,
            measuring_unit_id=measuring_unit_id,
            estimated_weight_g=ing.estimated_portion_weight_g,
            unit_name=ing.unit,
            portion_quantity=1.0,
        )

        results.append(
            RecipeItemDraftResult(
                ingredient_id=ingredient_id,
                ingredient_name=ingredient_name,
                quantity=ing.quantity,
                measuring_unit_id=measuring_unit_id,
                measuring_unit_name=measuring_unit_name,
                note=ing.note,
                is_new_ingredient=ingredient_id in created_ids,
                portion_id=portion_id,
            )
        )

    return results


def _build_recipe_items_v2(
    matched_items: list[dict[str, Any]],
    created_ingredients: list[dict[str, Any]],
) -> list[RecipeItemDraftResult]:
    """Build recipe items from IngredientMatcher results (v2 — no Gemini note)."""
    from supply.models import Ingredient

    results: list[RecipeItemDraftResult] = []
    created_ids = {ci["id"] for ci in created_ingredients}

    for item in matched_items:
        ingredient_id = item["ingredient_id"]
        if ingredient_id is None:
            continue

        try:
            ingredient = Ingredient.objects.get(id=ingredient_id)
            ingredient_name = ingredient.name
        except Ingredient.DoesNotExist:
            continue

        unit_str = item.get("unit", "")
        measuring_unit_id = None
        measuring_unit_name = unit_str
        if unit_str:
            from supply.services.unit_resolution import resolve_canonical_unit

            mu = resolve_canonical_unit(unit_str)
            if mu:
                measuring_unit_id = mu.id
                measuring_unit_name = mu.name

        portion_id = _resolve_portion(
            ingredient_id=ingredient_id,
            measuring_unit_id=measuring_unit_id,
            estimated_weight_g=item.get("estimated_portion_weight_g", 100),
            unit_name=unit_str,
            portion_quantity=1.0,
        )

        # Without a portion the quantity would be interpreted as grams. Flag
        # the item so the wizard can ask the user for the missing unit.
        needs_clarification = portion_id is None
        suggested_weight = item.get("estimated_portion_weight_g") or None
        available_portions = (
            [
                {
                    "id": portion.id,
                    "name": portion.name,
                    "quantity": portion.quantity,
                    "weight_g": portion.weight_g,
                    "measuring_unit_id": portion.measuring_unit_id,
                    "measuring_unit_name": portion.measuring_unit.name if portion.measuring_unit else None,
                }
                for portion in ingredient.portions.filter(deleted_at__isnull=True)
                .select_related("measuring_unit")
                .order_by("rank", "id")
            ]
            if needs_clarification
            else []
        )

        results.append(
            RecipeItemDraftResult(
                ingredient_id=ingredient_id,
                ingredient_name=ingredient_name,
                quantity=item.get("quantity", 1.0),
                measuring_unit_id=measuring_unit_id,
                measuring_unit_name=measuring_unit_name,
                note=item.get("note", ""),
                is_new_ingredient=ingredient_id in created_ids,
                portion_id=portion_id,
                needs_unit_clarification=needs_clarification,
                suggested_unit_name=unit_str if needs_clarification else "",
                suggested_portion_weight_g=suggested_weight if needs_clarification else None,
                available_portions=available_portions,
            )
        )

    return results


METRIC_BASE_UNITS = {"g", "gramm", "kg", "kilogramm", "ml", "milliliter", "l", "liter"}
METRIC_CANONICAL_WEIGHTS = {
    "g": 1.0,
    "gramm": 1.0,
    "kg": 1000.0,
    "kilogramm": 1000.0,
    "ml": 1.0,
    "milliliter": 1.0,
    "l": 1000.0,
    "liter": 1000.0,
}


def _should_update_weight(portion, estimated_weight_g: float) -> bool:
    """Check if a portion's weight_g should be updated with Gemini's estimate."""
    if estimated_weight_g <= 0:
        return False
    # Never update metric mass/volume portions (weight_g is fixed physically)
    unit_name = portion.measuring_unit.name.lower() if portion.measuring_unit else ""
    if unit_name in METRIC_BASE_UNITS:
        return False
    # Update if weight_g is None (missing)
    if portion.weight_g is None:
        return True
    # Update if weight_g is a placeholder (<=1.0) and estimate is larger
    if portion.weight_g <= 1.0 and estimated_weight_g > 1.0:
        return True
    return False


def _resolve_portion(
    ingredient_id: int,
    measuring_unit_id: int | None,
    estimated_weight_g: float,
    unit_name: str,
    portion_quantity: float = 1.0,
) -> int | None:
    """Find or create a portion without mutating referenced definitions."""
    from supply.models import MeasuringUnit, Portion

    p_name = unit_name.strip() if unit_name else ""
    if not p_name and measuring_unit_id:
        p_name = MeasuringUnit.objects.get(id=measuring_unit_id).name

    unit_name_lower = ""
    is_metric_base = False
    metric_base_weight = 1.0
    if measuring_unit_id:
        mu = MeasuringUnit.objects.filter(id=measuring_unit_id).first()
        if mu:
            unit_name_lower = mu.name.lower()
            is_metric_base = unit_name_lower in METRIC_BASE_UNITS
            metric_base_weight = METRIC_CANONICAL_WEIGHTS.get(unit_name_lower, 1.0)

    # For metric mass/volume units: prioritize an authentic 1g/1ml portion with valid weight.
    # This prevents selecting legacy/corrupt portions (e.g. a 'Stück' portion mistakenly given unit=Gramm).
    if is_metric_base:
        metric_portion = (
            Portion.objects.filter(
                ingredient_id=ingredient_id,
                name__iexact=p_name,
                deleted_at__isnull=True,
            )
            .order_by("id")
            .first()
        )
        if not metric_portion and measuring_unit_id:
            metric_portion = (
                Portion.objects.filter(
                    ingredient_id=ingredient_id,
                    measuring_unit_id=measuring_unit_id,
                    quantity=portion_quantity,
                    name__in=["g", "Gramm", "gramm", "ml", "Milliliter", "milliliter", "kg", "l"],
                    deleted_at__isnull=True,
                )
                .order_by("id")
                .first()
            )
        if metric_portion:
            if metric_portion.weight_g != metric_base_weight and not metric_portion.recipe_items.exists():
                metric_portion.weight_g = metric_base_weight
                metric_portion.save(update_fields=["weight_g"])
            return metric_portion.id

    # Match the complete portion identity, not an arbitrary portion for a unit.
    if measuring_unit_id:
        unit = MeasuringUnit.objects.get(id=measuring_unit_id)
        unit_query = Portion.objects.filter(
            ingredient_id=ingredient_id,
            measuring_unit_id=measuring_unit_id,
            quantity=portion_quantity,
            deleted_at__isnull=True,
        )
        if not is_metric_base:
            unit_query = unit_query.exclude(rank=9999)
        existing_unit_portion = unit_query.order_by("id").first()

        if existing_unit_portion is None:
            fallback_query = Portion.objects.filter(
                ingredient_id=ingredient_id,
                measuring_unit__name__iexact=unit.name,
                quantity=portion_quantity,
                deleted_at__isnull=True,
            )
            if not is_metric_base:
                fallback_query = fallback_query.exclude(rank=9999)
            existing_unit_portion = fallback_query.order_by("id").first()

        if existing_unit_portion:
            if is_metric_base:
                if (
                    existing_unit_portion.weight_g != metric_base_weight
                    and not existing_unit_portion.recipe_items.exists()
                ):
                    existing_unit_portion.weight_g = metric_base_weight
                    existing_unit_portion.save(update_fields=["weight_g"])
                return existing_unit_portion.id
            if not existing_unit_portion.recipe_items.exists():
                if _should_update_weight(existing_unit_portion, estimated_weight_g):
                    update_fields = ["weight_g"]
                    existing_unit_portion.weight_g = estimated_weight_g
                    if p_name and p_name.lower() != existing_unit_portion.name.lower():
                        if (
                            not Portion.objects.filter(
                                ingredient_id=ingredient_id,
                                name__iexact=p_name,
                                deleted_at__isnull=True,
                            )
                            .exclude(id=existing_unit_portion.id)
                            .exists()
                        ):
                            existing_unit_portion.name = p_name
                            update_fields.append("name")
                    existing_unit_portion.save(update_fields=update_fields)
                return existing_unit_portion.id
            elif (
                estimated_weight_g <= 0
                or existing_unit_portion.weight_g is None
                or abs(float(existing_unit_portion.weight_g) - estimated_weight_g) <= 0.01
            ):
                return existing_unit_portion.id

        portion = Portion.objects.filter(
            ingredient_id=ingredient_id,
            name__iexact=p_name,
            deleted_at__isnull=True,
        ).first()
        if portion:
            if _should_update_weight(portion, estimated_weight_g) and not portion.recipe_items.exists():
                portion.weight_g = estimated_weight_g
                portion.save(update_fields=["weight_g"])
            elif (
                not is_metric_base
                and estimated_weight_g > 0
                and portion.weight_g is not None
                and abs(float(portion.weight_g) - estimated_weight_g) > 0.01
                and portion.recipe_items.exists()
            ):
                portion = None
            else:
                return portion.id

    # Without a unit, only reuse an exact named portion. Never choose an
    # arbitrary first portion because that can silently change recipe units.
    if not measuring_unit_id and p_name:
        portion = Portion.objects.filter(
            ingredient_id=ingredient_id,
            name__iexact=p_name,
            quantity=portion_quantity,
            deleted_at__isnull=True,
        ).first()
        if portion:
            if _should_update_weight(portion, estimated_weight_g) and not portion.recipe_items.exists():
                portion.weight_g = estimated_weight_g
                portion.save(update_fields=["weight_g"])
            return portion.id

    # Create a new active portion. The legacy schema makes names unique per
    # ingredient, so a referenced definition gets a weight-qualified name.
    if measuring_unit_id:
        mu = MeasuringUnit.objects.get(id=measuring_unit_id)
        p_name = (unit_name or mu.name).strip()
        if not p_name:
            p_name = mu.name or "Stück"

        if is_metric_base:
            weight: float | None = portion_quantity * METRIC_CANONICAL_WEIGHTS.get(unit_name_lower, 1.0)
        else:
            weight = estimated_weight_g if estimated_weight_g > 0 else None

        if (
            not is_metric_base
            and Portion.objects.filter(
                ingredient_id=ingredient_id,
                name__iexact=p_name,
                deleted_at__isnull=True,
            ).exists()
        ):
            suffix = f" ({weight:g} g)" if weight else " (Import)"
            p_name = f"{p_name}{suffix}"

        next_rank = 1
        if Portion.objects.filter(ingredient_id=ingredient_id, deleted_at__isnull=True, rank=1).exists():
            next_rank = (
                Portion.objects.filter(ingredient_id=ingredient_id, deleted_at__isnull=True)
                .order_by("-rank")
                .values_list("rank", flat=True)
                .first()
                or 1
            ) + 1

        # Only active portions may be reused. A plain `get_or_create` lookup
        # omits the soft-delete filter and would resurrect a deleted portion,
        # attaching new recipe items to it.
        portion = Portion.objects.filter(
            ingredient_id=ingredient_id,
            name__iexact=p_name,
            deleted_at__isnull=True,
        ).first()
        if portion is not None:
            if is_metric_base and portion.weight_g != metric_base_weight and not portion.recipe_items.exists():
                portion.weight_g = metric_base_weight
                portion.save(update_fields=["weight_g"])
            return portion.id

        try:
            with transaction.atomic():
                portion = Portion.objects.create(
                    ingredient_id=ingredient_id,
                    name=p_name,
                    measuring_unit_id=measuring_unit_id,
                    quantity=portion_quantity,
                    weight_g=weight,
                    rank=next_rank,
                )
        except IntegrityError:
            # Lost a race against a concurrent insert of the same (case-insensitive) name.
            portion = Portion.objects.filter(
                ingredient_id=ingredient_id,
                name__iexact=p_name,
                deleted_at__isnull=True,
            ).first()
            if portion is None:
                raise
        return portion.id

    return None
