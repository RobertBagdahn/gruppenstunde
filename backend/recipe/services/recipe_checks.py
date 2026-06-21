"""Recipe nutrition helpers, hint matching, and cache recalculation service.

Provides aggregate nutritional value computation (`get_recipe_nutritional_values`)
used across nutrition-related services, hint matching against Rule rules,
and denormalized cache recalculation for the Recipe model.

Note: The former 4-dimension `get_recipe_checks` aggregator has been removed
(see change `recipe-detail-cleanup`). This module is now a pure nutrition helper.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from django.db.models import Q
from django.utils import timezone

if TYPE_CHECKING:
    from recipe.models import Recipe

from supply.choices import RecipeTypeChoices

from recipe.models import Rule, RecipeItem

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
        "energy_kcal",
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


def get_recipe_total_weight_g(recipe: "Recipe") -> float:
    """Return total recipe weight in grams, using cache when available."""
    if recipe.cached_weight_g is not None:
        return float(recipe.cached_weight_g)

    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")
    total_weight_g = 0.0
    for item in items:
        if not (item.portion and item.portion.ingredient):
            continue
        if item.portion.weight_g:
            total_weight_g += item.quantity * item.portion.weight_g
        elif item.portion.measuring_unit:
            total_weight_g += item.quantity * item.portion.quantity * item.portion.measuring_unit.quantity
    return total_weight_g


def get_recipe_values_with_computed(recipe: "Recipe") -> tuple[dict[str, float], float]:
    """Get recipe nutritional values (per 100g) and computed total weight (g), including nutri_class."""
    values = get_recipe_nutritional_values(recipe)

    total_weight_g = get_recipe_total_weight_g(recipe)
    values["weight_g"] = total_weight_g
    values["price_total"] = float(recipe.cached_price_total or 0.0)

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

    return values, total_weight_g


def evaluate_recipe_rules(recipe: "Recipe") -> dict:
    """Evaluate all active Rules (scope=recipe) against recipe nutritional values.

    Returns a dict with green/yellow/red counts and a list of all evaluated rules.
    """
    if recipe.recipe_type not in [RecipeTypeChoices.WARM_MEAL, RecipeTypeChoices.COLD_MEAL]:
        return {
            "green_count": 0,
            "yellow_count": 0,
            "red_count": 0,
            "items": [],
            "is_applicable": False,
            "message": "Für diesen Rezepttyp sind Rezeptregeln nicht sinnvoll. Die Regeln werden im Planer auf die Mahlzeit angewandt.",
        }

    values, total_weight_g = get_recipe_values_with_computed(recipe)

    # Each recipe represents exactly one Normportion (servings is always 1).
    # Per-100g nutrient values are converted to the Normportion total via total_weight_g / 100.
    if total_weight_g > 0:
        factor = total_weight_g / 100.0
    else:
        factor = 1.0

    rules = Rule.objects.filter(
        is_active=True,
        scope="recipe",
        sort_order__gt=0,
    )
    if not rules.exists():
        legacy_recipe_type_rules = (
            Q(name__startswith="Frühstück:")
            | Q(name__startswith="Snack:")
            | Q(name__startswith="Getränk:")
        )
        rules = Rule.objects.filter(is_active=True, scope="recipe").exclude(legacy_recipe_type_rules)
    rules = rules.order_by("sort_order", "name", "id")

    items = []
    green_count = 0
    yellow_count = 0
    red_count = 0

    nutri_letter_map = {
        1.0: "A",
        2.0: "B",
        3.0: "C",
        4.0: "D",
        5.0: "E",
    }

    seen_rules = set()
    for rule in rules:
        rule_key = (
            rule.parameter,
            rule.min_green,
            rule.min_yellow,
            rule.max_green,
            rule.max_yellow,
            rule.unit,
        )
        if rule_key in seen_rules:
            continue
        seen_rules.add(rule_key)

        actual_value = values.get(rule.parameter, 0.0)
        if rule.parameter in ["nutri_class", "weight_g", "price_total"]:
            # nutri_class is a quality class; weight_g and price_total are
            # already Normportion totals and must stay unscaled.
            value_per_serving = actual_value
        else:
            value_per_serving = actual_value * factor

        status = rule.evaluate(value_per_serving)

        if status == "green":
            green_count += 1
        elif status == "yellow":
            yellow_count += 1
        elif status == "red":
            red_count += 1

        # Special nutri_class display mapping
        display_value = None
        unit = rule.unit
        if rule.parameter == "nutri_class":
            display_value = nutri_letter_map.get(round(value_per_serving), None)
            unit = ""

        threshold_direction = None
        threshold = None
        if rule.max_green is not None or rule.max_yellow is not None:
            threshold_direction = "max"
            threshold = rule.max_green if rule.max_green is not None else rule.max_yellow
        elif rule.min_green is not None or rule.min_yellow is not None:
            threshold_direction = "min"
            threshold = rule.min_green if rule.min_green is not None else rule.min_yellow

        items.append({
            "rule_id": rule.id,
            "name": rule.name,
            "parameter": rule.parameter,
            "status": status,
            "value_per_serving": round(value_per_serving, 2),
            "display_value": display_value,
            "unit": unit,
            "threshold": threshold,
            "threshold_direction": threshold_direction,
            "tip_text": rule.tip_text if status != "green" else ""
        })

    return {
        "green_count": green_count,
        "yellow_count": yellow_count,
        "red_count": red_count,
        "items": items,
        "is_applicable": True,
        "message": "",
    }


def match_recipe_hints(
    recipe: "Recipe",
    recipe_objective: str = "",
) -> list[dict]:
    """Match Rule rules (scope=recipe) against recipe nutritional values.

    Supports all macronutrient and micronutrient parameters, plus
    ``weight_g`` (total recipe weight) and ``nutri_class``.
    Returns list of {hint, actual_value, message, improvement_text, status}
    for each rule that evaluates to yellow or red.
    """
    values, total_weight_g = get_recipe_values_with_computed(recipe)

    # Each recipe represents exactly one Normportion (servings is always 1).
    if total_weight_g > 0:
        factor = total_weight_g / 100.0
    else:
        factor = 1.0

    rules = Rule.objects.filter(is_active=True, scope="recipe")

    results = []
    for rule in rules:
        actual = values.get(rule.parameter, 0.0)
        if rule.parameter in ["nutri_class", "weight_g", "price_total"]:
            eval_value = actual
        else:
            eval_value = actual * factor

        status = rule.evaluate(eval_value)

        if status != "green":
            results.append(
                {
                    "hint": rule,
                    "actual_value": round(eval_value, 2),
                    "message": rule.tip_text or rule.name,
                    "improvement_text": rule.improvement_text or "",
                    "status": status,
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
    recipe.cached_energy_kcal = values.get("energy_kcal")
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
    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient", "portion__measuring_unit")
    total_price = Decimal("0.00")
    total_weight_g = 0.0
    has_prices = False
    for item in items:
        if not (item.portion and item.portion.ingredient):
            continue
        ingredient = item.portion.ingredient
        weight_g = 0.0
        # Handle weight-based portions
        if item.portion.weight_g:
            weight_g = item.quantity * item.portion.weight_g
            total_weight_g += float(weight_g)
        # Handle measuring_unit-based portions
        elif item.portion.measuring_unit:
            weight_g = item.quantity * item.portion.quantity * item.portion.measuring_unit.quantity
            total_weight_g += float(weight_g)
        
        if ingredient.price_per_kg and weight_g:
            has_prices = True
            price = ingredient.price_per_kg * Decimal(str(weight_g)) / Decimal("1000")
            total_price += price

    energy_per_100g = values.get("energy_kcal")
    recipe.cached_energy_total_kcal = float(energy_per_100g) * (total_weight_g / 100.0) if energy_per_100g and total_weight_g else None
    recipe.cached_weight_g = total_weight_g
    recipe.cached_price_total = total_price if has_prices else None
    recipe.cached_at = timezone.now()

    update_fields = [
        "cached_energy_kcal",
        "cached_energy_total_kcal",
        "cached_weight_g",
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


def sync_recipe_allergen_tags(recipe: "Recipe") -> int:
    """Sync the recipe's nutritional_tags (dangerous/allergen only) with ingredients."""
    from supply.models.reference import NutritionalTag
    from recipe.models import RecipeItem

    # Get non-dangerous tags currently set on the recipe to preserve them
    non_dangerous_tags = list(recipe.nutritional_tags.filter(is_dangerous=False))

    # Find the distinct ingredient IDs associated with the recipe
    ingredient_ids = list(
        RecipeItem.objects.filter(recipe=recipe)
        .values_list("portion__ingredient_id", flat=True)
        .distinct()
    )

    if ingredient_ids:
        dangerous_tags = list(
            NutritionalTag.objects.filter(
                is_dangerous=True,
                ingredients__id__in=ingredient_ids
            ).distinct()
        )
    else:
        dangerous_tags = []

    # Combine non-dangerous and dangerous tags
    all_tags = non_dangerous_tags + dangerous_tags
    recipe.nutritional_tags.set(all_tags)

    return len(dangerous_tags)
