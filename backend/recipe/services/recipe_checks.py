"""Recipe nutrition helpers, hint matching, and cache recalculation service.

Provides aggregate nutritional value computation (`get_recipe_nutritional_values`)
used across nutrition-related services, hint matching against RecipeHint rules,
and denormalized cache recalculation for the Recipe model.

Note: The former 4-dimension `get_recipe_checks` aggregator has been removed
(see change `recipe-detail-cleanup`). This module is now a pure nutrition helper.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from recipe.models import Recipe

from recipe.models import RecipeHint, RecipeItem

# Micronutrient fields tracked on Ingredient — used for aggregation
MICRONUTRIENT_FIELDS = [
    "vitamin_c_mg",
]

# Cached micronutrient fields on Recipe (subset of most important ones)
CACHED_MICRONUTRIENT_FIELDS = [
    "vitamin_c_mg",
]


def get_recipe_nutritional_values(recipe: "Recipe") -> dict[str, float]:
    """Aggregate nutritional values for a recipe (per 100g of total recipe).

    Sums all RecipeItem contributions weighted by quantity and portion weight,
    then normalizes to per-100g values.  Includes macronutrients **and**
    micronutrients (vitamins / minerals).
    """
    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")

    total_weight_g = 0.0

    # Macronutrient totals
    macro_fields = [
        "energy_kj",
        "protein_g",
        "fat_g",
        "fat_sat_g",
        "carbohydrate_g",
        "sugar_g",
        "fibre_g",
        "salt_g",
        "sodium_mg",
        "fructose_g",
        "lactose_g",
    ]

    totals: dict[str, float] = {f: 0.0 for f in macro_fields}
    totals["fruit_factor"] = 0.0

    # Micronutrient totals (vitamins + minerals)
    for field in MICRONUTRIENT_FIELDS:
        totals[field] = 0.0

    for item in items:
        ingredient = item.portion.ingredient if item.portion else None
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

    Supports all macronutrient and micronutrient parameters, plus
    ``weight_g`` (total recipe weight) and ``nutri_class``.
    Returns list of {hint, actual_value, message, improvement_text}
    for each matched rule.
    """
    values = get_recipe_nutritional_values(recipe)

    # Add special computed parameters that are not per-100g nutrient fields
    # Total weight needs to be calculated separately
    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")
    total_weight_g = 0.0
    for item in items:
        if item.portion and item.portion.weight_g:
            total_weight_g += item.quantity * item.portion.weight_g
        elif item.portion and item.portion.measuring_unit:
            total_weight_g += item.quantity * item.portion.quantity * item.portion.measuring_unit.quantity
    values["weight_g"] = total_weight_g

    # Add nutri_class from cached value or compute it
    if recipe.cached_nutri_class:
        values["nutri_class"] = float(recipe.cached_nutri_class)
    else:
        from supply.services.nutri_service import calculate_nutri_score as _calc_ns

        class _AggIngredient:
            pass

        agg = _AggIngredient()
        for k, v in values.items():
            setattr(agg, k, v)
        agg.physical_viscosity = "solid"
        _ns_total, ns_class = _calc_ns(agg)
        values["nutri_class"] = float(ns_class)

    hints = RecipeHint.objects.all()
    if recipe_objective:
        hints = hints.filter(recipe_objective=recipe_objective)
    if recipe.recipe_type:
        hints = hints.filter(models_Q_recipe_type_blank_or_match(recipe.recipe_type))

    results = []
    for hint in hints:
        actual = values.get(hint.parameter, 0.0)
        matched = False

        if hint.min_max == "min" and actual < hint.value:
            matched = True
        elif hint.min_max == "max" and actual > hint.value:
            matched = True

        if matched:
            results.append(
                {
                    "hint": hint,
                    "actual_value": round(actual, 2),
                    "message": hint.hint or hint.name,
                    "improvement_text": hint.improvement_text or "",
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


def recalculate_recipe_cache(recipe: "Recipe") -> None:
    """Recalculate and store denormalized nutritional values on Recipe.

    Computes aggregated per-100g nutritional values (macro + micro),
    nutri-score class, and total price, then saves them to the cache fields.
    """
    values = get_recipe_nutritional_values(recipe)

    # Macronutrient cache fields
    recipe.cached_energy_kj = values.get("energy_kj")
    recipe.cached_protein_g = values.get("protein_g")
    recipe.cached_fat_g = values.get("fat_g")
    recipe.cached_carbohydrate_g = values.get("carbohydrate_g")
    recipe.cached_sugar_g = values.get("sugar_g")
    recipe.cached_fibre_g = values.get("fibre_g")
    recipe.cached_salt_g = values.get("salt_g")

    # Micronutrient cache fields (top-10 vitamins/minerals)
    for field in CACHED_MICRONUTRIENT_FIELDS:
        cached_field = f"cached_{field}"
        setattr(recipe, cached_field, values.get(field))

    # Calculate nutri-score class
    from supply.services.nutri_service import calculate_nutri_score as _calc_ns

    class _AggIngredient:
        pass

    agg = _AggIngredient()
    for k, v in values.items():
        setattr(agg, k, v)
    agg.physical_viscosity = "solid"

    _ns_total, ns_class = _calc_ns(agg)
    recipe.cached_nutri_class = ns_class

    # Calculate total price
    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")
    total_price = Decimal("0.00")
    has_prices = False
    for item in items:
        ingredient = item.portion.ingredient if item.portion else None
        if ingredient and ingredient.price_per_kg:
            has_prices = True
            weight_g = 0.0
            if item.portion and item.portion.weight_g:
                weight_g = item.quantity * item.portion.weight_g
            price = ingredient.price_per_kg * Decimal(str(weight_g)) / Decimal("1000")
            total_price += price

    recipe.cached_price_total = total_price if has_prices else None
    recipe.cached_at = timezone.now()

    update_fields = [
        "cached_energy_kj",
        "cached_protein_g",
        "cached_fat_g",
        "cached_carbohydrate_g",
        "cached_sugar_g",
        "cached_fibre_g",
        "cached_salt_g",
        "cached_nutri_class",
        "cached_price_total",
        "cached_at",
    ]
    # Add micronutrient cache fields
    for field in CACHED_MICRONUTRIENT_FIELDS:
        update_fields.append(f"cached_{field}")

    recipe.save(update_fields=update_fields)
