"""Positive health traits computation based on DGE / EU-Claim thresholds (EC 1924/2006).

All thresholds are per 100g of total recipe weight.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from recipe.models import Recipe


# ---------------------------------------------------------------------------
# DGE / EU-Claim Thresholds (per 100g)
# ---------------------------------------------------------------------------

FIBER_THRESHOLD_G = 6.0          # "high fiber" ≥ 6g/100g
PROTEIN_ENERGY_PCT = 20.0        # "high protein" ≥ 20% of energy from protein
SALT_THRESHOLD_G = 0.3           # "low salt" ≤ 0.3g/100g
SAT_FAT_THRESHOLD_G = 1.5        # "low saturated fat" ≤ 1.5g/100g
SUGAR_THRESHOLD_G = 5.0          # "low sugar" ≤ 5g/100g
BALANCED_SCORE_MIN = -1          # "balanced" nutri-score total points in [-1, +4]
BALANCED_SCORE_MAX = 4


# ---------------------------------------------------------------------------
# Individual trait checks (small helpers for testability)
# ---------------------------------------------------------------------------

def is_high_fiber(fibre_per_100g: float) -> bool:
    """Return True if fibre content qualifies as 'high fiber'."""
    return fibre_per_100g >= FIBER_THRESHOLD_G


def is_high_protein(protein_per_100g: float, energy_kcal_per_100g: float) -> bool:
    """Return True if protein provides ≥ 20% of energy.

    Protein provides 4 kcal per gram.
    """
    if energy_kcal_per_100g <= 0:
        return False
    protein_energy_kcal = protein_per_100g * 4.0
    pct = protein_energy_kcal / energy_kcal_per_100g * 100.0
    return pct >= PROTEIN_ENERGY_PCT


def is_low_salt(salt_per_100g: float) -> bool:
    """Return True if salt content qualifies as 'low salt'."""
    return salt_per_100g <= SALT_THRESHOLD_G


def is_low_sat_fat(fat_sat_per_100g: float) -> bool:
    """Return True if saturated fat qualifies as 'low saturated fat'."""
    return fat_sat_per_100g <= SAT_FAT_THRESHOLD_G


def is_low_sugar(sugar_per_100g: float) -> bool:
    """Return True if sugar content qualifies as 'low sugar'."""
    return sugar_per_100g <= SUGAR_THRESHOLD_G


def is_balanced(nutri_score_total_points: int) -> bool:
    """Return True if nutri-score total points are in middle range [-1, +4]."""
    return BALANCED_SCORE_MIN <= nutri_score_total_points <= BALANCED_SCORE_MAX


# ---------------------------------------------------------------------------
# Main computation
# ---------------------------------------------------------------------------

def compute_positive_traits(recipe: "Recipe") -> list[str]:
    """Compute positive health trait keys for a recipe.

    Uses cached per-100g nutrition values from the recipe model and
    the nutri-score calculation for the 'balanced' trait.

    Returns a list of trait enum keys (may be empty).
    """
    from recipe.services.recipe_checks import get_recipe_nutritional_values
    from supply.services.nutri_service import calculate_nutri_score
    from recipe.models import RecipeItem

    # No items → no traits
    if not RecipeItem.objects.filter(recipe=recipe).exists():
        return []

    values = get_recipe_nutritional_values(recipe)

    traits: list[str] = []

    fibre = values.get("fibre_g", 0.0)
    if is_high_fiber(fibre):
        traits.append("high_fiber")

    protein = values.get("protein_g", 0.0)
    energy_kcal = values.get("energy_kcal", 0.0)
    if is_high_protein(protein, energy_kcal):
        traits.append("high_protein")

    salt = values.get("salt_g", 0.0)
    if is_low_salt(salt):
        traits.append("low_salt")

    fat_sat = values.get("fat_sat_g", 0.0)
    if is_low_sat_fat(fat_sat):
        traits.append("low_sat_fat")

    sugar = values.get("sugar_g", 0.0)
    if is_low_sugar(sugar):
        traits.append("low_sugar")

    # Balanced: compute nutri-score total points
    class _Agg:
        pass

    agg = _Agg()
    for k, v in values.items():
        setattr(agg, k, v)
    agg.physical_viscosity = "solid"  # type: ignore[attr-defined]

    total_points, _ = calculate_nutri_score(agg)
    if is_balanced(total_points):
        traits.append("balanced")

    return traits
