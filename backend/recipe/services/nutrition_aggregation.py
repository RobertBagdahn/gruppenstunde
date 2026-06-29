"""Cockpit service — evaluate Rules at MealPlan, day, and meal scopes.

Aggregates nutritional values and prices across meals/recipes,
then evaluates them against active Rule thresholds.
"""

from __future__ import annotations

import datetime as dt
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import Meal, MealPlan

from recipe.models import Rule
from recipe.services.recipe_checks import (
    CACHED_MICRONUTRIENT_FIELDS,
    get_recipe_nutritional_values,
    get_recipe_total_weight_g,
)
from supply.data.dge_reference import NORM_PERSON_DAILY_KCAL


def _aggregate_meal_values(meal: Meal) -> dict[str, float]:
    """Aggregate nutritional values and price for a single Meal."""
    from planner.models import MealItem

    totals: dict[str, float] = {
        "energy_kcal": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "sodium_mg": 0.0,
        "price_total": 0.0,
        "weight_g": 0.0,
    }
    for field in CACHED_MICRONUTRIENT_FIELDS:
        totals[field] = 0.0

    if meal.is_external:
        if meal.external_energy_kcal is not None:
            totals["energy_kcal"] = meal.external_energy_kcal
        else:
            totals["energy_kcal"] = NORM_PERSON_DAILY_KCAL * meal.day_part_factor
        return totals

    items = MealItem.objects.filter(meal=meal).select_related("recipe", "ingredient")
    for item in items:
        recipe = item.recipe
        ingredient = item.ingredient

        if recipe:
            # Handle recipe items
            if recipe.cached_at:
                total_weight_g = get_recipe_total_weight_g(recipe)
                nutrient_scale = (total_weight_g / 100.0) if total_weight_g else 1.0

                totals["energy_kcal"] += (recipe.cached_energy_kcal or 0.0) * nutrient_scale * item.factor
                totals["protein_g"] += (recipe.cached_protein_g or 0.0) * nutrient_scale * item.factor
                totals["fat_g"] += (recipe.cached_fat_g or 0.0) * nutrient_scale * item.factor
                totals["carbohydrate_g"] += (recipe.cached_carbohydrate_g or 0.0) * nutrient_scale * item.factor
                totals["sugar_g"] += (recipe.cached_sugar_g or 0.0) * nutrient_scale * item.factor
                totals["fibre_g"] += (recipe.cached_fibre_g or 0.0) * nutrient_scale * item.factor
                totals["salt_g"] += (recipe.cached_salt_g or 0.0) * nutrient_scale * item.factor
                fresh_values = get_recipe_nutritional_values(recipe)
                totals["fat_sat_g"] += fresh_values.get("fat_sat_g", 0.0) * nutrient_scale * item.factor
                totals["sodium_mg"] += fresh_values.get("sodium_mg", 0.0) * nutrient_scale * item.factor
                totals["price_total"] += float(recipe.cached_price_total or 0) * item.factor
                totals["weight_g"] += total_weight_g * item.factor
                for field in CACHED_MICRONUTRIENT_FIELDS:
                    cached_field = f"cached_{field}"
                    totals[field] += (getattr(recipe, cached_field, None) or 0.0) * nutrient_scale * item.factor
            else:
                from recipe.services.recipe_checks import get_recipe_values_with_computed as _get_computed

                values, total_weight_g = _get_computed(recipe)

                nutrient_scale = (total_weight_g / 100.0) if total_weight_g else 1.0

                for key in [
                    "energy_kcal",
                    "protein_g",
                    "fat_g",
                    "fat_sat_g",
                    "carbohydrate_g",
                    "sugar_g",
                    "fibre_g",
                    "salt_g",
                    "sodium_mg",
                ]:
                    totals[key] += values.get(key, 0.0) * nutrient_scale * item.factor
                totals["price_total"] += float(recipe.cached_price_total or 0) * item.factor
                totals["weight_g"] += total_weight_g * item.factor
                for field in CACHED_MICRONUTRIENT_FIELDS:
                    totals[field] += values.get(field, 0.0) * nutrient_scale * item.factor
        elif ingredient:
            # Handle ingredient items
            weight_g = 0.0
            if item.quantity and item.measuring_unit:
                name_lower = item.measuring_unit.name.lower()
                if name_lower == "g":
                    weight_g = float(item.quantity)
                elif name_lower == "ml":
                    weight_g = float(item.quantity) * (ingredient.density or 1.0)
                else:
                    portion = ingredient.portions.filter(measuring_unit=item.measuring_unit).first()
                    if portion and portion.weight_g:
                        weight_g = portion.weight_g * float(item.quantity)

            if weight_g > 0:
                nutrient_scale = weight_g / 100.0

                totals["energy_kcal"] += (ingredient.energy_kcal or 0.0) * nutrient_scale * item.factor
                totals["protein_g"] += (ingredient.protein_g or 0.0) * nutrient_scale * item.factor
                totals["fat_g"] += (ingredient.fat_g or 0.0) * nutrient_scale * item.factor
                totals["carbohydrate_g"] += (ingredient.carbohydrate_g or 0.0) * nutrient_scale * item.factor
                totals["sugar_g"] += (ingredient.sugar_g or 0.0) * nutrient_scale * item.factor
                totals["fibre_g"] += (ingredient.fibre_g or 0.0) * nutrient_scale * item.factor
                totals["salt_g"] += (ingredient.salt_g or 0.0) * nutrient_scale * item.factor
                totals["fat_sat_g"] += (ingredient.fat_sat_g or 0.0) * nutrient_scale * item.factor
                totals["sodium_mg"] += (ingredient.sodium_mg or 0.0) * nutrient_scale * item.factor
                totals["weight_g"] += weight_g * item.factor

                if ingredient.price_per_kg:
                    totals["price_total"] += (float(ingredient.price_per_kg) / 1000.0) * weight_g * item.factor

                for field in CACHED_MICRONUTRIENT_FIELDS:
                    field_val = getattr(ingredient, field, None) or 0.0
                    totals[field] += field_val * nutrient_scale * item.factor

    nutri_classes = []
    for item in items:
        if item.recipe and item.recipe.cached_nutri_class:
            nutri_classes.append(item.recipe.cached_nutri_class)
    totals["nutri_class"] = sum(nutri_classes) / len(nutri_classes) if nutri_classes else 0.0

    return totals


