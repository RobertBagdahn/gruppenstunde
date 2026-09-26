"""Recipe side of the data offensive: junk detection and recipe type re-categorisation.

Junk recipes (test data, empty drafts) are archived, never hard-deleted, so
the action is reversible. Recipe types are re-categorised with one AI call per
batch of recipes; only confident, different suggestions are applied.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Literal

from django.db.models import Count
from pydantic import BaseModel, Field

from content.choices import ContentStatus
from core.services.gemini import (
    DEFAULT_TEXT_MODEL,
    GeminiInvalidResponseError,
    GeminiUnavailableError,
    GeminiUpstreamRateLimitError,
    gemini_call,
)
from supply.choices import RecipeTypeChoices

logger = logging.getLogger(__name__)

JUNK_TITLE_PATTERN = re.compile(
    r"(^e2e\b|\be2e\b|roundtrip rezept|^zz\b|\bai probe\b|^test\b|\btestrezept\b|\d{10,})", re.IGNORECASE
)
RECATEGORIZE_BATCH_SIZE = 25
MIN_RECATEGORIZE_CONFIDENCE = 0.75

RecipeTypeValue = Literal["breakfast", "warm_meal", "cold_meal", "dessert", "recipe_part", "drink", "snack"]


@dataclass
class RecipeBulkResult:
    changed: int = 0
    skipped: int = 0
    messages: list[str] = field(default_factory=list)


def junk_reason(title: str, item_count: int, status: str) -> str | None:
    """Return why a recipe is junk, or ``None`` if it looks like a real recipe."""
    if JUNK_TITLE_PATTERN.search(title or ""):
        return "Testdaten im Titel"
    if item_count == 0 and status == ContentStatus.DRAFT:
        return "Leerer Entwurf ohne Zutaten"
    return None


def junk_recipes(ids: list[int] | None = None) -> list[tuple[Any, str]]:
    """All non-archived recipes that look like junk, with a reason."""
    from recipe.models import Recipe

    queryset = Recipe.objects.exclude(status=ContentStatus.ARCHIVED).annotate(item_count=Count("recipe_items"))
    if ids:
        queryset = queryset.filter(id__in=ids)
    result = []
    for recipe in queryset.order_by("title"):
        reason = junk_reason(recipe.title, recipe.item_count, recipe.status)
        if reason:
            result.append((recipe, reason))
    return result


def archive_junk_recipes(*, ids: list[int] | None, apply: bool) -> RecipeBulkResult:
    """Archive junk recipes (reversible)."""
    result = RecipeBulkResult()
    for recipe, reason in junk_recipes(ids):
        result.changed += 1
        result.messages.append(f"#{recipe.id} {recipe.title} – {reason}")
        if apply:
            recipe.status = ContentStatus.ARCHIVED
            recipe.save(update_fields=["status", "updated_at"])
    return result


class RecipeTypeSuggestion(BaseModel):
    id: int
    recipe_type: RecipeTypeValue
    confidence: float = Field(description="0.0–1.0")
    reason: str = Field(description="Kurz, Deutsch, max. 80 Zeichen")


class RecipeTypeBatch(BaseModel):
    items: list[RecipeTypeSuggestion]


def _recipe_line(recipe: Any) -> str:
    ingredients = [
        item.portion.ingredient.name
        for item in recipe.recipe_items.all()[:12]
        if item.portion_id and item.portion and item.portion.ingredient_id
    ]
    summary = (recipe.summary or recipe.description or "").replace("\n", " ")[:140]
    return (
        f"- id={recipe.id} | titel={recipe.title!r} | aktuell={recipe.recipe_type} | "
        f"zutaten={', '.join(ingredients) or '–'} | kurz={summary or '–'}"
    )


def build_recategorize_prompt(recipes: list[Any]) -> str:
    choices = "\n".join(f"- {value}: {label}" for value, label in RecipeTypeChoices.choices)
    listing = "\n".join(_recipe_line(recipe) for recipe in recipes)
    return f"""Ordne jedes Rezept einer Pfadfinder-Kochplattform genau einer Kategorie zu.

KATEGORIEN
{choices}

REGELN
- breakfast: typisch morgens (Müsli, Porridge, Rührei, Pfannkuchen zum Frühstück, Brotaufstriche).
- warm_meal: warme Hauptmahlzeit (Mittag/Abend). cold_meal: kalte Hauptmahlzeit (Salate als Hauptgericht,
  Brotzeit, Wraps kalt).
- dessert: süße Nachspeise. snack: Zwischenmahlzeit, Fingerfood, Gebäck, Knabberei.
- drink: Getränk (Tee, Kakao, Punsch, Smoothie). recipe_part: Bestandteil anderer Rezepte (Soße, Dressing,
  Teig, Brühe, Gewürzmischung).
- Behalte die aktuelle Kategorie, wenn sie passt. confidence >= 0.8 nur bei eindeutigen Fällen.

REZEPTE
{listing}
"""


def recategorize_recipes(
    *, ids: list[int] | None, apply: bool, user: Any | None = None, bypass_limits: bool = True
) -> RecipeBulkResult:
    """Re-categorise recipe types with AI in batches; apply confident changes only."""
    from google.genai import types

    from recipe.models import Recipe

    result = RecipeBulkResult()
    queryset = (
        Recipe.objects.exclude(status=ContentStatus.ARCHIVED)
        .prefetch_related("recipe_items__portion__ingredient")
        .order_by("id")
    )
    if ids:
        queryset = queryset.filter(id__in=ids)
    recipes = list(queryset)
    config = types.GenerateContentConfig(
        response_mime_type="application/json", response_schema=RecipeTypeBatch, temperature=0.1
    )

    for start in range(0, len(recipes), RECATEGORIZE_BATCH_SIZE):
        batch = recipes[start : start + RECATEGORIZE_BATCH_SIZE]
        try:
            response, _ = gemini_call(
                user=user,
                model=DEFAULT_TEXT_MODEL,
                contents=build_recategorize_prompt(batch),
                config=config,
                context="recipe_recategorize_batch",
                bypass_limits=bypass_limits,
                is_background=bypass_limits,
            )
        except (GeminiUnavailableError, GeminiUpstreamRateLimitError, GeminiInvalidResponseError) as exc:
            result.messages.append(f"KI-Fehler, Rest übersprungen: {exc.message if hasattr(exc, 'message') else exc}")
            return result
        if response is None:
            result.messages.append("KI nicht verfügbar – Rezeptkategorien übersprungen.")
            return result
        suggestions = {item.id: item for item in RecipeTypeBatch.model_validate_json(response.text).items}
        for recipe in batch:
            suggestion = suggestions.get(recipe.id)
            if suggestion is None or suggestion.recipe_type == recipe.recipe_type:
                result.skipped += 1
                continue
            if suggestion.confidence < MIN_RECATEGORIZE_CONFIDENCE:
                result.skipped += 1
                continue
            result.changed += 1
            result.messages.append(
                f"#{recipe.id} {recipe.title}: {recipe.recipe_type} → {suggestion.recipe_type} ({suggestion.reason})"
            )
            if apply:
                recipe.recipe_type = suggestion.recipe_type
                recipe.save(update_fields=["recipe_type", "updated_at"])
    return result
