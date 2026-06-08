"""Nutri-Score improvement suggestions for recipes.

Simulates 10% improvements on each Nutri-Score parameter and returns
all candidates (sorted by impact) together with contributing ingredients.

Since the introduction of the unified improvement-ranking service, this
module no longer applies a hard top-N limit. The ranking service merges
these candidates with RecipeHint matches and selects the final Top-5.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from recipe.models import Recipe

_NUTRI_LABELS = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}

# Negative parameters: reducing the value improves the score
_NEGATIVE_PARAMS: list[dict[str, str]] = [
    {"key": "energy_kcal", "label": "Energie", "direction": "reduce"},
    {"key": "sugar_g", "label": "Zucker", "direction": "reduce"},
    {"key": "fat_sat_g", "label": "Gesättigte Fettsäuren", "direction": "reduce"},
    {"key": "sodium_mg", "label": "Salz/Natrium", "direction": "reduce"},
]

# Positive parameters: increasing the value improves the score
_POSITIVE_PARAMS: list[dict[str, str]] = [
    {"key": "fibre_g", "label": "Ballaststoffe", "direction": "increase"},
    {"key": "protein_g", "label": "Protein", "direction": "increase"},
]


def calculate_nutri_improvements(recipe: "Recipe") -> list[dict]:
    """Calculate Nutri-Score improvement candidates sorted by impact.

    For each Nutri-Score parameter, simulates a 10% improvement and
    measures the effect on the overall score. Returns all candidates
    (no top-N limit) with affected ingredients, sorted by class
    improvement descending then point improvement descending.

    Returns empty list if recipe already has Nutri-Score A (class 1).
    """
    from recipe.services.recipe_checks import get_recipe_nutritional_values
    from supply.services.nutri_service import calculate_nutri_score

    values = get_recipe_nutritional_values(recipe)

    # Ensure sodium_mg is derived from salt_g (sodium_mg = salt_g * 400)
    if values.get("salt_g"):
        values["sodium_mg"] = values["salt_g"] * 400.0

    # Calculate current nutri-score
    current_agg = _make_agg_ingredient(values)
    current_total, current_class = calculate_nutri_score(current_agg)

    # Already best class — no improvements needed
    if current_class == 1:
        return []

    # Simulate 10% improvement for each parameter
    candidates: list[dict] = []

    for param_info in _NEGATIVE_PARAMS + _POSITIVE_PARAMS:
        param_key = param_info["key"]
        direction = param_info["direction"]
        label = param_info["label"]

        current_value = values.get(param_key, 0.0)

        # Skip if value is zero (no room for improvement)
        if current_value == 0.0:
            continue

        # Simulate 10% change in the improving direction
        if direction == "reduce":
            target_value = current_value * 0.9
        else:
            target_value = current_value * 1.1

        simulated = dict(values)
        simulated[param_key] = target_value

        sim_agg = _make_agg_ingredient(simulated)
        sim_total, sim_class = calculate_nutri_score(sim_agg)

        class_improvement = current_class - sim_class
        point_improvement = current_total - sim_total

        candidates.append(
            {
                "parameter": param_key,
                "parameter_label": label,
                "direction": direction,
                "current_value": round(current_value, 2),
                "target_value": round(target_value, 2),
                "expected_nutri_class": sim_class,
                "expected_nutri_label": _NUTRI_LABELS.get(sim_class, "?"),
                "_class_improvement": class_improvement,
                "_point_improvement": point_improvement,
            }
        )

    # Sort by class improvement (desc), then point improvement (desc)
    candidates.sort(
        key=lambda x: (x["_class_improvement"], x["_point_improvement"]),
        reverse=True,
    )

    # Enrich all candidates with ingredient contributions
    results: list[dict] = []
    for candidate in candidates:
        affected = _find_contributing_ingredients(recipe, candidate["parameter"])

        current_val = candidate["current_value"]
        target_val = candidate["target_value"]

        results.append(
            {
                "parameter": candidate["parameter"],
                "parameter_label": candidate["parameter_label"],
                "direction": candidate["direction"],
                "current_value": round(current_val, 2),
                "target_value": round(target_val, 2),
                "affected_ingredients": affected,
                "expected_nutri_class": candidate["expected_nutri_class"],
                "expected_nutri_label": candidate["expected_nutri_label"],
                "class_improvement": candidate["_class_improvement"],
                "point_improvement": candidate["_point_improvement"],
            }
        )

    return results


def _find_contributing_ingredients(recipe: "Recipe", parameter: str) -> list[dict]:
    """Find which ingredients contribute most to a nutritional parameter.

    For sodium_mg, reads salt_g from the ingredient and converts
    (salt_g * 400 = sodium_mg).

    Returns list of {id, name, contribution_pct, amount_g} sorted by
    contribution descending.
    """
    from recipe.models import RecipeItem

    items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")

    # sodium_mg is stored as salt_g on the ingredient model
    ingredient_field = "salt_g" if parameter == "sodium_mg" else parameter

    contributions: list[dict] = []
    total_contribution = 0.0

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

        val = getattr(ingredient, ingredient_field, None)
        if val is None or val <= 0:
            continue

        # Nutritional values on the ingredient are per 100g
        contribution = val * weight_g / 100.0

        # Convert salt_g contribution to sodium_mg
        if parameter == "sodium_mg":
            contribution = contribution * 400.0

        total_contribution += contribution

        contributions.append(
            {
                "id": ingredient.id,
                "name": ingredient.name,
                "amount_g": round(contribution, 2),
                "_raw": contribution,
            }
        )

    # Calculate percentages and sort descending
    result: list[dict] = []
    for c in contributions:
        pct = (c["_raw"] / total_contribution * 100.0) if total_contribution > 0 else 0.0
        result.append(
            {
                "id": c["id"],
                "name": c["name"],
                "contribution_pct": round(pct, 1),
                "amount_g": c["amount_g"],
            }
        )

    result.sort(key=lambda x: x["contribution_pct"], reverse=True)
    return result


def _make_agg_ingredient(values: dict[str, float]) -> object:
    """Create a mock ingredient object from aggregated nutritional values."""

    class _AggIngredient:
        pass

    agg = _AggIngredient()
    for k, v in values.items():
        setattr(agg, k, v)
    agg.physical_viscosity = "solid"
    return agg
