"""Cockpit service — evaluate HealthRules at MealEvent, day, and meal scopes.

Aggregates nutritional values and prices across meals/recipes,
then evaluates them against active HealthRule thresholds.
"""

from __future__ import annotations

import datetime as dt
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import Meal, MealEvent

from recipe.models import HealthRule
from recipe.services.recipe_checks import get_recipe_nutritional_values


def _aggregate_meal_values(meal: "Meal") -> dict[str, float]:
    """Aggregate nutritional values and price for a single Meal."""
    from planner.models import MealItem

    totals: dict[str, float] = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "price_total": 0.0,
    }

    items = MealItem.objects.filter(meal=meal).select_related("recipe")
    for item in items:
        recipe = item.recipe
        # Use cached values if available, otherwise calculate
        if recipe.cached_at:
            totals["energy_kj"] += (recipe.cached_energy_kj or 0.0) * item.factor
            totals["protein_g"] += (recipe.cached_protein_g or 0.0) * item.factor
            totals["fat_g"] += (recipe.cached_fat_g or 0.0) * item.factor
            totals["carbohydrate_g"] += (recipe.cached_carbohydrate_g or 0.0) * item.factor
            totals["sugar_g"] += (recipe.cached_sugar_g or 0.0) * item.factor
            totals["fibre_g"] += (recipe.cached_fibre_g or 0.0) * item.factor
            totals["salt_g"] += (recipe.cached_salt_g or 0.0) * item.factor
            totals["price_total"] += float(recipe.cached_price_total or 0) * item.factor
        else:
            values = get_recipe_nutritional_values(recipe)
            for key in ["energy_kj", "protein_g", "fat_g", "carbohydrate_g", "sugar_g", "fibre_g", "salt_g"]:
                totals[key] += values.get(key, 0.0) * item.factor

    # Add nutri_class as average across recipes (weighted by factor)
    nutri_classes = []
    for item in items:
        if item.recipe.cached_nutri_class:
            nutri_classes.append(item.recipe.cached_nutri_class)
    totals["nutri_class"] = sum(nutri_classes) / len(nutri_classes) if nutri_classes else 0.0

    return totals


def _aggregate_day_values(meal_event: "MealEvent", date: dt.date) -> dict[str, float]:
    """Aggregate nutritional values for all meals on a given day."""
    from planner.models import Meal

    meals = Meal.objects.filter(
        meal_event=meal_event,
        start_datetime__date=date,
    )

    totals: dict[str, float] = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "price_total": 0.0,
        "nutri_class": 0.0,
    }

    nutri_classes = []
    for meal in meals:
        meal_values = _aggregate_meal_values(meal)
        for key in totals:
            if key == "nutri_class":
                if meal_values.get("nutri_class", 0) > 0:
                    nutri_classes.append(meal_values["nutri_class"])
            else:
                totals[key] += meal_values.get(key, 0.0)

    totals["nutri_class"] = sum(nutri_classes) / len(nutri_classes) if nutri_classes else 0.0
    return totals


def _aggregate_meal_event_values(meal_event: "MealEvent") -> dict[str, float]:
    """Aggregate nutritional values for the entire MealEvent (all days)."""
    from planner.models import Meal

    meals = Meal.objects.filter(meal_event=meal_event)

    totals: dict[str, float] = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "price_total": 0.0,
        "nutri_class": 0.0,
    }

    nutri_classes = []
    for meal in meals:
        meal_values = _aggregate_meal_values(meal)
        for key in totals:
            if key == "nutri_class":
                if meal_values.get("nutri_class", 0) > 0:
                    nutri_classes.append(meal_values["nutri_class"])
            else:
                totals[key] += meal_values.get(key, 0.0)

    totals["nutri_class"] = sum(nutri_classes) / len(nutri_classes) if nutri_classes else 0.0
    return totals


def _evaluate_rules(scope: str, values: dict[str, float]) -> list[dict]:
    """Evaluate all active HealthRules for a given scope against values."""
    rules = HealthRule.objects.filter(is_active=True, scope=scope).order_by("sort_order")

    evaluations = []
    for rule in rules:
        current_value = values.get(rule.parameter, 0.0)
        status = rule.evaluate(current_value)
        evaluations.append(
            {
                "rule_id": rule.id,
                "rule_name": rule.name,
                "parameter": rule.parameter,
                "current_value": round(current_value, 2),
                "status": status,
                "tip_text": rule.tip_text if status != "green" else "",
                "unit": rule.unit,
            }
        )

    return evaluations


def _build_dashboard(evaluations: list[dict]) -> dict:
    """Build a dashboard response with summary counts."""
    green = sum(1 for e in evaluations if e["status"] == "green")
    yellow = sum(1 for e in evaluations if e["status"] == "yellow")
    red = sum(1 for e in evaluations if e["status"] == "red")

    if red > 0:
        summary = "red"
    elif yellow > 0:
        summary = "yellow"
    else:
        summary = "green"

    return {
        "evaluations": evaluations,
        "summary_status": summary,
        "green_count": green,
        "yellow_count": yellow,
        "red_count": red,
    }


def evaluate_meal_event_cockpit(meal_event: "MealEvent") -> dict:
    """Evaluate all MealEvent-scope HealthRules."""
    values = _aggregate_meal_event_values(meal_event)
    evaluations = _evaluate_rules("meal_event", values)
    return _build_dashboard(evaluations)


def evaluate_day_cockpit(meal_event: "MealEvent", date: dt.date) -> dict:
    """Evaluate all day-scope HealthRules for a specific date."""
    values = _aggregate_day_values(meal_event, date)
    evaluations = _evaluate_rules("day", values)
    return _build_dashboard(evaluations)


def evaluate_meal_cockpit(meal: "Meal") -> dict:
    """Evaluate all meal-scope HealthRules for a specific meal."""
    values = _aggregate_meal_values(meal)
    evaluations = _evaluate_rules("meal", values)
    return _build_dashboard(evaluations)
