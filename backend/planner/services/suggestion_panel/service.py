"""Public entry point: build the panel response for a meal slot."""

from __future__ import annotations

import random
from typing import TYPE_CHECKING, Any

from . import traits as t
from .engine import Filters, PanelResult, build_panel
from .traits import Candidate

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from planner.models import Meal, MealPlan
    from planner.schemas.suggestion_panel import SuggestionFilters


def to_engine_filters(filters: SuggestionFilters) -> Filters:
    return Filters(
        taste=filters.taste,
        prep=filters.prep,
        kids=filters.kids,
        budget=filters.budget,
        diet=filters.diet,
        with_dessert=filters.with_dessert,
    )


def _card(c: Candidate, hint: str) -> dict[str, Any]:
    labels = t.trait_labels(c)
    reason = " · ".join(labels[:3]) if labels else hint
    return {
        "kind": c.kind,
        "id": c.id,
        "title": c.title,
        "slug": c.slug,
        "type_label": "Rezept" if c.kind == "recipe" else "Zutat",
        "reason_text": reason[:1].upper() + reason[1:] if reason else "",
        "price_per_person": c.price_pp,
        "recipe_type": c.recipe_type or None,
        "badge": c.badge,
        "is_new": c.is_new,
        "portion_id": c.portion_id,
        "measuring_unit_id": c.measuring_unit_id,
        "quantity": c.quantity,
    }


def result_to_response(
    result: PanelResult, meal: Meal, filters: SuggestionFilters, seed: int | None, ai_used: bool = False
) -> dict[str, Any]:
    ctx = result.context
    return {
        "meal_type": meal.meal_type,
        "directions": [
            {"key": d.key, "label": d.label, "hint": d.hint, "cards": [_card(c, d.hint) for c in cards]}
            for d, cards in result.directions
        ],
        "total": result.total,
        "relaxed_filters": result.relaxed,
        "missing_context": ctx.missing,
        "context": {
            "age_groups": ctx.age_groups,
            "age_derived": ctx.age_derived,
            "setting": ctx.setting,
            "cooking_sources": ctx.cooking_sources,
            "cooling": ctx.cooling,
            "season_hint": ctx.season_hint,
            "season_derived": ctx.season_derived,
        },
        "filters": filters,
        "ai_used": ai_used,
        "seed": seed,
    }


def get_panel(
    meal_plan: MealPlan,
    meal: Meal,
    user: AbstractBaseUser,
    filters: SuggestionFilters,
    seed: int | None,
) -> dict[str, Any]:
    effective_seed = seed if seed is not None else random.randint(1, 1_000_000)
    result = build_panel(meal_plan, meal, user, to_engine_filters(filters), effective_seed)
    return result_to_response(result, meal, filters, effective_seed)
