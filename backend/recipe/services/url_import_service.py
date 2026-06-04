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

# Valid choice values for validation
VALID_RECIPE_TYPES = {"breakfast", "warm_meal", "cold_meal", "dessert", "side_dish", "drink", "simple_meal"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}
VALID_EXECUTION_TIMES = {"less_30", "30_60", "60_90", "more_90"}
VALID_PREPARATION_TIMES = {"none", "less_15", "15_30", "30_60", "more_60"}
VALID_COSTS_RATINGS = {"free", "less_1", "1_2", "more_2"}


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

    original_name: str = Field(description="Original ingredient name from recipe")
    matched_ingredient_id: int | None = Field(
        None, description="ID of matched existing ingredient, or null if new"
    )
    quantity: float = Field(description="Numeric quantity")
    unit: str = Field(description="Measuring unit (e.g. g, ml, EL, Stück)")
    note: str = Field("", description="Additional note (e.g. 'fein gewürfelt')")
    estimated_portion_weight_g: float = Field(
        100, description="Estimated weight in grams for one unit of this ingredient (e.g. 1 EL = 10g, 1 Stück Zwiebel = 120g, 1 g = 1g)"
    )
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
    summary: str = Field("", description="Short summary of the recipe (1-2 sentences)")
    servings: int = Field(4, description="Number of servings")
    preparation_time: int | None = Field(None, description="Prep time in minutes")
    execution_time: int | None = Field(None, description="Cook/execution time in minutes")
    recipe_type: str = Field("", description="One of: breakfast, warm_meal, cold_meal, dessert, side_dish, drink, simple_meal")
    difficulty: str = Field("easy", description="One of: easy, medium, hard")
    execution_time_choice: str = Field("less_30", description="One of: less_30, 30_60, 60_90, more_90")
    preparation_time_choice: str = Field("none", description="One of: none, less_15, 15_30, 30_60, more_60")
    costs_rating: str = Field("less_1", description="Cost per portion: free, less_1, 1_2, more_2")
    scout_level_ids: list[int] = Field(default_factory=list, description="IDs of suitable scout levels")
    tag_ids: list[int] = Field(default_factory=list, description="IDs of matching tags")
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
        portion_id: int | None = None,
    ):
        self.ingredient_id = ingredient_id
        self.ingredient_name = ingredient_name
        self.quantity = quantity
        self.measuring_unit_id = measuring_unit_id
        self.measuring_unit_name = measuring_unit_name
        self.note = note
        self.is_new_ingredient = is_new_ingredient
        self.portion_id = portion_id


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
        servings: int,
        preparation_time: int | None,
        execution_time: int | None,
        recipe_type: str,
        difficulty: str,
        execution_time_choice: str,
        preparation_time_choice: str,
        costs_rating: str,
        scout_level_ids: list[int],
        tag_ids: list[int],
        steps: list[str],
        source_url: str,
        recipe_items: list[RecipeItemDraftResult],
        created_ingredients: list[CreatedIngredientResult],
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
        self.costs_rating = costs_rating
        self.scout_level_ids = scout_level_ids
        self.tag_ids = tag_ids
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

    # Step 6: Resolve time choices (prefer parsed JSON-LD over Gemini estimate)
    execution_time_choice = gemini_result.execution_time_choice
    preparation_time_choice = gemini_result.preparation_time_choice
    if parsed.cook_time_minutes is not None:
        execution_time_choice = _minutes_to_execution_choice(parsed.cook_time_minutes)
    if parsed.prep_time_minutes is not None:
        preparation_time_choice = _minutes_to_preparation_choice(parsed.prep_time_minutes)

    return UrlImportResult(
        title=gemini_result.title or parsed.title,
        description=gemini_result.description or parsed.description,
        summary=gemini_result.summary,
        servings=gemini_result.servings or parsed.servings,
        preparation_time=gemini_result.preparation_time or parsed.prep_time_minutes,
        execution_time=gemini_result.execution_time or parsed.cook_time_minutes,
        recipe_type=_validate_choice(gemini_result.recipe_type, VALID_RECIPE_TYPES, ""),
        difficulty=_validate_choice(gemini_result.difficulty, VALID_DIFFICULTIES, "easy"),
        execution_time_choice=_validate_choice(execution_time_choice, VALID_EXECUTION_TIMES, "less_30"),
        preparation_time_choice=_validate_choice(preparation_time_choice, VALID_PREPARATION_TIMES, "none"),
        costs_rating=_validate_choice(gemini_result.costs_rating, VALID_COSTS_RATINGS, "less_1"),
        scout_level_ids=gemini_result.scout_level_ids,
        tag_ids=gemini_result.tag_ids,
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
    from content.models.tags import ScoutLevel, Tag
    from google.genai import types

    # Load DB lists for scout levels and tags
    scout_levels = list(ScoutLevel.objects.values("id", "name"))
    tags = list(Tag.objects.values("id", "name"))

    scout_levels_str = json.dumps(scout_levels, ensure_ascii=False)
    tags_str = json.dumps(tags, ensure_ascii=False)

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

VERFÜGBARE PFADFINDER-STUFEN (wähle alle passenden IDs):
{scout_levels_str}

VERFÜGBARE TAGS (wähle alle passenden IDs):
{tags_str}

AUFGABEN:
1. Extrahiere/validiere die Rezept-Metadaten (title, description, summary, servings, preparation_time, execution_time, steps)
2. Schätze folgende Felder:
   - summary: Kurzbeschreibung in 1-2 Sätzen
    - recipe_type: MUSS einer dieser Werte sein: breakfast, warm_meal, cold_meal, dessert, side_dish, drink, simple_meal
   - difficulty: MUSS sein: easy, medium, hard
   - execution_time_choice: MUSS sein: less_30, 30_60, 60_90, more_90 (basierend auf Gesamtkochzeit)
   - preparation_time_choice: MUSS sein: none, less_15, 15_30, 30_60, more_60 (basierend auf Vorbereitungszeit)
   - costs_rating: Kosten pro Portion, MUSS sein: free, less_1, 1_2, more_2
   - scout_level_ids: Passende Altersgruppen aus obiger Liste
   - tag_ids: Passende Tags aus obiger Liste
3. Für jede Zutat:
   a) Prüfe ob ein Kandidat aus der DB passt (semantisch, nicht nur String-Match). Wenn ja: setze matched_ingredient_id
   b) Wenn kein Match: erstelle new_ingredient mit ALLEN Feldern (Nährwerte pro 100g, Scores, physikalische Eigenschaften)
    c) estimated_portion_weight_g: Gewicht einer Einheit in Gramm (z.B. 1 EL = 15g, 1 TL = 5g, 1 Stück Zwiebel = 80g, 1 Stück Tomate = 120g, 1 Stück Champignon = 20g, 1 Stück Paprika = 150g, 1 Zehe Knoblauch = 4g, 1 Ei = 60g, 1 g = 1g, 1 ml = 1g, 1 Prise = 0.3g, 1 Schuss = 10g, 1 Packung/Pck. = Packungsgewicht z.B. 200g bei Feta, 400g bei Dosentomaten)
