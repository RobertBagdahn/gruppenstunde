"""KI-Autovervollständigung für Zutaten (Gemini Flash).

Provides AI-powered suggestions when creating/editing ingredients,
in 6 progressive steps.

Migrated from idea/services/ingredient_ai.py to supply/services/.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call

if TYPE_CHECKING:
    from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


# ---------------------------------------------------------------------------
# Pydantic output schemas for each step
# ---------------------------------------------------------------------------


class BasicInfoSuggestion(BaseModel):
    """Step 1: Basic info suggestions."""

    name: str = Field(description="Korrigierter/standardisierter Name der Zutat")
    description: str = Field(description="Kurzbeschreibung der Zutat (1-2 Sätze)")
    retail_section: str = Field(
        description="Passende Supermarkt-Abteilung, z.B. 'Obst & Gemüse', 'Milchprodukte', 'Backwaren'"
    )


class PhysicalSuggestion(BaseModel):
    """Step 2: Physical properties suggestions."""

    physical_density: float = Field(description="Dichte der Zutat (ca. 1.0 für die meisten Lebensmittel)")
    physical_viscosity: str = Field(description="'solid' für feste Lebensmittel, 'beverage' für Getränke")
    durability_in_days: int = Field(description="Haltbarkeit in Tagen bei optimaler Lagerung")
    max_storage_temperature: int = Field(description="Maximale Lagertemperatur in °C")


class TagsSuggestion(BaseModel):
    """Step 3: Nutritional tags / allergens suggestions."""

    nutritional_tag_ids: list[int] = Field(
        default_factory=list,
        description="IDs der passenden Ernährungstags (Allergene, Unverträglichkeiten)",
    )


class ScoresSuggestion(BaseModel):
    """Step 4: Scores suggestions."""

    child_score: int = Field(ge=1, le=10, description="Kinderfreundlichkeit (1=ungeeignet, 10=sehr beliebt)")
    scout_score: int = Field(ge=1, le=10, description="Pfadfindereignung (1=unpraktisch, 10=ideal für Lager)")
    environmental_score: int = Field(ge=1, le=10, description="Umweltfreundlichkeit (1=schlecht, 10=sehr gut)")
    nova_score: int = Field(ge=1, le=4, description="NOVA-Verarbeitungsgrad (1=unverarbeitet, 4=ultrahochverarbeitet)")


class RecipeInfoSuggestion(BaseModel):
    """Step 5: Recipe info suggestions."""

    standard_recipe_weight_g: float = Field(description="Standard-Rezeptgewicht in Gramm (typische Portion)")
    can_eat_raw: bool = Field(description="Ob Rohverzehr möglich ist")


class NutritionSuggestion(BaseModel):
    """Step 6: Nutritional values per 100g."""

    energy_kj: float = Field(ge=0, description="Energie in kJ pro 100g")
    protein_g: float = Field(ge=0, description="Eiweiß in g pro 100g")
    fat_g: float = Field(ge=0, description="Fett in g pro 100g")
    fat_sat_g: float = Field(ge=0, description="Gesättigte Fettsäuren in g pro 100g")
    carbohydrate_g: float = Field(ge=0, description="Kohlenhydrate in g pro 100g")
    sugar_g: float = Field(ge=0, description="Zucker in g pro 100g")
    fibre_g: float = Field(ge=0, description="Ballaststoffe in g pro 100g")
    salt_g: float = Field(ge=0, description="Salz in g pro 100g")
    sodium_mg: float = Field(ge=0, description="Natrium in mg pro 100g")
    fructose_g: float = Field(ge=0, description="Fructose in g pro 100g")
    lactose_g: float = Field(ge=0, description="Laktose in g pro 100g")
    fruit_factor: float = Field(ge=0.0, le=1.0, description="Obst-/Gemüse-Anteil (0.0-1.0)")


# Map step names to schema classes
_STEP_SCHEMAS: dict[str, type[BaseModel]] = {
    "basic": BasicInfoSuggestion,
    "physical": PhysicalSuggestion,
    "tags": TagsSuggestion,
    "scores": ScoresSuggestion,
    "recipe-info": RecipeInfoSuggestion,
    "nutrition": NutritionSuggestion,
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class IngredientAIService:
    """Service for AI-powered ingredient auto-completion."""

    def get_suggestions(self, step: str, ingredient: "Ingredient", user: AbstractBaseUser | None = None) -> dict[str, Any]:
        """Get AI suggestions for a specific step.

        Args:
            step: One of 'basic', 'physical', 'tags', 'scores', 'recipe-info', 'nutrition'
            ingredient: The Ingredient instance to suggest data for
            user: The authenticated user

        Returns:
            Dict with suggested field values

        Raises:
            ValueError: If step is not recognized
        """
        if step not in _STEP_SCHEMAS:
            raise ValueError(f"Unknown step: {step}. Must be one of: {list(_STEP_SCHEMAS.keys())}")

        schema = _STEP_SCHEMAS[step]
        prompt = self._build_prompt(step, ingredient)

        try:
            from google.genai import types

            response = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
                context=f"ingredient_ai_{step}",
            )
            if response is None:
                logger.warning("AI client not available – returning empty suggestions")
                return {}
            result = schema.model_validate_json(response.text)
            logger.info("Ingredient AI step=%s result: %s", step, result.model_dump())
            return result.model_dump()

        except Exception:
            logger.warning("Ingredient AI step=%s failed", step, exc_info=True)
            return {}

    def _build_prompt(self, step: str, ingredient: "Ingredient") -> str:
        """Build the prompt for a given step."""
        base = (
            f"Du bist ein Ernährungsexperte. Analysiere die Zutat '{ingredient.name}' "
            "und gib fundierte Vorschläge. Antworte immer auf Deutsch.\n\n"
        )

        if step == "basic":
            return base + (
                "Schritt 1 – Basis-Info:\n"
                "Gib den korrigierten/standardisierten Namen der Zutat an, "
                "eine kurze Beschreibung (1-2 Sätze) und die passende "
                "Supermarkt-Abteilung (z.B. 'Obst & Gemüse', 'Milchprodukte', "
                "'Backwaren', 'Fleisch & Wurst', 'Tiefkühl', 'Konserven', "
                "'Gewürze & Öle', 'Getränke', 'Süßwaren')."
            )

        if step == "physical":
            return base + (
                "Schritt 2 – Physikalische Eigenschaften:\n"
                "Gib die Dichte (ca. 1.0 für feste Lebensmittel, "
                "ca. 1.0-1.05 für Flüssigkeiten), den Aggregatzustand "
                "('solid' oder 'beverage'), die Haltbarkeit in Tagen "
                "bei optimaler Lagerung und die maximale Lagertemperatur in °C an."
            )

        if step == "tags":
            from supply.models import NutritionalTag

            available = list(NutritionalTag.objects.values("id", "name", "name_opposite"))
            tag_list = ", ".join(
                f"{t['name']} (ID:{t['id']}, Gegenbezeichnung: {t['name_opposite']})" for t in available
            )
            return base + (
                "Schritt 3 – Allergene und Unverträglichkeiten:\n"
                f"Verfügbare Ernährungstags: {tag_list}\n\n"
                "Wähle die IDs der Tags aus, die auf diese Zutat zutreffen. "
                "Beispiel: Wenn die Zutat Laktose enthält, wähle den 'Laktose'-Tag."
            )

        if step == "scores":
            return base + (
                "Schritt 4 – Bewertungen:\n"
                "Bewerte die Zutat auf 4 Skalen:\n"
                "- child_score (1-10): Wie beliebt ist die Zutat bei Kindern?\n"
                "- scout_score (1-10): Wie geeignet ist sie für Pfadfinderaktivitäten "
                "(Lagerkochen, Wanderungen, ohne Kühlung)?\n"
                "- environmental_score (1-10): Wie umweltfreundlich ist die Zutat "
                "(regional, saisonal, Transport, Verpackung)?\n"
                "- nova_score (1-4): NOVA-Verarbeitungsgrad "
                "(1=unverarbeitet, 2=verarbeitet, 3=verarbeitete Lebensmittel, "
                "4=ultrahochverarbeitete Lebensmittel)"
            )

        if step == "recipe-info":
            return base + (
                "Schritt 5 – Rezept-Informationen:\n"
                "Gib das Standard-Rezeptgewicht in Gramm an "
                "(typische Menge, die in einem Rezept für 4 Personen verwendet wird) "
                "und ob Rohverzehr möglich ist (z.B. Möhren ja, Hähnchen nein)."
            )

        if step == "nutrition":
            return base + (
                "Schritt 6 – Nährwerte pro 100g:\n"
                "Gib die Nährwerte pro 100g der Zutat an. "
                "Verwende realistische Werte basierend auf Nährwerttabellen. "
                "Alle Werte müssen ≥ 0 sein. "
                "Der fruit_factor gibt den Obst-/Gemüse-Anteil an (0.0 für Fleisch, "
                "1.0 für reines Obst/Gemüse)."
            )

        return base  # Fallback
