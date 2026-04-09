"""Nutrition-related endpoints (NutriScore, Breakdown, Checks, Hints)."""

from django.shortcuts import get_object_or_404
from ninja import Router

from recipe.models import Recipe, RecipeItem
from recipe.schemas import (
    NutriScoreDetailOut,
    RecipeCheckOut,
    RecipeHintMatchOut,
    RecipeNutritionBreakdownOut,
)

router = Router()


# ==========================================================================
# Recipe Analysis (Nutri-Score, Hints, Checks)
# ==========================================================================


@router.get("/{recipe_id}/recipe-checks/", response=list[RecipeCheckOut])
def get_recipe_checks(request, recipe_id: int):
    """Get 4-dimension recipe checks."""
    from recipe.services.recipe_checks import get_recipe_checks as _get_checks

    recipe = get_object_or_404(Recipe, id=recipe_id)
    return _get_checks(recipe)


@router.get("/{recipe_id}/recipe-hints/", response=list[RecipeHintMatchOut])
def get_recipe_hints(request, recipe_id: int, recipe_objective: str = ""):
    """Get recipe improvement hints."""
    from recipe.services.recipe_checks import match_recipe_hints

    recipe = get_object_or_404(Recipe, id=recipe_id)
    matches = match_recipe_hints(recipe, recipe_objective)

    return [
        {
            "hint": {
                "id": m["hint"].id,
                "name": m["hint"].name,
                "description": m["hint"].description,
                "parameter": m["hint"].parameter,
                "min_value": m["hint"].min_value,
                "max_value": m["hint"].max_value,
                "min_max": m["hint"].min_max,
                "hint_level": m["hint"].hint_level,
                "recipe_type": m["hint"].recipe_type,
                "recipe_objective": m["hint"].recipe_objective,
            },
            "actual_value": m["actual_value"],
            "message": m["message"],
        }
        for m in matches
    ]


@router.get("/{recipe_id}/nutri-score/", response=NutriScoreDetailOut)
def get_recipe_nutri_score(request, recipe_id: int):
    """Get detailed Nutri-Score for a recipe."""
    from recipe.services.recipe_checks import get_recipe_nutritional_values
    from supply.services.nutri_service import get_nutri_score_details

    recipe = get_object_or_404(Recipe, id=recipe_id)
    values = get_recipe_nutritional_values(recipe)

    class _AggIngredient:
        pass

    agg = _AggIngredient()
    for k, v in values.items():
        setattr(agg, k, v)
    agg.physical_viscosity = "solid"

    return get_nutri_score_details(agg)


# ==========================================================================
# Nutritional Breakdown (per ingredient)
# ==========================================================================


@router.get("/{recipe_id}/nutrition-breakdown/", response=RecipeNutritionBreakdownOut)
def get_recipe_nutrition_breakdown(request, recipe_id: int):
    """Get detailed nutritional breakdown per ingredient for a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    items = RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion", "portion__ingredient", "ingredient", "measuring_unit"
    )

    result_items = []
    total_weight_g = 0.0
    total_price = 0.0
    has_prices = False
    totals = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
    }

    # First pass: calculate weights
    item_data = []
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

        # Price
        item_price = None
        if ingredient.price_per_kg:
            has_prices = True
            item_price = float(ingredient.price_per_kg) * weight_g / 1000.0
            total_price += item_price

        total_weight_g += weight_g
        factor = weight_g / 100.0

        item_nutrition = {}
        for field in totals:
            val = getattr(ingredient, field, None) or 0.0
            contribution = val * factor
            item_nutrition[field] = contribution
            totals[field] += contribution

        energy_kcal = item_nutrition["energy_kj"] / 4.184

        item_data.append(
            {
                "recipe_item_id": item.id,
                "ingredient_id": ingredient.id,
                "ingredient_name": ingredient.name,
                "quantity": item.quantity,
                "portion_name": str(item.portion)
                if item.portion
                else (item.measuring_unit.name if item.measuring_unit else "Stück"),
                "weight_g": round(weight_g, 1),
                "price_eur": round(item_price, 2) if item_price is not None else None,
                "energy_kj": round(item_nutrition["energy_kj"], 1),
                "energy_kcal": round(energy_kcal, 1),
                "protein_g": round(item_nutrition["protein_g"], 1),
                "fat_g": round(item_nutrition["fat_g"], 1),
                "fat_sat_g": round(item_nutrition["fat_sat_g"], 1),
                "carbohydrate_g": round(item_nutrition["carbohydrate_g"], 1),
                "sugar_g": round(item_nutrition["sugar_g"], 1),
                "fibre_g": round(item_nutrition["fibre_g"], 1),
                "salt_g": round(item_nutrition["salt_g"], 1),
                "weight_pct": 0.0,
            }
        )

    # Second pass: calculate weight percentages
    for item in item_data:
        if total_weight_g > 0:
            item["weight_pct"] = round(item["weight_g"] / total_weight_g * 100, 1)
        result_items.append(item)

    total_energy_kcal = totals["energy_kj"] / 4.184
    servings = recipe.servings or 1

    return {
        "total_weight_g": round(total_weight_g, 1),
        "total_price_eur": round(total_price, 2) if has_prices else None,
        "total_energy_kj": round(totals["energy_kj"], 1),
        "total_energy_kcal": round(total_energy_kcal, 1),
        "total_protein_g": round(totals["protein_g"], 1),
        "total_fat_g": round(totals["fat_g"], 1),
        "total_fat_sat_g": round(totals["fat_sat_g"], 1),
        "total_carbohydrate_g": round(totals["carbohydrate_g"], 1),
        "total_sugar_g": round(totals["sugar_g"], 1),
        "total_fibre_g": round(totals["fibre_g"], 1),
        "total_salt_g": round(totals["salt_g"], 1),
        "per_serving_energy_kcal": round(total_energy_kcal / servings, 1),
        "per_serving_protein_g": round(totals["protein_g"] / servings, 1),
        "per_serving_fat_g": round(totals["fat_g"] / servings, 1),
        "per_serving_carbohydrate_g": round(totals["carbohydrate_g"] / servings, 1),
        "items": result_items,
    }
