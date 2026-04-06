"""Recipe checks and hint matching service.

Evaluates recipes against RecipeHint rules and provides
4-dimension ratings (fulfillment, cost, health, taste).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from recipe.models import Recipe

from recipe.models import RecipeHint, RecipeItem


def get_recipe_nutritional_values(recipe: "Recipe") -> dict[str, float]:
    """Aggregate nutritional values for a recipe (per 100g of total recipe).

    Sums all RecipeItem contributions weighted by quantity and portion weight,
    then normalizes to per-100g values.
    """
    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient", "ingredient")

    total_weight_g = 0.0
    totals: dict[str, float] = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "sodium_mg": 0.0,
        "fructose_g": 0.0,
        "lactose_g": 0.0,
        "fruit_factor": 0.0,
    }

    for item in items:
        ingredient = item.ingredient or (item.portion.ingredient if item.portion else None)
        if not ingredient:
            continue

        weight_g = 0.0
        if item.portion and item.portion.weight_g:
            weight_g = item.quantity * item.portion.weight_g
        elif item.portion and item.portion.measuring_unit:
            weight_g = item.quantity * item.portion.quantity * item.portion.measuring_unit.quantity
        else:
            continue

        total_weight_g += weight_g
        factor = weight_g / 100.0  # nutritional values are per 100g

        for field in totals:
            val = getattr(ingredient, field, None)
            if val is not None:
                if field == "fruit_factor":
                    # Weighted average, not sum
                    totals[field] += val * weight_g
                else:
                    totals[field] += val * factor

    # Normalize to per 100g
    if total_weight_g > 0:
        result = {}
        for field, total in totals.items():
            if field == "fruit_factor":
                result[field] = total / total_weight_g
            else:
                result[field] = total * 100.0 / total_weight_g
        return result

    return totals


def match_recipe_hints(
    recipe: "Recipe",
    recipe_objective: str = "",
) -> list[dict]:
    """Match RecipeHint rules against recipe nutritional values.

    Returns list of {hint, actual_value, message} for each matched rule.
    """
    values = get_recipe_nutritional_values(recipe)

    hints = RecipeHint.objects.all()
    if recipe_objective:
        hints = hints.filter(recipe_objective=recipe_objective)
    if recipe.recipe_type:
        hints = hints.filter(models_Q_recipe_type_blank_or_match(recipe.recipe_type))

    results = []
    for hint in hints:
        actual = values.get(hint.parameter, 0.0)
        matched = False

        if hint.min_max == "min" and hint.min_value is not None:
            if actual < hint.min_value:
                matched = True
        elif hint.min_max == "max" and hint.max_value is not None:
            if actual > hint.max_value:
                matched = True
        elif hint.min_max == "range":
            if hint.min_value is not None and actual < hint.min_value:
                matched = True
            if hint.max_value is not None and actual > hint.max_value:
                matched = True

        if matched:
            results.append(
                {
                    "hint": hint,
                    "actual_value": round(actual, 2),
                    "message": hint.description or hint.name,
                }
            )

    return results


def _filter_hints_by_recipe_type(hints, recipe_type: str):
    """Filter hints that apply to a recipe type (empty = applies to all)."""
    from django.db.models import Q

    return hints.filter(Q(recipe_type="") | Q(recipe_type=recipe_type))


def models_Q_recipe_type_blank_or_match(recipe_type: str):
    """Return Q filter for recipe_type blank or matching."""
    from django.db.models import Q

    return Q(recipe_type="") | Q(recipe_type=recipe_type)


def get_recipe_checks(recipe: "Recipe") -> list[dict]:
    """Get 4-dimension recipe checks.

    Returns list of {label, value, color, score} for:
    1. Fulfillment (energy vs target)
    2. Cost (price estimate)
    3. Health (nutri-score based)
    4. Taste (placeholder)
    """
    values = get_recipe_nutritional_values(recipe)
    checks = []

    # 1. Fulfillment (energy)
    energy = values.get("energy_kj", 0)
    # Target: ~2500 kJ per meal (roughly 1/3 of 7500 kJ daily)
    target_kj = 2500
    if energy > 0:
        ratio = energy / target_kj
        if ratio < 0.7:
            checks.append({"label": "Sättigung", "value": "Gering", "color": "orange", "score": ratio})
        elif ratio < 1.3:
            checks.append({"label": "Sättigung", "value": "Gut", "color": "green", "score": ratio})
        else:
            checks.append({"label": "Sättigung", "value": "Sehr hoch", "color": "red", "score": ratio})
    else:
        checks.append({"label": "Sättigung", "value": "Keine Daten", "color": "gray", "score": 0})

    # 2. Cost
    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient", "ingredient")
    total_price = 0.0
    has_prices = False
    for item in items:
        ingredient = item.ingredient or (item.portion.ingredient if item.portion else None)
        if ingredient and ingredient.price_per_kg:
            has_prices = True
            weight_g = 0.0
            if item.portion and item.portion.weight_g:
                weight_g = item.quantity * item.portion.weight_g
            price = float(ingredient.price_per_kg) * weight_g / 1000.0
            total_price += price

    if has_prices:
        if total_price < 3.0:
            checks.append({"label": "Preis", "value": f"{total_price:.2f} EUR", "color": "green", "score": total_price})
        elif total_price < 8.0:
            checks.append(
                {"label": "Preis", "value": f"{total_price:.2f} EUR", "color": "orange", "score": total_price}
            )
        else:
            checks.append({"label": "Preis", "value": f"{total_price:.2f} EUR", "color": "red", "score": total_price})
    else:
        checks.append({"label": "Preis", "value": "Keine Preisdaten", "color": "gray", "score": 0})

    # 3. Health (nutri-score based)
    from idea.services.nutri_service import calculate_nutri_score as _calc_ns

    # Calculate aggregate nutri-score for recipe
    # Create a mock object with aggregate values
    class _AggIngredient:
        pass

    agg = _AggIngredient()
    for k, v in values.items():
        setattr(agg, k, v)
    agg.physical_viscosity = "solid"

    ns_total, ns_class = _calc_ns(agg)
    labels = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}
    colors = {1: "green", 2: "green", 3: "yellow", 4: "orange", 5: "red"}
    checks.append(
        {
            "label": "Gesundheit",
            "value": f"Nutri-Score {labels.get(ns_class, '?')}",
            "color": colors.get(ns_class, "gray"),
            "score": ns_class,
        }
    )

    # 4. Taste (placeholder)
    checks.append({"label": "Geschmack", "value": "Keine Bewertung", "color": "gray", "score": 0})

    return checks
