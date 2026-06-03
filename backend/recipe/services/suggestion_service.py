"""Suggestion service — evaluates rules and system checks for meal plan suggestions.

Replaces cockpit_service.py with richer output including actionable suggestions.
"""

from __future__ import annotations

import datetime as dt
from collections import Counter
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealPlan

from recipe.models import Rule
from recipe.schemas.suggestions import (
    RecipeSuggestionOut,
    SuggestionDashboardOut,
    SuggestionOut,
)
from recipe.services.nutrition_aggregation import (
    _aggregate_day_values,
    _aggregate_meal_plan_values,
    _aggregate_meal_values,
)


# Mapping meal_type to recipe_type for recipe suggestions
MEAL_TYPE_TO_RECIPE_TYPE = {
    "breakfast": "breakfast",
    "lunch": "warm_meal",
    "dinner": "warm_meal",
    "snack": "snack",
    "dessert": "dessert",
}

MEAL_TYPE_LABELS = {
    "breakfast": "Frühstück",
    "lunch": "Mittagessen",
    "dinner": "Abendessen",
    "snack": "Snack",
    "dessert": "Nachtisch",
}


def evaluate_suggestions(meal_plan: "MealPlan") -> SuggestionDashboardOut:
    """Evaluate all rules and system checks for a MealPlan."""
    suggestions: list[SuggestionOut] = []

    suggestions.extend(_check_completeness(meal_plan))
    suggestions.extend(_check_budget(meal_plan))
    suggestions.extend(_evaluate_admin_rules(meal_plan))
    suggestions.extend(_check_duplicates(meal_plan))

    # Sort: red > yellow > green, then by priority
    status_order = {"red": 0, "yellow": 1, "green": 2}
    suggestions.sort(key=lambda s: (status_order.get(s.status, 2), s.priority))

    # Calculate summary
    red_count = sum(1 for s in suggestions if s.status == "red")
    yellow_count = sum(1 for s in suggestions if s.status == "yellow")
    green_count = sum(1 for s in suggestions if s.status == "green")

    if red_count > 0:
        summary_status = "red"
    elif yellow_count > 0:
        summary_status = "yellow"
    else:
        summary_status = "green"

    return SuggestionDashboardOut(
        suggestions=suggestions,
        summary_status=summary_status,
        red_count=red_count,
        yellow_count=yellow_count,
        green_count=green_count,
        total_count=len(suggestions),
    )


def _check_completeness(meal_plan: "MealPlan") -> list[SuggestionOut]:
    """Check that every meal has at least one recipe/ingredient."""
    from planner.models import Meal, MealItem
    from recipe.models import Recipe

    meals = Meal.objects.filter(meal_plan=meal_plan).order_by("start_datetime")
    suggestions: list[SuggestionOut] = []
    has_empty = False

    for meal in meals:
        item_count = MealItem.objects.filter(meal=meal).count()
        if item_count == 0:
            has_empty = True
            # Determine day number
            if meal_plan.start_datetime and meal.start_datetime:
                day_num = (meal.start_datetime.date() - meal_plan.start_datetime.date()).days + 1
            else:
                day_num = 1

            meal_label = MEAL_TYPE_LABELS.get(meal.meal_type, meal.meal_type)
            scope_label = f"Tag {day_num} {meal_label}"

            # Get recipe suggestions
            recipe_type = MEAL_TYPE_TO_RECIPE_TYPE.get(meal.meal_type, "warm_meal")
            recipe_suggestions = _get_recipe_suggestions(recipe_type)

            suggestions.append(
                SuggestionOut(
                    category="completeness",
                    scope="meal",
                    scope_label=scope_label,
                    status="red",
                    priority=1,
                    message="Kein Rezept zugewiesen",
                    tip=f"Füge ein {meal_label}-Rezept hinzu",
                    recipe_suggestions=recipe_suggestions,
                )
            )

    if not has_empty and meals.exists():
        suggestions.append(
            SuggestionOut(
                category="completeness",
                scope="event",
                scope_label="Vollständigkeit",
                status="green",
                priority=1,
                message="Alle Mahlzeiten belegt",
            )
        )

    return suggestions


