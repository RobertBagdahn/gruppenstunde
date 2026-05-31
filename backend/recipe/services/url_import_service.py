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
from typing import Any

from django.contrib.auth.models import AbstractBaseUser
from django.db.models import Q
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


# ---------------------------------------------------------------------------
# Pydantic schemas for Gemini structured output
# ---------------------------------------------------------------------------


class GeminiIngredientMatch(BaseModel):
    """Single ingredient result from Gemini."""

    original_name: str = Field(description="Original ingredient name from recipe")
    matched_ingredient_id: int | None = Field(
        None, description="ID of matched existing ingredient, or null if new"
    )
    quantity: float = Field(description="Numeric quantity")
    unit: str = Field(description="Measuring unit (e.g. g, ml, EL, Stück)")
    note: str = Field("", description="Additional note (e.g. 'fein gewürfelt')")
    # Fields for new ingredients (only if matched_ingredient_id is null)
    new_ingredient: GeminiNewIngredient | None = Field(
        None, description="Data for creating a new ingredient"
    )


class GeminiNewIngredient(BaseModel):
    """Full ingredient data for creation via Gemini + Grounding."""

    name: str = Field(description="Canonical German name")
    aliases: list[str] = Field(default_factory=list, description="Alternative names")
    energy_kj: float = Field(0, description="Energy per 100g in kJ")
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
    servings: int = Field(4, description="Number of servings")
    preparation_time: int | None = Field(None, description="Prep time in minutes")
    execution_time: int | None = Field(None, description="Cook/execution time in minutes")
    recipe_type: str = Field("", description="One of: breakfast, main_dish, side_dish, dessert, snack, drink, baking, soup")
    steps: list[str] = Field(default_factory=list, description="Cooking steps")
    ingredients: list[GeminiIngredientMatch] = Field(
        default_factory=list, description="Matched/new ingredients"
    )


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
    ):
        self.ingredient_id = ingredient_id
        self.ingredient_name = ingredient_name
        self.quantity = quantity
        self.measuring_unit_id = measuring_unit_id
        self.measuring_unit_name = measuring_unit_name
        self.note = note
        self.is_new_ingredient = is_new_ingredient


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
        servings: int,
        preparation_time: int | None,
        execution_time: int | None,
        recipe_type: str,
        steps: list[str],
        source_url: str,
        recipe_items: list[RecipeItemDraftResult],
        created_ingredients: list[CreatedIngredientResult],
    ):
        self.title = title
        self.description = description
        self.servings = servings
        self.preparation_time = preparation_time
        self.execution_time = execution_time
        self.recipe_type = recipe_type
        self.steps = steps
        self.source_url = source_url
        self.recipe_items = recipe_items
        self.created_ingredients = created_ingredients


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------


def import_recipe_from_url(url: str, user: AbstractBaseUser) -> UrlImportResult:
    """Full URL import pipeline with Gemini ingredient matching."""
    from recipe.services.import_service import ImportedRecipe, import_from_url

    # Step 1: Fetch and parse (schema.org / fallback)
    try:
        parsed = import_from_url(url)
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"URL konnte nicht geladen werden: {e}")

    # Step 2: Pre-filter ingredients via text search
    ingredient_candidates = _get_ingredient_candidates(parsed.ingredients)

    # Step 3: Gemini call for matching + enrichment
    gemini_result = _call_gemini_for_matching(
        parsed=parsed,
        candidates=ingredient_candidates,
        user=user,
    )

    # Step 4: Create new ingredients
    created_ingredients = _create_new_ingredients(gemini_result.ingredients)

    # Step 5: Resolve measuring units and build recipe items
    recipe_items = _build_recipe_items(gemini_result.ingredients, created_ingredients)

    return UrlImportResult(
        title=gemini_result.title or parsed.title,
        description=gemini_result.description or parsed.description,
        servings=gemini_result.servings or parsed.servings,
        preparation_time=gemini_result.preparation_time or parsed.prep_time_minutes,
        execution_time=gemini_result.execution_time or parsed.cook_time_minutes,
        recipe_type=gemini_result.recipe_type,
        steps=gemini_result.steps or parsed.steps,
        source_url=url,
        recipe_items=recipe_items,
        created_ingredients=[
            CreatedIngredientResult(
                id=ci["id"], name=ci["name"], aliases=ci["aliases"], nutri_class=ci["nutri_class"]
            )
            for ci in created_ingredients
        ],
    )


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
                    results.append({
                        "id": i.id,
                        "name": i.name,
                        "aliases": list(i.aliases.values_list("name", flat=True)),
                    })

            if len(results) >= 8:
                break

            # Strategy 2: Alias exact match
            alias_exact = IngredientAlias.objects.filter(
                name__iexact=term
            ).select_related("ingredient").exclude(ingredient_id__in=found_ids)[:3]
            for a in alias_exact:
                if a.ingredient_id not in found_ids:
                    found_ids.add(a.ingredient_id)
                    results.append({
                        "id": a.ingredient_id,
                        "name": a.ingredient.name,
                        "aliases": list(a.ingredient.aliases.values_list("name", flat=True)),
                    })

            if len(results) >= 8:
                break

            # Strategy 3: startswith / contains
            partial = Ingredient.objects.filter(
                Q(name__istartswith=term) | Q(name__icontains=term)
            ).exclude(id__in=found_ids).distinct()[:3]
            for i in partial:
                if i.id not in found_ids:
                    found_ids.add(i.id)
                    results.append({
                        "id": i.id,
                        "name": i.name,
                        "aliases": list(i.aliases.values_list("name", flat=True)),
                    })

            if len(results) >= 8:
                break

            # Strategy 4: Trigram similarity (fuzzy matching)
            if len(term) >= 4:
                trigram = (
                    Ingredient.objects.annotate(
                        similarity=TrigramSimilarity("name", term)
                    )
                    .filter(similarity__gt=0.3)
                    .exclude(id__in=found_ids)
                    .order_by("-similarity")[:3]
                )
                for i in trigram:
                    if i.id not in found_ids:
                        found_ids.add(i.id)
                        results.append({
                            "id": i.id,
                            "name": i.name,
                            "aliases": list(i.aliases.values_list("name", flat=True)),
                        })

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

    # Build prompt
    ingredients_context = ""
    for ing_name, cands in candidates.items():
        if cands:
            cand_str = ", ".join(
                f"[id={c['id']}] {c['name']} (aliases: {', '.join(c['aliases'])})"
                for c in cands
            )
            ingredients_context += f"- \"{ing_name}\" → Kandidaten: {cand_str}\n"
        else:
            ingredients_context += f"- \"{ing_name}\" → Keine Kandidaten gefunden\n"

    # Recipe text from parsed data
    recipe_text = f"""Titel: {parsed.title}
Beschreibung: {parsed.description}
Portionen: {parsed.servings}
Zutaten: {', '.join(f'{i.quantity} {i.unit} {i.name}' for i in parsed.ingredients)}
Schritte: {chr(10).join(parsed.steps[:10])}"""

    prompt = f"""Du bist ein Ernährungsexperte. Analysiere dieses Rezept und ordne die Zutaten zu.

REZEPT:
{recipe_text}

EXISTIERENDE ZUTATEN IN DER DATENBANK (zum Matching):
{ingredients_context}

AUFGABEN:
1. Extrahiere/validiere die Rezept-Metadaten (title, description, servings, preparation_time, execution_time, recipe_type, steps)
2. Für jede Zutat:
   a) Prüfe ob ein Kandidat aus der DB passt (semantisch, nicht nur String-Match). Wenn ja: setze matched_ingredient_id
   b) Wenn kein Match: erstelle new_ingredient mit ALLEN Feldern (Nährwerte pro 100g, Scores, physikalische Eigenschaften)
3. Nährwerte müssen realistisch und korrekt sein (recherchiere via Google wenn nötig)
4. quantity und unit aus dem Rezept-Kontext korrekt parsen (z.B. "2 rote Zwiebeln" → quantity=2, unit="Stück", note="rot")

recipe_type muss einer dieser Werte sein: breakfast, main_dish, side_dish, dessert, snack, drink, baking, soup (oder leer)
physical_viscosity muss sein: solid, beverage

Antworte ausschließlich im angegebenen JSON-Format."""

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GeminiRecipeExtraction,
    )

    response = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="url_import_matching",
    )

    if response is None:
        raise ValueError("KI-Service nicht verfügbar")

    return GeminiRecipeExtraction.model_validate_json(response.text)