4. Nährwerte müssen realistisch und korrekt sein (recherchiere via Google wenn nötig)
5. quantity und unit aus dem Rezept-Kontext korrekt parsen:
   - "2 rote Zwiebeln" → quantity=2, unit="Stück", note="rot"
   - "0.25 Pck. Feta" → quantity=0.25, unit="Packung", estimated_portion_weight_g=200
   - "2 kleine Champignons" → quantity=2, unit="Stück", note="klein", estimated_portion_weight_g=15
   - "1 Dose Tomaten (400g)" → quantity=400, unit="g"
   - "etwas Petersilie" → quantity=1, unit="EL", note="etwas"
   - Abkürzungen auflösen: Pck.=Packung, Bd.=Bund, EL=Esslöffel, TL=Teelöffel, Msp.=Messerspitze

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
            }
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
    """Map Gemini results to RecipeItemDraftResult list with portion resolution."""
    from supply.models import Ingredient, MeasuringUnit, Portion

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
                Q(name__iexact=normalized_unit) | Q(description__iexact=normalized_unit)
                | Q(name__iexact=ing.unit) | Q(description__iexact=ing.unit)
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


def _should_update_weight(portion, estimated_weight_g: float) -> bool:
    """Check if a portion's weight_g should be updated with Gemini's estimate."""
    if estimated_weight_g <= 0:
        return False
    # Never update g/ml portions (weight_g=None means 1g=1g which is correct)
    if portion.measuring_unit and portion.measuring_unit.name in ("g", "ml"):
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
) -> int | None:
    """Find existing portion or create one with estimated weight."""
    from supply.models import MeasuringUnit, Portion

    # Strategy 1: Exact match on ingredient + measuring_unit
    if measuring_unit_id:
        portion = Portion.objects.filter(
            ingredient_id=ingredient_id,
            measuring_unit_id=measuring_unit_id,
        ).first()
        if portion:
            if _should_update_weight(portion, estimated_weight_g):
                portion.weight_g = estimated_weight_g
                portion.save(update_fields=["weight_g"])
            return portion.id

    # Strategy 2: Fallback — use default portion (first one) if no unit
    if not measuring_unit_id:
        portion = Portion.objects.filter(ingredient_id=ingredient_id).first()
        if portion:
            if _should_update_weight(portion, estimated_weight_g):
                portion.weight_g = estimated_weight_g
                portion.save(update_fields=["weight_g"])
            return portion.id

    # Strategy 3: Create new portion with estimated weight
    if measuring_unit_id:
        mu = MeasuringUnit.objects.get(id=measuring_unit_id)
        p_name = (unit_name or mu.name).strip()
        if not p_name:
            p_name = mu.name or "Stück"

        weight = estimated_weight_g if estimated_weight_g > 0 else None

        portion, _ = Portion.objects.get_or_create(
            ingredient_id=ingredient_id,
            name=p_name,
            measuring_unit_id=measuring_unit_id,
            quantity=1.0,
            defaults={
                "weight_g": weight,
            }
        )
        return portion.id

    return None