def _check_duplicates(meal_plan: "MealPlan") -> list[SuggestionOut]:
    """Find recipes used more than once in the plan."""
    from planner.models import MealItem

    items = MealItem.objects.filter(
        meal__meal_plan=meal_plan, recipe__isnull=False
    ).select_related("recipe")

    recipe_counts: Counter = Counter()
    for item in items:
        recipe_counts[item.recipe.title] += 1

    suggestions: list[SuggestionOut] = []
    for title, count in recipe_counts.items():
        if count > 1:
            suggestions.append(
                SuggestionOut(
                    category="duplicate",
                    scope="event",
                    scope_label="Duplikat",
                    status="yellow",
                    priority=4,
                    message=f"'{title}' kommt {count}x vor",
                    tip="Ersetze eine Wiederholung durch ein anderes Rezept",
                )
            )

    return suggestions


def _evaluate_admin_rules(meal_plan: "MealPlan") -> list[SuggestionOut]:
    """Evaluate all admin-configured Rules against aggregated nutrition values."""
    from planner.models import Meal

    suggestions: list[SuggestionOut] = []

    # Event-level rules
    event_rules = Rule.objects.filter(is_active=True, scope="meal_event")
    if event_rules.exists():
        values = _aggregate_meal_plan_values(meal_plan)
        # Normalize to per-day if multiple days
        days = _get_plan_days(meal_plan)
        num_days = max(len(days), 1)
        for rule in event_rules:
            # Event rules evaluate per-day averages
            current = values.get(rule.parameter, 0.0)
            if rule.parameter != "nutri_class":
                current = current / num_days
            status = rule.evaluate(current)

            min_green = rule.min_green
            max_green = rule.max_green
            target_mid = None
            if min_green is not None and max_green is not None:
                target_mid = round((min_green + max_green) / 2.0, 2)
            elif min_green is not None:
                target_mid = min_green
            elif max_green is not None:
                target_mid = max_green

            if rule.parameter != "nutri_class":
                if min_green is not None:
                    min_green = round(min_green / num_days, 2)
                if max_green is not None:
                    max_green = round(max_green / num_days, 2)
                if target_mid is not None:
                    target_mid = round(target_mid / num_days, 2)

            suggestions.append(
                SuggestionOut(
                    category="nutrition",
                    scope="event",
                    scope_label=f"Gesamt: {rule.name}",
                    status=status,
                    priority=3,
                    message=_format_rule_message(rule, current, suffix="/Tag" if rule.parameter != "nutri_class" else ""),
                    current_value=round(current, 2),
                    target_range=_format_range(rule),
                    tip=rule.tip_text if status != "green" else None,
                    min_green=min_green,
                    max_green=max_green,
                    target_mid=target_mid,
                )
            )

    # Day-level rules
    day_rules = Rule.objects.filter(is_active=True, scope="day")
    if day_rules.exists():
        days = _get_plan_days(meal_plan)
        for date in days:
            values = _aggregate_day_values(meal_plan, date)
            day_num = _day_number(meal_plan, date)
            for rule in day_rules:
                current = values.get(rule.parameter, 0.0)
                status = rule.evaluate(current)
                if status != "green":
                    min_green = rule.min_green
                    max_green = rule.max_green
                    target_mid = None
                    if min_green is not None and max_green is not None:
                        target_mid = round((min_green + max_green) / 2.0, 2)
                    elif min_green is not None:
                        target_mid = min_green
                    elif max_green is not None:
                        target_mid = max_green

                    suggestions.append(
                        SuggestionOut(
                            category="nutrition",
                            scope="day",
                            scope_label=f"Tag {day_num}: {rule.name}",
                            status=status,
                            priority=3,
                            message=_format_rule_message(rule, current),
                            current_value=round(current, 2),
                            target_range=_format_range(rule),
                            tip=rule.tip_text if status != "green" else None,
                            min_green=min_green,
                            max_green=max_green,
                            target_mid=target_mid,
                        )
                    )

    # Meal-level rules
    meal_rules = Rule.objects.filter(is_active=True, scope="meal")
    if meal_rules.exists():
        meals = Meal.objects.filter(meal_plan=meal_plan).order_by("start_datetime")
        for meal in meals:
            if meal.is_external:
                continue
            values = _aggregate_meal_values(meal)
            day_num = _day_number(meal_plan, meal.start_datetime.date()) if meal.start_datetime else 1
            meal_label = MEAL_TYPE_LABELS.get(meal.meal_type, meal.meal_type)
            for rule in meal_rules:
                current = values.get(rule.parameter, 0.0)
                status = rule.evaluate(current)
                if status != "green":
                    min_green = rule.min_green
                    max_green = rule.max_green
                    target_mid = None
                    if min_green is not None and max_green is not None:
                        target_mid = round((min_green + max_green) / 2.0, 2)
                    elif min_green is not None:
                        target_mid = min_green
                    elif max_green is not None:
                        target_mid = max_green

                    suggestions.append(
                        SuggestionOut(
                            category="nutrition",
                            scope="meal",
                            scope_label=f"Tag {day_num} {meal_label}: {rule.name}",
                            status=status,
                            priority=3,
                            message=_format_rule_message(rule, current),
                            current_value=round(current, 2),
                            target_range=_format_range(rule),
                            tip=rule.tip_text if status != "green" else None,
                            min_green=min_green,
                            max_green=max_green,
                            target_mid=target_mid,
                        )
                    )

    return suggestions


