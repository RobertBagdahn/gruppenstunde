"""Magic wand: re-rank the panel by a free-text wish and create missing ingredients as drafts.

Exactly one Gemini call is made per wand click. Without AI budget a keyword fallback re-ranks the
candidates and no ingredient is created.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from ninja.errors import HttpError
from pydantic import BaseModel, Field

from core.services.gemini import DEFAULT_TEXT_MODEL

from . import traits as t
from .context import build_context
from .directions import MEAL_TYPE_CONFIG
from .engine import (
    Filters,
    build_panel,
    default_portion,
    excluded_ids,
    load_candidates,
    passes_hard,
)
from .service import result_to_response
from .traits import Candidate

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from planner.models import Meal, MealPlan
    from planner.schemas.suggestion_panel import SuggestionFilters

logger = logging.getLogger(__name__)

AI_OPTIONAL_FALLBACK_CODES = frozenset(
    {"ai_quota_exceeded", "ai_public_budget_exhausted", "ai_visitor_limit", "ai_login_required", "ai_rate_limited"}
)
MAX_CANDIDATES_FOR_AI = 60
MAX_NEW_INGREDIENTS = 3
RANK_BOOST = 5.0
NEW_INGREDIENT_BOOST = 6.0


class WandAiOutput(BaseModel):
    ranked: list[str] = Field(
        description="Candidate keys like 'recipe:12' or 'ingredient:7', best match for the wish first, max 24"
    )
    new_ingredients: list[str] = Field(
        default_factory=list,
        description="Up to 3 names of simple foods/drinks that fit the wish but are missing in the candidate list",
    )


def _keywords(free_text: str) -> list[str]:
    return [w for w in re.split(r"[^\wäöüß]+", free_text.lower()) if len(w) >= 3]


def keyword_boosts(candidates: list[Candidate], free_text: str) -> dict[tuple[str, int], float]:
    """Fallback ranking: boost candidates whose title or description contains wish words."""
    words = _keywords(free_text)
    boosts: dict[tuple[str, int], float] = {}
    for c in candidates:
        title = c.title.lower()
        hits = sum(1.0 for w in words if w in title) + sum(0.5 for w in words if w in c.description.lower())
        if hits:
            boosts[(c.kind, c.id)] = RANK_BOOST + hits
    return boosts


def _ask_gemini(
    user: AbstractBaseUser, free_text: str, candidates: list[Candidate], summary: str
) -> WandAiOutput | None:
    """Single Gemini call. Returns None when AI is unavailable."""
    from google.genai import types as genai_types

    from core.services.gemini import gemini_call

    lines = "\n".join(
        f"- {c.kind}:{c.id} | {c.title} | {', '.join(t.trait_labels(c)) or 'ohne Merkmale'}" for c in candidates
    )
    prompt = (
        "Du bist Koch-Assistent für Gruppenfreizeiten. Der Nutzer wünscht sich für eine Mahlzeit: "
        f"„{free_text}“.\n\nKontext:\n{summary}\n\nKandidaten:\n{lines}\n\n"
        "Sortiere die passendsten Kandidaten (max. 24) nach Eignung für den Wunsch. "
        "Schlage zusätzlich bis zu 3 einfache Lebensmittel/Getränke vor, die zum Wunsch passen, aber in der "
        "Kandidatenliste fehlen (nur Namen, keine Rezepte; leer lassen, wenn die Liste reicht)."
    )
    try:
        response, _ = gemini_call(
            user=user,
            model=DEFAULT_TEXT_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=WandAiOutput,
                http_options=genai_types.HttpOptions(timeout=15_000),
            ),
            context="intelligent_suggestions_rerank",
        )
    except HttpError as exc:
        if getattr(exc, "code", "") in AI_OPTIONAL_FALLBACK_CODES:
            logger.info("Magic wand AI skipped (%s), using keyword fallback", exc.code)
            return None
        raise
    except Exception:
        logger.warning("Magic wand AI failed, using keyword fallback", exc_info=True)
        return None
    if response is None:
        return None
    try:
        return WandAiOutput.model_validate_json(response.text)
    except Exception:
        logger.warning("Magic wand AI returned invalid JSON", exc_info=True)
        return None


def _create_draft_candidates(
    names: list[str], user: AbstractBaseUser, meal: Meal, existing_ids: set[int], known: set[tuple[str, int]]
) -> list[Candidate]:
    """Create missing ingredients as drafts (marked standalone) and return them as 'new' candidates."""
    from supply.models import Ingredient
    from supply.services.ingredient_ai_suggest_service import ai_create_ingredient

    out: list[Candidate] = []
    for name in names[:MAX_NEW_INGREDIENTS]:
        name = name.strip()
        if not name:
            continue
        existed = Ingredient.objects.filter(name__iexact=name).exists()
        try:
            ingredient = ai_create_ingredient(name, user=user)
        except Exception:
            logger.warning("Magic wand could not create ingredient %r", name, exc_info=True)
            continue
        if ingredient.id in existing_ids or ("ingredient", ingredient.id) in known:
            continue
        if not existed and not ingredient.is_standalone_food:
            ingredient.is_standalone_food = True
            ingredient.save(update_fields=["is_standalone_food"])
        portion_id, unit_id, qty, grams = default_portion(ingredient)
        if portion_id is None:
            continue
        tags = list(ingredient.nutritional_tags.all())
        out.append(
            Candidate(
                kind="ingredient",
                id=ingredient.id,
                title=ingredient.name,
                slug=ingredient.slug,
                section=ingredient.retail_section.name if ingredient.retail_section else "",
                description=ingredient.description or "",
                sugar_per_100g=float(ingredient.sugar_g) if ingredient.sugar_g is not None else None,
                price_pp=(
                    round(float(ingredient.price_per_kg) * grams / 1000, 2)
                    if ingredient.price_per_kg and grams
                    else None
                ),
                tag_ids={tag.id for tag in tags},
                tag_names={tag.name for tag in tags},
                child_score=ingredient.child_score,
                badge="community" if not existed else "verified",
                is_new=not existed,
                portion_id=portion_id,
                measuring_unit_id=unit_id,
                quantity=qty,
            )
        )
    return out


def run_wand(
    meal_plan: MealPlan,
    meal: Meal,
    user: AbstractBaseUser,
    free_text: str,
    filters: SuggestionFilters,
    seed: int | None,
) -> dict[str, Any]:
    from .service import to_engine_filters

    engine_filters: Filters = to_engine_filters(filters)
    ctx = build_context(meal_plan, meal.meal_type)
    pool = load_candidates(meal_plan, meal, user)
    eligible = [c for c in pool if passes_hard(c, ctx, set(ctx.nutritional_tag_ids))]

    # Shortlist for the AI: keyword hits first, then the first candidates in load order.
    keyword = keyword_boosts(eligible, free_text)
    shortlist = sorted(eligible, key=lambda c: keyword.get((c.kind, c.id), 0.0), reverse=True)[:MAX_CANDIDATES_FOR_AI]
    summary = (
        f"Mahlzeit: {meal.get_meal_type_display()}; Altersgruppen: {', '.join(ctx.age_groups) or 'unbekannt'}; "
        f"Jahreszeit: {ctx.season_hint}; Kochmöglichkeiten: {', '.join(ctx.cooking_sources) or 'unbekannt'}"
    )
    ai = _ask_gemini(user, free_text, shortlist, summary)

    boosts: dict[tuple[str, int], float] = {}
    if ai is not None:
        valid = {f"{c.kind}:{c.id}" for c in shortlist}
        ranked = [key for key in ai.ranked if key in valid]
        for position, key in enumerate(ranked):
            kind, _, ident = key.partition(":")
            boosts[(kind, int(ident))] = RANK_BOOST - position * 0.1
        config = MEAL_TYPE_CONFIG.get(meal.meal_type)
        if config and config.ingredient_ratio > 0 and ai.new_ingredients:
            _, ingredient_ids = excluded_ids(meal_plan, meal)
            known = {(c.kind, c.id) for c in pool}
            drafts = _create_draft_candidates(ai.new_ingredients, user, meal, ingredient_ids, known)
            for draft in drafts:
                boosts[(draft.kind, draft.id)] = NEW_INGREDIENT_BOOST
            pool = pool + drafts
    if not boosts:
        boosts = keyword

    result = build_panel(meal_plan, meal, user, engine_filters, seed, candidates=pool, boosts=boosts)
    return result_to_response(result, meal, filters, seed, ai_used=ai is not None)
