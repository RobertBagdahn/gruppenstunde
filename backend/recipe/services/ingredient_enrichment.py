"""Gemini-based ingredient enrichment service.

Calls Gemini to generate full nutritional data for new ingredients.
Synchronous — runs in the request cycle. Graceful degradation on failure.

Extracted from url_import_service._call_gemini_for_matching()
to be reusable across all recipe flows.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from core.services.gemini import GeminiUnavailableError, gemini_call
from recipe.schemas.enrichment import GeminiNewIngredient

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"


def enrich_ingredient(
    name: str,
    user: AbstractBaseUser | None = None,
) -> GeminiNewIngredient | None:
    """Call Gemini to get nutritional data for a new ingredient.

    Prompt explicitly instructs Gemini to return ingredient names WITHOUT
    Zustandsform (the parser already extracted state as a note).

    Returns GeminiNewIngredient with full nutritional data, scores,
    physical properties, and default portion info. Returns None if
    Gemini is unavailable or fails.
    """
    prompt = (
        "Du bist ein Ernährungsexperte. Gib exakte Nährwerte und Eigenschaften "
        "für folgende Zutat an:\n\n"
        f"Zutat: {name}\n\n"
        "WICHTIGE REGELN:\n"
        "- Der Name MUSS ohne Zustandsform sein (z.B. 'Erdbeere' statt 'Erdbeere frisch'). "
        "Zustandsformen wie frisch, TK, getrocknet gehören NICHT in den Namen.\n"
        "- Nährwerte pro 100g angeben\n"
        "- Realistische Werte recherchieren (Google Search Grounding wenn verfügbar)\n"
        "- Alle Scores (child_score, scout_score, environmental_score) von 1-10\n"
        "- nova_score: 1 = unverarbeitet, 4 = hochverarbeitet\n"
        "- nutri_class: 1=A (sehr gut) bis 5=E (weniger gut)\n"
        "- physical_viscosity: 'solid' oder 'beverage'\n"
        "- portion_name und portion_weight_g für eine typische Portion (z.B. Stück, 80g)\n"
        "- estimated_portion_weight_g: Gewicht einer typischen Einheit "
        "(z.B. 1 Zwiebel=80g, 1 EL=15g, 1 Tomate=120g)"
    )

    try:
        from google.genai import types

        response, _interaction_id = gemini_call(
            user=user,
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiNewIngredient,
            ),
            context="ingredient_enrichment",
        )

        if response is None:
            logger.warning("Gemini unavailable for ingredient enrichment: %s", name)
            return None

        result = GeminiNewIngredient.model_validate_json(response.text)
        logger.info("Enriched ingredient '%s': %d kcal/100g", result.name, result.energy_kcal)
        return result

    except GeminiUnavailableError:
        logger.warning("GeminiUnavailableError enriching ingredient: %s", name)
        return None
    except Exception:
        logger.warning("Failed to enrich ingredient '%s'", name, exc_info=True)
        return None
