"""Nutrition-related endpoints (NutriScore, Breakdown, Hints, Improvements, Suggestions)."""

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem
from recipe.schemas import (
    ImprovementListOut,
    LlmSuggestionOut,
    LlmSuggestionRequestIn,
    NutriScoreDetailOut,
    RecipeNutritionBreakdownOut,
)

router = Router()


# ==========================================================================
# Recipe Analysis (Nutri-Score)
# ==========================================================================


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
# Unified Improvement Ranking
# ==========================================================================


@router.get("/{recipe_id}/improvements/", response=ImprovementListOut)
def get_recipe_improvements(request, recipe_id: int):
    """Get ranked improvement suggestions (merged Nutri-Score + RecipeHint)."""
    from recipe.services.improvement_ranking_service import compute_improvement_ranking

    recipe = get_object_or_404(Recipe, id=recipe_id)
    return compute_improvement_ranking(recipe)


# ==========================================================================
# LLM Suggestions
# ==========================================================================


@router.post("/{recipe_id}/suggestions/", response=list[LlmSuggestionOut])
def get_llm_suggestions(request, recipe_id: int, body: LlmSuggestionRequestIn):
    """Get LLM-generated ingredient suggestions for a recipe improvement objective."""
    if not request.user.is_authenticated:
        raise HttpError(401, "Anmeldung erforderlich")

    from recipe.services.suggestion_service import get_suggestions

    recipe = get_object_or_404(Recipe, id=recipe_id)
    return get_suggestions(recipe, body.objective, request.user)


# ==========================================================================
# Nutritional Breakdown (per ingredient)
# ==========================================================================


@router.get("/{recipe_id}/nutrition-breakdown/", response=RecipeNutritionBreakdownOut)
def get_recipe_nutrition_breakdown(request, recipe_id: int, age: int | None = None, gender: str | None = None):
    """Get detailed nutritional breakdown per ingredient for a recipe.

    Optional ``age`` and ``gender`` query params select a DGE reference row
    so that ``dge_coverage`` percentages can be returned.
    """
    recipe = get_object_or_404(Recipe, id=recipe_id)
    items = RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion", "portion__ingredient", "ingredient", "measuring_unit"
    )

    from recipe.services.recipe_checks import MICRONUTRIENT_FIELDS

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
    # Micronutrient totals
    micro_totals: dict[str, float] = {f: 0.0 for f in MICRONUTRIENT_FIELDS}

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

        # Micronutrient contributions for this item
        item_micro = {}
        for field in MICRONUTRIENT_FIELDS:
            val = getattr(ingredient, field, None)
            if val is not None:
                contribution = val * factor
                item_micro[field] = contribution
                micro_totals[field] += contribution
            else:
                item_micro[field] = None

        energy_kcal = item_nutrition["energy_kj"] / 4.184

        item_entry = {
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
        # Add micronutrient values to item
        for field in MICRONUTRIENT_FIELDS:
            val = item_micro[field]
            item_entry[field] = round(val, 3) if val is not None else None

        item_data.append(item_entry)

    # Second pass: calculate weight percentages and contributions
    for item in item_data:
        if total_weight_g > 0:
            item["weight_pct"] = round(item["weight_g"] / total_weight_g * 100, 1)

        # Compute per-item contributions for each nutritional parameter
        contributions = []
        param_mapping = [
            ("energy", "energy_kj"),
            ("protein", "protein_g"),
            ("fat", "fat_g"),
            ("sat_fat", "fat_sat_g"),
            ("carbs", "carbohydrate_g"),
            ("sugar", "sugar_g"),
            ("salt", "salt_g"),
            ("fiber", "fibre_g"),
        ]
        for param_key, field_key in param_mapping:
            item_val = item.get(field_key, 0.0)
            recipe_total = totals.get(field_key, 0.0)
            pct = round(item_val / recipe_total * 100, 1) if recipe_total > 0 else 0.0
            contributions.append({
                "parameter": param_key,
                "absolute": round(item_val, 1),
                "percent_of_recipe": pct,
            })
        item["contributions"] = contributions

        result_items.append(item)

    total_energy_kcal = totals["energy_kj"] / 4.184
    servings = recipe.servings or 1

    # Build DGE coverage if age/gender provided
    dge_coverage: dict[str, float | None] = {}
    if age is not None and gender:
        from supply.models import DgeReference

        ref = DgeReference.objects.filter(
            age_min__lte=age,
            age_max__gte=age,
            gender=gender,
        ).first()
        if ref:
            # Coverage = total recipe value / (daily reference * servings share)
            # We compare total recipe values against daily reference
            coverage_fields = [
                "energy_kj",
                "protein_g",
                "fat_g",
                "carbohydrate_g",
                "fibre_g",
            ] + MICRONUTRIENT_FIELDS
            for field in coverage_fields:
                ref_val = getattr(ref, field, None)
                if ref_val and ref_val > 0:
                    if field in totals:
                        actual = totals[field]
                    else:
                        actual = micro_totals.get(field, 0.0)
                    dge_coverage[field] = round(actual / ref_val * 100, 1)

    # Helper to get rounded micronutrient total or None
    def _micro_total(field: str) -> float | None:
        val = micro_totals.get(field, 0.0)
        return round(val, 3) if val else None

    # Compute positive health traits
    from recipe.services.health_traits_service import compute_positive_traits

    positive_traits = compute_positive_traits(recipe)

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
        # Micronutrient totals
        "total_vitamin_c_mg": _micro_total("vitamin_c_mg"),
        # Per-serving values
        "per_serving_energy_kcal": round(total_energy_kcal / servings, 1),
        "per_serving_protein_g": round(totals["protein_g"] / servings, 1),
        "per_serving_fat_g": round(totals["fat_g"] / servings, 1),
        "per_serving_carbohydrate_g": round(totals["carbohydrate_g"] / servings, 1),
        "per_serving_vitamin_c_mg": round(micro_totals.get("vitamin_c_mg", 0.0) / servings, 3) or None,
        # DGE coverage
        "dge_coverage": dge_coverage,
        "positive_traits": positive_traits,
        "items": result_items,
    }
