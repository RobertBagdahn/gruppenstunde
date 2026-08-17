"""Nutrition-related endpoints (NutriScore, Breakdown, Hints, Improvements, Suggestions)."""

from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError

from recipe.models import RecipeItem
from recipe.services.recipe_checks import _calculate_item_weight_g
from recipe.schemas import (
    ImprovementListOut,
    LlmSuggestionOut,
    LlmSuggestionRequestIn,
    NutriScoreDetailOut,
    RecipeNutritionBreakdownOut,
    RecipeRulesOut,
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

    from content.services.food_access import get_visible_recipe_or_404

    recipe = get_visible_recipe_or_404(request.user, recipe_id)
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

    from content.services.food_access import get_visible_recipe_or_404

    recipe = get_visible_recipe_or_404(request.user, recipe_id)
    return compute_improvement_ranking(recipe)


# ==========================================================================
# Recipe Rules Evaluation
# ==========================================================================


@router.get("/{recipe_id}/rules/", response=RecipeRulesOut)
def get_recipe_rules(request, recipe_id: int):
    """Evaluate all active recipe-scoped rules for a recipe."""
    from recipe.services.recipe_checks import evaluate_recipe_rules

    from content.services.food_access import get_visible_recipe_or_404

    recipe = get_visible_recipe_or_404(request.user, recipe_id)
    return evaluate_recipe_rules(recipe)


# ==========================================================================
# LLM Suggestions
# ==========================================================================


@router.post("/{recipe_id}/suggestions/", response=list[LlmSuggestionOut])
def get_llm_suggestions(request, recipe_id: int, body: LlmSuggestionRequestIn):
    """Get LLM-generated ingredient suggestions for a recipe improvement objective."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")

    from recipe.services.suggestion_service import get_suggestions

    from content.services.food_access import get_visible_recipe_or_404

    recipe = get_visible_recipe_or_404(request.user, recipe_id)
    return get_suggestions(recipe, body.objective, request.user, direction=body.direction)


# ==========================================================================
# Nutritional Breakdown (per ingredient)
# ==========================================================================


@router.get("/{recipe_id}/nutrition-breakdown/", response=RecipeNutritionBreakdownOut)
def get_recipe_nutrition_breakdown(request, recipe_id: int, age: int | None = None, gender: str | None = None):
    """Get detailed nutritional breakdown per ingredient for a recipe.

    Optional ``age`` and ``gender`` query params select a DGE reference row
    so that ``dge_coverage`` percentages can be returned.
    """
    from content.services.food_access import get_visible_recipe_or_404

    recipe = get_visible_recipe_or_404(request.user, recipe_id)
    items = (
        RecipeItem.objects.filter(recipe=recipe)
        .exclude(Q(exchange_group__isnull=False) & Q(exchange_position__gt=0))
        .select_related("portion", "portion__ingredient", "portion__measuring_unit")
    )

    from recipe.services.recipe_checks import MICRONUTRIENT_FIELDS

    result_items = []
    total_weight_g = 0.0
    total_price = 0.0
    has_prices = False
    totals = {
        "energy_kcal": 0.0,
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
        ingredient = item.portion.ingredient if item.portion else None
        if not ingredient:
            continue

        weight_g = _calculate_item_weight_g(item)
        if not weight_g:
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

        energy_kcal = item_nutrition["energy_kcal"]

        item_entry = {
            "recipe_item_id": item.id,
            "ingredient_id": ingredient.id,
            "ingredient_name": ingredient.name,
            "quantity": item.quantity,
            "portion_name": str(item.portion) if item.portion else "Stück",
            "weight_g": weight_g,
            "price_eur": item_price,
            "energy_kcal": energy_kcal,
            "protein_g": item_nutrition["protein_g"],
            "fat_g": item_nutrition["fat_g"],
            "fat_sat_g": item_nutrition["fat_sat_g"],
            "carbohydrate_g": item_nutrition["carbohydrate_g"],
            "sugar_g": item_nutrition["sugar_g"],
            "fibre_g": item_nutrition["fibre_g"],
            "salt_g": item_nutrition["salt_g"],
            "weight_pct": 0.0,
        }
        # Add micronutrient values to item
        for field in MICRONUTRIENT_FIELDS:
            val = item_micro[field]
            item_entry[field] = val

        item_data.append(item_entry)

    portions = recipe.portions or 1

    portions = recipe.portions or 1
    per_serving_totals = {k: v / portions for k, v in totals.items()} if portions else totals

    # Second pass: calculate weight percentages and contributions
    for item in item_data:
        if total_weight_g > 0:
            item["weight_pct"] = round(item["weight_g"] / total_weight_g * 100, 1)

        # Compute per-item contributions from total values (correct ratio)
        contributions = []
        param_mapping = [
            ("energy", "energy_kcal"),
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
            contributions.append(
                {
                    "parameter": param_key,
                    "absolute": round(item_val / portions, 1) if portions else 0.0,
                    "percent_of_recipe": pct,
                }
            )
        item["contributions"] = contributions

        # Convert item values to per-serving for consistent display
        if portions:
            item["weight_g"] = round(item["weight_g"] / portions, 1)
            item["energy_kcal"] = round(item["energy_kcal"] / portions, 1)
            item["protein_g"] = round(item["protein_g"] / portions, 1)
            item["fat_g"] = round(item["fat_g"] / portions, 1)
            item["fat_sat_g"] = round(item["fat_sat_g"] / portions, 1)
            item["carbohydrate_g"] = round(item["carbohydrate_g"] / portions, 1)
            item["sugar_g"] = round(item["sugar_g"] / portions, 1)
            item["fibre_g"] = round(item["fibre_g"] / portions, 1)
            item["salt_g"] = round(item["salt_g"] / portions, 1)
            if item["price_eur"] is not None:
                item["price_eur"] = round(item["price_eur"] / portions, 2)
            for field in MICRONUTRIENT_FIELDS:
                if item.get(field) is not None:
                    item[field] = round(item[field] / portions, 3)

        result_items.append(item)

    total_energy_kcal = totals["energy_kcal"]

    # Build DGE coverage if age/gender provided
    dge_coverage: dict[str, float | None] = {}
    dge_reference: dict[str, float | None] = {}
    if age is not None and gender:
        from supply.data.dge_reference import get_dge_reference

        ref = get_dge_reference(age, gender)
        if ref:
            coverage_fields = [
                "energy_kcal",
                "protein_g",
                "fat_g",
                "carbohydrate_g",
                "fibre_g",
            ]
            for field in coverage_fields:
                ref_val = ref.get(field)
                if ref_val and ref_val > 0:
                    total_key = field
                    actual = totals.get(total_key, 0.0)
                    dge_coverage[total_key] = round(actual / ref_val * 100, 1)
                    dge_reference[total_key] = round(ref_val, 1)

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
        "total_energy_kcal": round(totals["energy_kcal"], 1),
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
        "per_serving_energy_kcal": round(total_energy_kcal / portions, 1),
        "per_serving_protein_g": round(totals["protein_g"] / portions, 1),
        "per_serving_fat_g": round(totals["fat_g"] / portions, 1),
        "per_serving_carbohydrate_g": round(totals["carbohydrate_g"] / portions, 1),
        "per_serving_vitamin_c_mg": round(micro_totals.get("vitamin_c_mg", 0.0) / portions, 3) or None,
        # Per-100g values
        "per_100g_energy_kcal": round(total_energy_kcal / total_weight_g * 100, 1) if total_weight_g > 0 else None,
        "per_100g_protein_g": round(totals["protein_g"] / total_weight_g * 100, 1) if total_weight_g > 0 else None,
        "per_100g_fat_g": round(totals["fat_g"] / total_weight_g * 100, 1) if total_weight_g > 0 else None,
        "per_100g_fat_sat_g": round(totals["fat_sat_g"] / total_weight_g * 100, 1) if total_weight_g > 0 else None,
        "per_100g_carbohydrate_g": (
            round(totals["carbohydrate_g"] / total_weight_g * 100, 1) if total_weight_g > 0 else None
        ),
        "per_100g_sugar_g": round(totals["sugar_g"] / total_weight_g * 100, 1) if total_weight_g > 0 else None,
        "per_100g_fibre_g": round(totals["fibre_g"] / total_weight_g * 100, 1) if total_weight_g > 0 else None,
        "per_100g_salt_g": round(totals["salt_g"] / total_weight_g * 100, 1) if total_weight_g > 0 else None,
        "per_100g_vitamin_c_mg": (
            round(micro_totals.get("vitamin_c_mg", 0.0) / total_weight_g * 100, 3)
            if total_weight_g > 0 and micro_totals.get("vitamin_c_mg", 0.0)
            else None
        ),
        # DGE coverage
        "dge_coverage": dge_coverage,
        "dge_reference": dge_reference,
        "positive_traits": positive_traits,
        "items": result_items,
    }