def _check_budget(meal_plan: "MealPlan") -> list[SuggestionOut]:
    """Check budget_per_person_per_day against actual costs using cached recipe prices."""
    if not meal_plan.budget_per_person_per_day:
        return []

    from planner.models import MealItem

    budget = float(meal_plan.budget_per_person_per_day)
    days = _get_plan_days(meal_plan)
    num_days = max(len(days), 1)
    norm_portions = meal_plan.norm_portions or 1

    # Use cached_price_total from recipes
    total_cost = 0.0
    most_expensive_recipe = None
    most_expensive_cost = 0.0
    has_price_data = False

    items = MealItem.objects.filter(
        meal__meal_plan=meal_plan, recipe__isnull=False
    ).select_related("recipe")

    for item in items:
        recipe = item.recipe
        if recipe.cached_price_total:
            has_price_data = True
            recipe_cost = float(recipe.cached_price_total) * item.factor
            total_cost += recipe_cost

            if recipe_cost > most_expensive_cost:
                most_expensive_cost = recipe_cost
                most_expensive_recipe = recipe.title

    if not has_price_data:
        return []

    cost_per_person_per_day = total_cost / norm_portions / num_days if num_days > 0 else 0
    coverage_pct = 0.0  # TODO: calculate from cached data

    # Evaluate
    if cost_per_person_per_day <= budget:
        status = "green"
    elif cost_per_person_per_day <= budget * 1.2:
        status = "yellow"
    else:
        status = "red"

    tip = None
    if status != "green" and most_expensive_recipe:
        tip = f"'{most_expensive_recipe}' ({most_expensive_cost:.2f}€) ist das teuerste Rezept"

    return [
        SuggestionOut(
            category="budget",
            scope="event",
            scope_label="Budget",
            status=status,
            priority=2,
            message=f"{cost_per_person_per_day:.2f}€/Person/Tag (Budget: {budget:.2f}€)",
            current_value=round(cost_per_person_per_day, 2),
            target_range=f"max {budget:.2f}€/Person/Tag",
            tip=tip,
            price_coverage_pct=round(coverage_pct, 1),
            min_green=None,
            max_green=round(budget, 2),
            target_mid=round(budget, 2),
        )
    ]


def _get_recipe_suggestions(recipe_type: str, limit: int = 3) -> list[RecipeSuggestionOut]:
    """Get top recipes by like_score matching a recipe_type."""
    from recipe.models import Recipe

    recipes = Recipe.objects.filter(
        recipe_type=recipe_type,
        status="approved",
    ).order_by("-like_score")[:limit]

    return [
        RecipeSuggestionOut(
            id=r.id,
            title=r.title,
            slug=r.slug,
            image_url=r.image.url if r.image else None,
            recipe_type=r.recipe_type,
        )
        for r in recipes
    ]


def _get_plan_days(meal_plan: "MealPlan") -> list[dt.date]:
    """Get all unique days in the meal plan."""
    from planner.models import Meal

    dates = (
        Meal.objects.filter(meal_plan=meal_plan, start_datetime__isnull=False)
        .values_list("start_datetime__date", flat=True)
        .distinct()
        .order_by("start_datetime__date")
    )
    return list(dates)


def _day_number(meal_plan: "MealPlan", date: dt.date) -> int:
    """Get the day number (1-indexed) relative to plan start."""
    if meal_plan.start_datetime:
        return (date - meal_plan.start_datetime.date()).days + 1
    return 1


def _format_range(rule: Rule) -> str:
    """Format the target range as human-readable string."""
    parts = []
    if rule.min_green is not None:
        parts.append(f"min {_format_rule_value(rule, rule.min_green)}")
    if rule.max_green is not None:
        parts.append(f"max {_format_rule_value(rule, rule.max_green)}")
    return ", ".join(parts) if parts else ""


def _format_rule_message(rule: Rule, value: float, suffix: str = "") -> str:
    """Format rule values consistently for suggestion cards."""
    return f"{_format_rule_value(rule, value)}{suffix}"


