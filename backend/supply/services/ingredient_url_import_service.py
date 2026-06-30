"""URL-Import-Service für Zutaten via Gemini.

Scraped eine beliebige URL (Produktseite, Open Food Facts, USDA FDC, etc.)
und gibt ein strukturiertes Zutat-Entwurf-Objekt zurück. Die KI erkennt
die Quellart selbst.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


# ---------------------------------------------------------------------------
# Pydantic schema for Gemini structured output
# ---------------------------------------------------------------------------


class GeminiIngredientUrlExtraction(BaseModel):
    """Gemini structured output for URL-based ingredient import."""

    name: str = Field(description="Standardisierter deutscher Name der Zutat (keine Marken, kein Fülltext)")
    description: str | None = Field(None, description="Kurzbeschreibung (1-2 Sätze), oder null wenn nicht bestimmbar")
    retail_section_name: str | None = Field(
        None,
        description=(
            "Warengruppe im Supermarkt, z.B. 'Milchprodukte', 'Gemüse & Obst', "
            "'Fleisch & Fisch', 'Getreide & Backwaren', 'Getränke', 'Süßwaren & Snacks', "
            "'Gewürze & Saucen', 'Konserven & Fertiggerichte', 'Tiefkühlkost', "
            "'Drogerie & Hygiene'. null wenn unklar."
        ),
    )

    # Optionale Nährwerte pro 100g
    energy_kcal: float | None = Field(None, description="Energie in kcal pro 100g, oder null")
    protein_g: float | None = Field(None, description="Eiweiß in g pro 100g, oder null")
    fat_g: float | None = Field(None, description="Fett in g pro 100g, oder null")
    fat_sat_g: float | None = Field(None, description="Gesättigte Fettsäuren in g pro 100g, oder null")
    carbohydrate_g: float | None = Field(None, description="Kohlenhydrate in g pro 100g, oder null")
    sugar_g: float | None = Field(None, description="Zucker in g pro 100g, oder null")
    fibre_g: float | None = Field(None, description="Ballaststoffe in g pro 100g, oder null")
    salt_g: float | None = Field(None, description="Salz in g pro 100g, oder null")
    sodium_mg: float | None = Field(None, description="Natrium in mg pro 100g, oder null")


# ---------------------------------------------------------------------------
# Service function
# ---------------------------------------------------------------------------


def import_ingredient_from_url(url: str, user=None) -> dict:
    """Extract ingredient data from a URL using Gemini with URL context.

    Returns a dict with 'ingredient_draft' and optional 'nutrition' keys.
    Raises GeminiUnavailableError when Gemini is not available.
    Raises ValueError when the URL yields no usable ingredient data.
    """
    from google.genai import types

    prompt = (
        f"Analysiere die folgende URL und extrahiere die Informationen über das Lebensmittel/Produkt:\n"
        f"{url}\n\n"
        f"Rufe die URL ab (via URL-Kontext oder Search Grounding) und extrahiere:\n"
        f"- Den standardisierten deutschen Namen der Zutat (keine Marken, kein Fülltext)\n"
        f"- Eine kurze Beschreibung (1-2 Sätze)\n"
        f"- Die passende Warengruppe im Supermarkt\n"
        f"- Nährwerte pro 100g (falls auf der Seite angegeben)\n\n"
        f"Quellen die du erkennen wirst:\n"
        f"- Produktseiten (Rewe, Edeka, Aldi, Lidl, dm, Rossmann): Name und Nährwerte aus Tabelle\n"
        f"- Open Food Facts (openfoodfacts.org): Strukturierte Produktdaten\n"
        f"- USDA FoodData Central (fdc.nal.usda.gov): Nährwertdaten auf Englisch → ins Deutsche übersetzen\n"
        f"- Andere Lebensmittelseiten: Best-effort Extraktion\n\n"
        f"Wenn die URL kein Lebensmittel beschreibt oder keine nutzbaren Daten enthält, "
        f"setze name='UNKNOWN' und alle anderen Felder auf null."
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GeminiIngredientUrlExtraction,
        tools=[types.Tool(url_context=types.UrlContext())],
    )

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="ingredient_url_import",
    )

    if response is None:
        raise GeminiUnavailableError("KI nicht verfügbar")

    result = GeminiIngredientUrlExtraction.model_validate_json(response.text)

    if result.name == "UNKNOWN" or not result.name.strip():
        raise ValueError("Keine verwertbaren Zutaten-Daten unter dieser URL gefunden")

    # Resolve retail section name to ID
    retail_section_id: int | None = None
    if result.retail_section_name:
        from supply.services.retail_section_mapping import get_retail_section_from_name

        rs = get_retail_section_from_name(result.retail_section_name)
        if rs:
            retail_section_id = rs.id

    ingredient_draft = {
        "name": result.name.strip(),
        "description": result.description,
        "status": "draft",
        "retail_section_id": retail_section_id,
    }

    # Only include nutrition if at least one value was extracted
    has_nutrition = any(
        v is not None
        for v in [
            result.energy_kcal,
            result.protein_g,
            result.fat_g,
            result.carbohydrate_g,
        ]
    )
    nutrition = None
    if has_nutrition:
        nutrition = {
            "energy_kcal": result.energy_kcal,
            "protein_g": result.protein_g,
            "fat_g": result.fat_g,
            "fat_sat_g": result.fat_sat_g,
            "carbohydrate_g": result.carbohydrate_g,
            "sugar_g": result.sugar_g,
            "fibre_g": result.fibre_g,
            "salt_g": result.salt_g,
            "sodium_mg": result.sodium_mg,
        }

    return {
        "ai_interaction_id": str(interaction_id) if interaction_id else None,
        "ingredient_draft": ingredient_draft,
        "nutrition": nutrition,
    }