# ---------------------------------------------------------------------------
# Step 4: Create new ingredients
# ---------------------------------------------------------------------------


def _create_new_ingredients(
    ingredients: list[GeminiIngredientMatch],
) -> list[dict[str, Any]]:
    """Create new Ingredient records for unmatched items."""
    from supply.choices import IngredientStatusChoices, PhysicalViscosityChoices
    from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion

    created: list[dict[str, Any]] = []

    for ing in ingredients:
        if ing.matched_ingredient_id is not None or ing.new_ingredient is None:
            continue

        data = ing.new_ingredient

        # Check if ingredient with same name already exists – reuse it
        existing = Ingredient.objects.filter(name__iexact=data.name).first()
        if existing:
            ing.matched_ingredient_id = existing.id
            created.append({
                "id": existing.id,
                "name": existing.name,
                "aliases": [],
                "nutri_class": data.nutri_class,
            })
            continue

        # Map viscosity
        viscosity = PhysicalViscosityChoices.SOLID
        if data.physical_viscosity in ("liquid", "beverage"):
            viscosity = PhysicalViscosityChoices.BEVERAGE

        ingredient = Ingredient.objects.create(
            name=data.name,
            status=IngredientStatusChoices.DRAFT,
            energy_kj=data.energy_kj,
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
        unit, _ = MeasuringUnit.objects.get_or_create(
            name=data.portion_name,
        )
        Portion.objects.create(
            ingredient=ingredient,
            name=data.portion_name,
            measuring_unit=unit,
            weight_g=data.portion_weight_g,
            quantity=1,
        )

        # Store the ID on the match object for later reference
        ing.matched_ingredient_id = ingredient.id

        created.append({
            "id": ingredient.id,
            "name": data.name,
            "aliases": data.aliases,
            "nutri_class": data.nutri_class,
        })

    return created


# ---------------------------------------------------------------------------
# Step 5: Build recipe items
# ---------------------------------------------------------------------------


def _build_recipe_items(
    ingredients: list[GeminiIngredientMatch],
    created_ingredients: list[dict[str, Any]],
) -> list[RecipeItemDraftResult]:
    """Map Gemini results to RecipeItemDraftResult list."""
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
            mu = MeasuringUnit.objects.filter(
                Q(name__iexact=ing.unit) | Q(description__iexact=ing.unit)
            ).first()
            if mu:
                measuring_unit_id = mu.id
                measuring_unit_name = mu.name

        results.append(
            RecipeItemDraftResult(
                ingredient_id=ingredient_id,
                ingredient_name=ingredient_name,
                quantity=ing.quantity,
                measuring_unit_id=measuring_unit_id,
                measuring_unit_name=measuring_unit_name,
                note=ing.note,
                is_new_ingredient=ingredient_id in created_ids,
            )
        )

    return results