def _aggregate_day_values(meal_plan: MealPlan, date: dt.date) -> dict[str, float]:
    """Aggregate nutritional values for all meals on a given day."""
    from planner.models import Meal

    meals = Meal.objects.filter(
        meal_plan=meal_plan,
        start_datetime__date=date,
    )

    totals: dict[str, float] = {
        "energy_kcal": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "sodium_mg": 0.0,
        "price_total": 0.0,
        "weight_g": 0.0,
        "nutri_class": 0.0,
    }
    for field in CACHED_MICRONUTRIENT_FIELDS:
        totals[field] = 0.0

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


def _aggregate_meal_plan_values(meal_plan: MealPlan) -> dict[str, float]:
    """Aggregate nutritional values for the entire MealPlan (all days)."""
    from planner.models import Meal

    meals = Meal.objects.filter(meal_plan=meal_plan)

    totals: dict[str, float] = {
        "energy_kcal": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "sodium_mg": 0.0,
        "price_total": 0.0,
        "weight_g": 0.0,
        "nutri_class": 0.0,
    }
    for field in CACHED_MICRONUTRIENT_FIELDS:
        totals[field] = 0.0

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
    """Evaluate all active Rules for a given scope against values."""
    rules = Rule.objects.filter(is_active=True, scope=scope).order_by("sort_order")

    evaluations = []
    for rule in rules:
        current_value = values.get(rule.parameter, 0.0)
        status = rule.evaluate(current_value)
        min_green = rule.min_green
        max_green = rule.max_green
        target_mid = None
        if min_green is not None and max_green is not None:
            target_mid = round((min_green + max_green) / 2.0, 2)
        elif min_green is not None:
            target_mid = min_green
        elif max_green is not None:
            target_mid = max_green

        evaluations.append(
            {
                "rule_id": rule.id,
                "rule_name": rule.name,
                "parameter": rule.parameter,
                "current_value": round(current_value, 2),
                "status": status,
                "tip_text": rule.tip_text if status != "green" else "",
                "unit": rule.unit,
                "min_green": min_green,
                "max_green": max_green,
                "target_mid": target_mid,
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


def evaluate_meal_plan_cockpit(meal_plan: MealPlan) -> dict:
    """Evaluate all MealPlan-scope Rules."""
    values = _aggregate_meal_plan_values(meal_plan)
    evaluations = _evaluate_rules("meal_event", values)
    return _build_dashboard(evaluations)


def evaluate_day_cockpit(meal_plan: MealPlan, date: dt.date) -> dict:
    """Evaluate all day-scope Rules for a specific date."""
    values = _aggregate_day_values(meal_plan, date)
    evaluations = _evaluate_rules("day", values)
    return _build_dashboard(evaluations)


def evaluate_meal_cockpit(meal: Meal) -> dict:
    """Evaluate all meal-scope Rules for a specific meal."""
    values = _aggregate_meal_values(meal)
    evaluations = _evaluate_rules("meal", values)
    if meal.is_external:
        for ev in evaluations:
            ev["status"] = "green"
            ev["min_green"] = ev["current_value"]
            ev["max_green"] = ev["current_value"]
            ev["target_mid"] = ev["current_value"]
            ev["tip_text"] = ""
    return _build_dashboard(evaluations)
