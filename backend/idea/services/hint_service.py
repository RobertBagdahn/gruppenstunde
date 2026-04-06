"""RecipeHint rule matching service.

Provides a clean API surface for evaluating recipes against RecipeHint rules
and returning improvement suggestions. This wraps the core logic in
recipe_checks.py and adds serialization-friendly output.

Spec reference: openspec/specs/ingredient-database/spec.md, lines 395-433
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from recipe.models import Recipe


def get_recipe_hints(
    recipe: "Recipe",
    recipe_objective: str = "",
) -> list[dict]:
    """Get improvement suggestions for a recipe based on RecipeHint rules.

    Matches all RecipeHint rules against the recipe's aggregated nutritional
    values and returns hints for exceeded/undercut thresholds.

    Args:
        recipe: A Recipe instance
        recipe_objective: Optional filter by objective ('health', 'taste', 'cost', 'fulfillment')

    Returns:
        List of dicts with keys:
        - name: Hint rule name
        - description: Human-readable hint message
        - parameter: Which nutritional field triggered the hint
        - actual_value: The actual value in the recipe
        - hint_level: 'info', 'warning', or 'error'
        - min_value: The rule's minimum threshold (or None)
        - max_value: The rule's maximum threshold (or None)
    """
    from idea.services.recipe_checks import match_recipe_hints

    matched = match_recipe_hints(recipe, recipe_objective=recipe_objective)

    results = []
    for entry in matched:
        hint = entry["hint"]
        results.append(
            {
                "name": hint.name,
                "description": entry["message"],
                "parameter": hint.parameter,
                "actual_value": entry["actual_value"],
                "hint_level": hint.hint_level,
                "min_value": hint.min_value,
                "max_value": hint.max_value,
            }
        )

    return results


def get_recipe_ratings(recipe: "Recipe") -> list[dict]:
    """Get 4-dimension recipe ratings.

    Returns ratings for fulfillment, cost, health, and taste.

    Args:
        recipe: A Recipe instance

    Returns:
        List of dicts with keys: label, value, color, score
    """
    from idea.services.recipe_checks import get_recipe_checks

    return get_recipe_checks(recipe)


def get_recipe_nutri_score_details(recipe: "Recipe") -> dict:
    """Get detailed Nutri-Score breakdown for a recipe.

    Aggregates nutritional values from all RecipeItems, then
    calculates the Nutri-Score with full breakdown.

    Args:
        recipe: A Recipe instance

    Returns:
        Dict with negative_points, positive_points, total_points,
        nutri_class, nutri_label, and details breakdown
    """
    from idea.services.recipe_checks import get_recipe_nutritional_values
    from idea.services.nutri_service import calculate_nutri_score, get_nutri_score_details

    values = get_recipe_nutritional_values(recipe)

    # Create a mock ingredient-like object with aggregated values
    class _AggIngredient:
        pass

    agg = _AggIngredient()
    for k, v in values.items():
        setattr(agg, k, v)
    agg.physical_viscosity = "solid"

    return get_nutri_score_details(agg)