def _format_rule_value(rule: Rule, value: float) -> str:
    if rule.parameter == "price_total":
        return f"{value:.2f}€"
    if rule.parameter == "weight_g":
        if value >= 1000:
            return f"{value / 1000:.1f} kg"
        return f"{value:.0f} g"
    if rule.parameter == "nutri_class":
        return _format_nutri_class(value)
    if rule.unit:
        return f"{value:.0f} {rule.unit}"
    return f"{value:.0f}"


def _format_nutri_class(value: float) -> str:
    rounded = int(round(value))
    letter = {
        1: "A",
        2: "B",
        3: "C",
        4: "D",
        5: "E",
    }.get(rounded)
    if letter:
        return f"{letter} ({value:.1f})"
    return f"{value:.1f}"


# ===========================================================================
# LLM-based ingredient suggestion service for recipe improvement.
# ===========================================================================

import logging
from pydantic import BaseModel, Field
from django.core.cache import cache
from ninja.errors import HttpError
from core.services.gemini import gemini_call

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
AI_TIMEOUT_MS = 30_000
CACHE_TTL_SECONDS = 60 * 60 * 24  # 24 hours
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW_SECONDS = 60 * 60  # 1 hour


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


def _build_ingredient_list(recipe: "Recipe") -> str:
    """Build a human-readable ingredient list from RecipeItems."""
    from recipe.models import RecipeItem

    items = RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    )

    lines: list[str] = []
    for item in items:
        ingredient = item.portion.ingredient if item.portion else None
        if not ingredient:
            continue

        name = ingredient.name
        qty = item.quantity

        unit_label = ""
        if item.portion and item.portion.measuring_unit:
            unit_label = item.portion.measuring_unit.name

        lines.append(f"- {qty} {unit_label} {name}".strip())

    return "\n".join(lines) if lines else "Keine Zutaten vorhanden."


def _build_nutritional_summary(values: dict[str, float]) -> str:
    """Format nutritional values dict as a readable summary."""
    if not values or all(v == 0.0 for v in values.values()):
        return "Keine Nährwertdaten vorhanden."

    from recipe.services.nutrition_units import kj_to_kcal
    labels = {
        "energy_kj": ("Energie", "kcal"),
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
        if key == "energy_kj":
            val = kj_to_kcal(val)
        lines.append(f"- {label}: {val:.1f} {unit}")

    return "\n".join(lines)


def _check_rate_limit(user: "AbstractBaseUser") -> None:
    """Enforce max 10 requests per user per hour. Raises HttpError(429) if exceeded."""
    cache_key = f"suggestion_ratelimit:{user.id}"
    current_count = cache.get(cache_key, 0)

    if current_count >= RATE_LIMIT_MAX:
        raise HttpError(429, "Zu viele Anfragen. Bitte warte etwas.")

    # Increment; set TTL on first request in the window
    new_count = current_count + 1
    cache.set(cache_key, new_count, timeout=RATE_LIMIT_WINDOW_SECONDS)


def get_suggestions(recipe: "Recipe", objective: str, user: "AbstractBaseUser", direction: str = "reduce") -> list[dict[str, Any]]:
    """Generate LLM-based ingredient suggestions for improving a recipe.

    Args:
        recipe: The recipe to improve.
        objective: Improvement goal, e.g. "mehr Ballaststoffe", "weniger Zucker".
        user: The requesting user (for rate limiting).
        direction: "reduce" or "increase" — whether the objective should be lowered or raised.

    Returns:
        List of dicts with keys: ingredient_name, recommended_amount, unit,
        reasoning, expected_improvement. Returns empty list on error.
    """
    from typing import Any
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
    direction_text = "reduzieren" if direction == "reduce" else "erhöhen"
    prompt = (
        "Du bist ein Ernährungsexperte für Pfadfinder-Gruppenrezepte. "
        "Analysiere das folgende Rezept und schlage genau 3 Zutaten vor, "
        "die hinzugefügt oder angepasst werden könnten, um das angegebene Ziel zu erreichen.\n\n"
        f"Rezeptname: {recipe_title}\n"
        f"Rezepttyp: {recipe_type}\n\n"
        f"Aktuelle Zutaten:\n{ingredient_list}\n\n"
        f"Nährwerte (pro 100g):\n{nutritional_summary}\n\n"
        f"Ziel: {objective} {direction_text}\n\n"
        "Regeln:\n"
        f"- Das Ziel ist es, den Wert '{objective}' zu {direction_text}.\n"
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
