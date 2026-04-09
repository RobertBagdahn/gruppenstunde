"""
AI supply suggestion service — Suggest materials and ingredients for content.

Given a content description, suggests:
- Materials (tools, equipment) for GroupSessions and Games
- Ingredients + Materials (kitchen equipment) for Recipes
- Materials for any content type

Uses Gemini with structured JSON output.
"""

import logging
from typing import Any

from django.conf import settings
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
AI_TIMEOUT_SECONDS = 30


# ---------------------------------------------------------------------------
# Pydantic output schemas
# ---------------------------------------------------------------------------


class MaterialSuggestionItem(BaseModel):
    name: str = Field(description="Name of the material, e.g. 'Seil', 'Papier', 'Stifte'")
    quantity: str = Field(default="1", description="Amount, e.g. '2', '1', '10'")
    unit: str = Field(default="Stück", description="Unit: 'Stück', 'Meter', 'Liter', 'Packung'")
    category: str = Field(
        default="other",
        description="Category: 'tools', 'crafting', 'kitchen', 'outdoor', 'stationery', 'other'",
    )
    is_consumable: bool = Field(default=False, description="Whether the material is used up")


class IngredientSuggestionItem(BaseModel):
    name: str = Field(description="Name of the ingredient, e.g. 'Mehl', 'Butter', 'Tomaten'")
    quantity: str = Field(default="100", description="Amount per person in g or ml")
    unit: str = Field(default="g", description="Unit: 'g', 'ml', 'Stück'")


class MaterialSuggestionsOutput(BaseModel):
    materials: list[MaterialSuggestionItem] = Field(
        default_factory=list,
        description="List of suggested materials/tools needed",
    )


class RecipeSupplySuggestionsOutput(BaseModel):
    ingredients: list[IngredientSuggestionItem] = Field(
        default_factory=list,
        description="List of suggested ingredients",
    )
    kitchen_equipment: list[MaterialSuggestionItem] = Field(
        default_factory=list,
        description="List of suggested kitchen equipment/tools",
    )


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


def suggest_materials(
    title: str,
    description: str,
    content_type: str = "session",
) -> list[dict[str, Any]]:
    """
    Suggest materials for a content item based on its title and description.

    Works for sessions, games, and any content type that uses materials.

    Returns a list of material suggestion dicts.
    """
    client = _get_client()
    if not client:
        return []

    prompt = (
        "Analysiere die folgende Pfadfinder-Aktivität und schlage Materialien vor, "
        "die dafür benötigt werden.\n\n"
        f"Titel: {title}\n"
        f"Beschreibung: {description[:2000]}\n\n"
        "Schlage nur Materialien vor, die wirklich benötigt werden. "
        "Gib die Kategorie an: 'tools' (Werkzeuge), 'crafting' (Bastelmaterial), "
        "'kitchen' (Küchenutensilien), 'outdoor' (Outdoor-Ausrüstung), "
        "'stationery' (Schreibwaren), 'other' (Sonstiges).\n"
        "Mengen sind pro Person, es sei denn es ist ein Gegenstand für die Gruppe."
    )

    from google.genai import types

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MaterialSuggestionsOutput,
                http_options=types.HttpOptions(timeout=AI_TIMEOUT_SECONDS * 1000),
            ),
        )
        result = MaterialSuggestionsOutput.model_validate_json(response.text)
        return [m.model_dump() for m in result.materials]
    except Exception:
        logger.warning("AI material suggestion failed", exc_info=True)
        return []


