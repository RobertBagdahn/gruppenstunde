"""LLM-based ingredient suggestion service for recipe improvement.

Given a recipe and an objective (e.g. "mehr Ballaststoffe", "weniger Zucker"),
generates ingredient suggestions using Gemini with structured JSON output.
Results are cached for 24h and rate-limited to 10 requests per user per hour.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.core.cache import cache
from ninja.errors import HttpError
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser

    from recipe.models import Recipe

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
AI_TIMEOUT_MS = 30_000
CACHE_TTL_SECONDS = 60 * 60 * 24  # 24 hours
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW_SECONDS = 60 * 60  # 1 hour


# ---------------------------------------------------------------------------
# Pydantic output schemas
# ---------------------------------------------------------------------------


class SuggestionItem(BaseModel):
    ingredient_name: str = Field(description="Name der vorgeschlagenen Zutat")
    recommended_amount: float = Field(description="Empfohlene Menge")
    unit: str = Field(description="Einheit, z.B. 'g', 'ml', 'Stück'")
    reasoning: str = Field(description="Begründung für den Vorschlag")
    expected_improvement: str = Field(description="Erwartete Verbesserung, z.B. '+3g Ballaststoffe pro 100g'")


class SuggestionsOutput(BaseModel):
    suggestions: list[SuggestionItem] = Field(
        default_factory=list,
        description="Liste mit 3 Zutat-Vorschlägen zur Rezeptverbesserung",
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_ingredient_list(recipe: Recipe) -> str:
    """Build a human-readable ingredient list from RecipeItems."""
    from recipe.models import RecipeItem

    items = RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion",
        "portion__ingredient",
        "ingredient",
        "measuring_unit",
    )

    lines: list[str] = []
    for item in items:
        ingredient = item.ingredient or (item.portion.ingredient if item.portion else None)
        if not ingredient:
            continue

        name = ingredient.name
        qty = item.quantity

        unit_label = ""
        if item.measuring_unit:
            unit_label = item.measuring_unit.name
        elif item.portion and item.portion.measuring_unit:
            unit_label = item.portion.measuring_unit.name

        lines.append(f"- {qty} {unit_label} {name}".strip())

    return "\n".join(lines) if lines else "Keine Zutaten vorhanden."


def _build_nutritional_summary(values: dict[str, float]) -> str:
    """Format nutritional values dict as a readable summary."""
    if not values or all(v == 0.0 for v in values.values()):
        return "Keine Nährwertdaten vorhanden."

    labels = {
        "energy_kj": ("Energie", "kJ"),
        "protein_g": ("Eiweiß", "g"),
        "fat_g": ("Fett", "g"),
        "carbohydrate_g": ("Kohlenhydrate", "g"),
        "sugar_g": ("Zucker", "g"),
        "fibre_g": ("Ballaststoffe", "g"),
        "salt_g": ("Salz", "g"),
    }

    lines: list[str] = []
    for key, (label, unit) in labels.items():
        val = values.get(key, 0.0)
        lines.append(f"- {label}: {val:.1f} {unit}")

    return "\n".join(lines)


def _check_rate_limit(user: AbstractUser) -> None:
    """Enforce max 10 requests per user per hour. Raises HttpError(429) if exceeded."""
    cache_key = f"suggestion_ratelimit:{user.id}"
    current_count = cache.get(cache_key, 0)

    if current_count >= RATE_LIMIT_MAX:
        raise HttpError(429, "Zu viele Anfragen. Bitte warte etwas.")

    # Increment; set TTL on first request in the window
    new_count = current_count + 1
    cache.set(cache_key, new_count, timeout=RATE_LIMIT_WINDOW_SECONDS)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_suggestions(recipe: Recipe, objective: str, user: AbstractUser) -> list[dict[str, Any]]:
    """Generate LLM-based ingredient suggestions for improving a recipe.

    Args:
        recipe: The recipe to improve.
        objective: Improvement goal, e.g. "mehr Ballaststoffe", "weniger Zucker".
        user: The requesting user (for rate limiting).

    Returns:
        List of dicts with keys: ingredient_name, recommended_amount, unit,
        reasoning, expected_improvement. Returns empty list on error.
    """
    # --- Rate limit ---
    _check_rate_limit(user)

    # --- Cache lookup ---
    cached_at_ts = int(recipe.cached_at.timestamp()) if recipe.cached_at else 0
    cache_key = f"recipe_suggestion:{recipe.id}:{cached_at_ts}:{hash(objective)}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # --- Gather recipe context ---
    from recipe.services.recipe_checks import get_recipe_nutritional_values

    ingredient_list = _build_ingredient_list(recipe)
    nutritional_values = get_recipe_nutritional_values(recipe)
    nutritional_summary = _build_nutritional_summary(nutritional_values)

    recipe_title = getattr(recipe, "title", "") or "Unbekanntes Rezept"
    recipe_type = getattr(recipe, "recipe_type", "") or "Nicht angegeben"

    # --- Build prompt ---
    prompt = (
        "Du bist ein Ernährungsexperte für Pfadfinder-Gruppenrezepte. "
        "Analysiere das folgende Rezept und schlage genau 3 Zutaten vor, "
        "die hinzugefügt oder angepasst werden könnten, um das angegebene Ziel zu erreichen.\n\n"
        f"Rezeptname: {recipe_title}\n"
        f"Rezepttyp: {recipe_type}\n\n"
        f"Aktuelle Zutaten:\n{ingredient_list}\n\n"
        f"Nährwerte (pro 100g):\n{nutritional_summary}\n\n"
        f"Ziel: {objective}\n\n"
        "Regeln:\n"
        "- Schlage genau 3 Zutaten vor.\n"
        "- Jeder Vorschlag muss den Zutatennamen, die empfohlene Menge, "
        "die Einheit, eine Begründung und die erwartete Verbesserung enthalten.\n"
        "- Die Vorschläge sollen praktisch und für Gruppenkochen geeignet sein.\n"
        "- Berücksichtige die vorhandenen Zutaten und Nährwerte.\n"
        "- Antworte auf Deutsch."
    )

    # --- Call Gemini ---
    try:
        from google.genai import types

        response = gemini_call(
            user=user,
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SuggestionsOutput,
                http_options=types.HttpOptions(timeout=AI_TIMEOUT_MS),
            ),
            context="recipe_suggestions",
        )
        if response is None:
            logger.warning("Gemini client not available — returning empty suggestions")
            return []
        result = SuggestionsOutput.model_validate_json(response.text)
        suggestions = [item.model_dump() for item in result.suggestions]
    except Exception:
        logger.warning("Gemini suggestion request failed", exc_info=True)
        return []

    # --- Cache result ---
    cache.set(cache_key, suggestions, timeout=CACHE_TTL_SECONDS)

    return suggestions
