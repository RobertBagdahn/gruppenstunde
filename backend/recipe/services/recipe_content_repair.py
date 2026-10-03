"""Repair implausible recipe content: Cooklang placeholders, missing steps, missing tags.

Every function is dry-run capable (``apply=False``) and idempotent: it only
touches recipes that still show the defect, so re-running is safe.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from django.db import transaction
from django.db.models import Count, Q
from pydantic import BaseModel, Field

from content.choices import ContentStatus
from content.models import Tag
from core.services.gemini import (
    DEFAULT_TEXT_MODEL,
    GeminiInvalidResponseError,
    GeminiUnavailableError,
    GeminiUpstreamRateLimitError,
    gemini_call,
)
from recipe.models import Recipe, RecipeStep, RecipeStepIngredient
from recipe.services.recipe_data_offensive import JUNK_TITLE_PATTERN, RecipeBulkResult
from recipe.services.step_ai_service import AiStepService

logger = logging.getLogger(__name__)

PLACEHOLDER_SUMMARY_PREFIX = "Importiert aus Cooklang"
BATCH_SIZE = 20
MAX_TAGS_PER_RECIPE = 5
MAX_SUMMARY_LENGTH = 200

# "#Schüssel" is Cooklang cookware syntax; markdown headings ("## Titel") are followed by a space.
COOKLANG_MARKER = re.compile(r"(?<![#\w])#(?=[^\W\d])")

_AI_ERRORS = (GeminiUnavailableError, GeminiUpstreamRateLimitError, GeminiInvalidResponseError)


class SummaryItem(BaseModel):
    id: int
    summary: str = Field(min_length=10, max_length=MAX_SUMMARY_LENGTH, description="1–2 Sätze, Deutsch")


class SummaryBatch(BaseModel):
    items: list[SummaryItem]


class TagItem(BaseModel):
    id: int
    tag_slugs: list[str] = Field(max_length=MAX_TAGS_PER_RECIPE)


class TagBatch(BaseModel):
    items: list[TagItem]


def _active_recipes() -> Any:
    return Recipe.objects.exclude(status=ContentStatus.ARCHIVED)


def _real_recipes(recipes: Any) -> list[Recipe]:
    """Drop test/junk recipes (e.g. "E2E Rezept"); they are archived, not repaired."""
    return [recipe for recipe in recipes if not JUNK_TITLE_PATTERN.search(recipe.title or "")]


def _ingredient_names(recipe: Recipe, limit: int = 15) -> list[str]:
    return [
        item.portion.ingredient.name
        for item in recipe.recipe_items.all()[:limit]
        if item.portion_id and item.portion and item.portion.ingredient_id
    ]


def _structured_config(schema: type[BaseModel]) -> Any:
    from google.genai import types

    return types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema, temperature=0.2)


def _batches(recipes: list[Recipe]) -> list[list[Recipe]]:
    return [recipes[start : start + BATCH_SIZE] for start in range(0, len(recipes), BATCH_SIZE)]


def _ai_batch(prompt: str, schema: type[BaseModel], context: str, user: Any, bypass_limits: bool) -> Any:
    response, _ = gemini_call(
        user=user,
        model=DEFAULT_TEXT_MODEL,
        contents=prompt,
        config=_structured_config(schema),
        context=context,
        bypass_limits=bypass_limits,
        is_background=bypass_limits,
    )
    if response is None or not response.text:
        raise GeminiUnavailableError("Leere KI-Antwort")
    return schema.model_validate_json(response.text)


# --- Cooklang markers -------------------------------------------------------


def strip_cooklang_markers(text: str) -> str:
    """Remove Cooklang cookware markers (``#Schüssel`` → ``Schüssel``)."""
    return COOKLANG_MARKER.sub("", text)


def clean_cooklang_markers(*, ids: list[int] | None, apply: bool) -> RecipeBulkResult:
    """Strip leftover Cooklang ``#cookware`` markers from recipe descriptions."""
    result = RecipeBulkResult()
    queryset = _active_recipes().filter(description__contains="#")
    if ids:
        queryset = queryset.filter(id__in=ids)
    for recipe in _real_recipes(queryset.order_by("id")):
        cleaned = strip_cooklang_markers(recipe.description)
        if cleaned == recipe.description:
            continue
        result.changed += 1
        result.messages.append(f"#{recipe.id} {recipe.title}: Cooklang-Marker entfernt")
        if apply:
            recipe.description = cleaned
            recipe.save(update_fields=["description", "updated_at"])
    return result


# --- Placeholder summaries --------------------------------------------------


def placeholder_summary_recipes(ids: list[int] | None = None) -> list[Recipe]:
    queryset = _active_recipes().filter(Q(summary__startswith=PLACEHOLDER_SUMMARY_PREFIX) | Q(summary=""))
    if ids:
        queryset = queryset.filter(id__in=ids)
    return _real_recipes(queryset.prefetch_related("recipe_items__portion__ingredient").order_by("id"))


def _summary_prompt(recipes: list[Recipe]) -> str:
    listing = "\n".join(
        f"- id={recipe.id} | titel={recipe.title!r} | typ={recipe.recipe_type} | "
        f"zutaten={', '.join(_ingredient_names(recipe)) or '–'} | "
        f"anleitung={recipe.description.replace(chr(10), ' ')[:300] or '–'}"
        for recipe in recipes
    )
    return f"""Schreibe für jedes Rezept einer Pfadfinder-Kochplattform eine Kurzbeschreibung.

REGELN
- 1–2 Sätze, höchstens {MAX_SUMMARY_LENGTH} Zeichen, Deutsch mit echten Umlauten.
- Beschreibe Gericht, Geschmack oder Besonderheit; nenne nur Zutaten aus der Liste.
- Keine Werbesprache, kein Verweis auf Import, Cooklang oder Quelle, nicht den Titel wiederholen.
- Jede id genau einmal.

REZEPTE
{listing}
"""


def fix_placeholder_summaries(
    *, ids: list[int] | None, apply: bool, user: Any | None = None, bypass_limits: bool = True
) -> RecipeBulkResult:
    """Replace "Importiert aus Cooklang (…)" and empty summaries with AI-written short descriptions."""
    result = RecipeBulkResult()
    for batch in _batches(placeholder_summary_recipes(ids)):
        try:
            parsed = _ai_batch(_summary_prompt(batch), SummaryBatch, "recipe_summary_repair", user, bypass_limits)
        except (*_AI_ERRORS, ValueError) as exc:
            result.messages.append(f"KI-Fehler bei Beschreibungen, Batch übersprungen: {exc}")
            result.skipped += len(batch)
            if isinstance(exc, GeminiUnavailableError):
                result.messages.append("KI nicht verfügbar (GOOGLE_CLOUD_PROJECT gesetzt?) – Schritt abgebrochen.")
                break
            continue
        by_id = {item.id: item.summary.strip() for item in parsed.items}
        for recipe in batch:
            summary = by_id.get(recipe.id)
            if not summary or summary.startswith(PLACEHOLDER_SUMMARY_PREFIX):
                result.skipped += 1
                continue
            result.changed += 1
            result.messages.append(f"#{recipe.id} {recipe.title}: {summary}")
            if apply:
                recipe.summary = summary
                recipe.save(update_fields=["summary", "updated_at"])
    return result


# --- Missing steps ----------------------------------------------------------


def recipes_without_steps(ids: list[int] | None = None) -> list[Recipe]:
    queryset = _active_recipes().annotate(step_total=Count("steps")).filter(step_total=0)
    if ids:
        queryset = queryset.filter(id__in=ids)
    return _real_recipes(queryset.prefetch_related("recipe_items__portion__ingredient").order_by("id"))


def save_steps(recipe: Recipe, steps: list[dict[str, Any]]) -> None:
    """Persist generated step dicts (same shape the step API accepts)."""
    valid_item_ids = set(recipe.recipe_items.values_list("id", flat=True))
    with transaction.atomic():
        recipe.steps.all().delete()
        for index, data in enumerate(steps):
            instruction = (data.get("instruction") or "").strip()
            if not instruction:
                continue
            step = RecipeStep.objects.create(
                recipe=recipe,
                sort_order=index,
                instruction=instruction,
                duration_minutes=data.get("duration_minutes"),
                section=data.get("section") or "",
            )
            seen: set[int] = set()
            for ing_index, ing in enumerate(data.get("step_ingredients", [])):
                item_id = ing["recipe_item_id"]
                if item_id not in valid_item_ids or item_id in seen:
                    continue
                seen.add(item_id)
                RecipeStepIngredient.objects.create(
                    step=step,
                    recipe_item_id=item_id,
                    quantity_modifier=ing.get("quantity_modifier", 1.0),
                    preparation=ing.get("preparation", ""),
                    sort_order=ing_index,
                )


def fix_missing_steps(
    *, ids: list[int] | None, apply: bool, user: Any | None = None, bypass_limits: bool = True
) -> RecipeBulkResult:
    """Create structured steps: convert an existing description, else generate from ingredients."""
    result = RecipeBulkResult()
    for recipe in recipes_without_steps(ids):
        if not recipe.recipe_items.exists():
            result.skipped += 1
            result.messages.append(f"#{recipe.id} {recipe.title}: keine Zutaten, übersprungen")
            continue
        description = strip_cooklang_markers(recipe.description).strip()
        try:
            if description:
                steps = AiStepService.convert_markdown_to_steps(
                    recipe, description, user=user, bypass_limits=bypass_limits
                )
                origin = "aus Beschreibung"
            else:
                steps, _ = AiStepService.generate_steps_from_items(recipe, user=user, bypass_limits=bypass_limits)
                origin = "KI-generiert (bitte prüfen)"
        except (*_AI_ERRORS, ValueError) as exc:
            result.skipped += 1
            result.messages.append(f"#{recipe.id} {recipe.title}: KI-Fehler, übersprungen: {exc}")
            if isinstance(exc, GeminiUnavailableError):
                result.messages.append("KI nicht verfügbar (GOOGLE_CLOUD_PROJECT gesetzt?) – Schritt abgebrochen.")
                break
            continue
        if not steps:
            result.skipped += 1
            continue
        result.changed += 1
        result.messages.append(f"#{recipe.id} {recipe.title}: {len(steps)} Schritte {origin}")
        if apply:
            save_steps(recipe, steps)
    return result


# --- Missing tags -----------------------------------------------------------


def untagged_recipes(ids: list[int] | None = None) -> list[Recipe]:
    queryset = _active_recipes().annotate(tag_total=Count("tags")).filter(tag_total=0)
    if ids:
        queryset = queryset.filter(id__in=ids)
    return _real_recipes(queryset.prefetch_related("recipe_items__portion__ingredient").order_by("id"))


def _tag_prompt(recipes: list[Recipe], catalog: list[Tag]) -> str:
    tags = "\n".join(f"- {tag.slug} ({tag.name}, Gruppe {tag.group})" for tag in catalog)
    listing = "\n".join(
        f"- id={recipe.id} | titel={recipe.title!r} | typ={recipe.recipe_type} | "
        f"zutaten={', '.join(_ingredient_names(recipe)) or '–'} | kurz={(recipe.summary or '–')[:140]}"
        for recipe in recipes
    )
    return f"""Ordne jedem Rezept einer Pfadfinder-Kochplattform passende Tags aus dem Katalog zu.

REGELN
- 2–{MAX_TAGS_PER_RECIPE} Tags pro Rezept, nur slugs aus dem Katalog, keine neuen erfinden.
- Nur Tags, die wirklich zum Rezept passen (Ernährungsform, Anlass, Küche, Eigenschaft).
- Jede id genau einmal.

TAG-KATALOG
{tags}

REZEPTE
{listing}
"""


def fix_missing_tags(
    *, ids: list[int] | None, apply: bool, user: Any | None = None, bypass_limits: bool = True
) -> RecipeBulkResult:
    """Tag untagged recipes with AI picks restricted to the approved tag catalog."""
    result = RecipeBulkResult()
    recipes = untagged_recipes(ids)
    if not recipes:
        return result
    catalog = list(Tag.objects.filter(is_approved=True).order_by("group", "name"))
    if not catalog:
        result.messages.append("Kein freigegebener Tag-Katalog vorhanden.")
        return result
    by_slug = {tag.slug: tag for tag in catalog}
    for batch in _batches(recipes):
        try:
            parsed = _ai_batch(_tag_prompt(batch, catalog), TagBatch, "recipe_tag_repair", user, bypass_limits)
        except (*_AI_ERRORS, ValueError) as exc:
            result.messages.append(f"KI-Fehler bei Tags, Batch übersprungen: {exc}")
            result.skipped += len(batch)
            if isinstance(exc, GeminiUnavailableError):
                result.messages.append("KI nicht verfügbar (GOOGLE_CLOUD_PROJECT gesetzt?) – Schritt abgebrochen.")
                break
            continue
        picks = {item.id: item.tag_slugs for item in parsed.items}
        for recipe in batch:
            tags = [by_slug[slug] for slug in dict.fromkeys(picks.get(recipe.id, [])) if slug in by_slug]
            tags = tags[:MAX_TAGS_PER_RECIPE]
            if not tags:
                result.skipped += 1
                continue
            result.changed += 1
            result.messages.append(f"#{recipe.id} {recipe.title}: {', '.join(tag.name for tag in tags)}")
            if apply:
                recipe.tags.add(*tags)
    return result


def content_defect_counts() -> dict[str, int]:
    """Counts of recipes that still show each defect (for dry-run reporting)."""
    active = _active_recipes()
    return {
        "placeholder_summaries": active.filter(
            Q(summary__startswith=PLACEHOLDER_SUMMARY_PREFIX) | Q(summary="")
        ).count(),
        "without_steps": active.annotate(n=Count("steps")).filter(n=0).count(),
        "without_tags": active.annotate(n=Count("tags")).filter(n=0).count(),
    }