def suggest_recipe_supplies(
    title: str,
    description: str,
) -> dict[str, list[dict[str, Any]]]:
    """
    Suggest ingredients and kitchen equipment for a recipe.

    Returns a dict with 'ingredients' and 'kitchen_equipment' lists.
    """
    client = _get_client()
    if not client:
        return {"ingredients": [], "kitchen_equipment": []}

    prompt = (
        "Analysiere das folgende Rezept für eine Pfadfinder-Gruppe und schlage "
        "Zutaten und Küchengeräte vor.\n\n"
        f"Titel: {title}\n"
        f"Beschreibung: {description[:2000]}\n\n"
        "Regeln:\n"
        "- ingredients: Zutaten mit Menge pro Person (in g, ml oder Stück)\n"
        "- kitchen_equipment: Küchengeräte/Werkzeuge die benötigt werden "
        "(Topf, Schneidebrett, Messer, etc.)\n"
        "Gib realistische Mengen an."
    )

    from google.genai import types

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RecipeSupplySuggestionsOutput,
                http_options=types.HttpOptions(timeout=AI_TIMEOUT_SECONDS * 1000),
            ),
        )
        result = RecipeSupplySuggestionsOutput.model_validate_json(response.text)
        return {
            "ingredients": [i.model_dump() for i in result.ingredients],
            "kitchen_equipment": [m.model_dump() for m in result.kitchen_equipment],
        }
    except Exception:
        logger.warning("AI recipe supply suggestion failed", exc_info=True)
        return {"ingredients": [], "kitchen_equipment": []}


def match_materials_to_database(suggestions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Try to match AI-suggested materials to existing Material records in the database.

    Returns enriched suggestions with 'material_id' if a match is found,
    or None if the material needs to be created.
    """
    from django.contrib.postgres.search import TrigramSimilarity

    from supply.models import Material

    enriched = []
    for suggestion in suggestions:
        name = suggestion.get("name", "")
        if not name:
            continue

        # Try exact match first
        match = Material.objects.filter(name__iexact=name).first()
        if not match:
            # Try trigram similarity
            try:
                match = (
                    Material.objects.annotate(similarity=TrigramSimilarity("name", name))
                    .filter(similarity__gt=0.3)
                    .order_by("-similarity")
                    .first()
                )
            except Exception:
                # pg_trgm might not be available in tests (SQLite)
                match = None

        enriched.append(
            {
                **suggestion,
                "material_id": match.id if match else None,
                "material_slug": match.slug if match else None,
                "matched_name": match.name if match else None,
            }
        )

    return enriched


def match_ingredients_to_database(suggestions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Try to match AI-suggested ingredients to existing Ingredient records.

    Returns enriched suggestions with 'ingredient_id' if a match is found.
    """
    from supply.models import Ingredient

    enriched = []
    for suggestion in suggestions:
        name = suggestion.get("name", "")
        if not name:
            continue

        # Try exact match first
        match = Ingredient.objects.filter(name__iexact=name).first()
        if not match:
            # Try alias match
            from supply.models import IngredientAlias

            alias = IngredientAlias.objects.filter(name__iexact=name).select_related("ingredient").first()
            if alias:
                match = alias.ingredient

        if not match:
            # Try trigram similarity
            try:
                from django.contrib.postgres.search import TrigramSimilarity

                match = (
                    Ingredient.objects.annotate(similarity=TrigramSimilarity("name", name))
                    .filter(similarity__gt=0.3)
                    .order_by("-similarity")
                    .first()
                )
            except Exception:
                match = None

        enriched.append(
            {
                **suggestion,
                "ingredient_id": match.id if match else None,
                "ingredient_slug": match.slug if match else None,
                "matched_name": match.name if match else None,
            }
        )

    return enriched


# ---------------------------------------------------------------------------
# Client helper (shared with ai_service)
# ---------------------------------------------------------------------------

_client = None


def _get_client():
    global _client
    if _client is None:
        try:
            from google import genai

            project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")
            location = getattr(settings, "VERTEX_AI_LOCATION", "global")

            if project:
                _client = genai.Client(
                    vertexai=True,
                    project=project,
                    location=location,
                )
            else:
                logger.warning("GOOGLE_CLOUD_PROJECT not set - AI features disabled")
        except ImportError:
            logger.warning("google-genai not installed - AI features disabled")
    return _client
