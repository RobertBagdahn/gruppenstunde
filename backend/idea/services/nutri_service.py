"""Nutri-Score calculation service.

Implements the official French Nutri-Score algorithm (2017 version).
Calculates negative and positive points based on nutritional values per 100g,
then maps to a class (A=1 through E=5).

Solid and beverage products use different threshold tables.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from idea.models import Ingredient

# ---------------------------------------------------------------------------
# Threshold tables (solid)
# ---------------------------------------------------------------------------

# Negative points: higher value = worse (0-10 each)
SOLID_ENERGY_THRESHOLDS = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]
SOLID_SUGAR_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]
SOLID_FAT_SAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
SOLID_SODIUM_THRESHOLDS = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]

# Positive points: higher value = better (0-5 each)
SOLID_FIBRE_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7]
SOLID_PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0]
SOLID_FRUIT_THRESHOLDS = [0.4, 0.6, 0.8, 0.8, 0.8]  # fruit_factor thresholds

# ---------------------------------------------------------------------------
# Threshold tables (beverage)
# ---------------------------------------------------------------------------

BEVERAGE_ENERGY_THRESHOLDS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270]
BEVERAGE_SUGAR_THRESHOLDS = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5]
BEVERAGE_FAT_SAT_THRESHOLDS = SOLID_FAT_SAT_THRESHOLDS  # same
BEVERAGE_SODIUM_THRESHOLDS = SOLID_SODIUM_THRESHOLDS  # same

BEVERAGE_FIBRE_THRESHOLDS = SOLID_FIBRE_THRESHOLDS
BEVERAGE_PROTEIN_THRESHOLDS = SOLID_PROTEIN_THRESHOLDS
BEVERAGE_FRUIT_THRESHOLDS = [0.4, 0.6, 0.8, 0.8, 0.8]

# ---------------------------------------------------------------------------
# Nutri-Score class boundaries
# ---------------------------------------------------------------------------

# Solid: A(-1..−), B(0..2), C(3..10), D(11..18), E(19+)
SOLID_CLASS_BOUNDARIES = [(-1, 1), (0, 2), (3, 3), (11, 4), (19, 5)]

# Beverage: A(water only), B(−..1), C(2..5), D(6..9), E(10+)
BEVERAGE_CLASS_BOUNDARIES = [(0, 1), (0, 2), (2, 3), (6, 4), (10, 5)]


def _lookup_points(value: float | None, thresholds: list[float]) -> int:
    """Look up points for a value against a threshold table."""
    if value is None:
        return 0
    for i, threshold in enumerate(thresholds):
        if value <= threshold:
            return i
    return len(thresholds)


def calculate_nutri_score(ingredient: "Ingredient") -> tuple[int, int]:
    """Calculate Nutri-Score for an ingredient.

    Returns:
        (total_points, nutri_class) where nutri_class is 1(A) to 5(E)
    """
    is_beverage = ingredient.physical_viscosity == "beverage"

    # Select tables
    if is_beverage:
        energy_t = BEVERAGE_ENERGY_THRESHOLDS
        sugar_t = BEVERAGE_SUGAR_THRESHOLDS
        fat_sat_t = BEVERAGE_FAT_SAT_THRESHOLDS
        sodium_t = BEVERAGE_SODIUM_THRESHOLDS
        fibre_t = BEVERAGE_FIBRE_THRESHOLDS
        protein_t = BEVERAGE_PROTEIN_THRESHOLDS
        fruit_t = BEVERAGE_FRUIT_THRESHOLDS
    else:
        energy_t = SOLID_ENERGY_THRESHOLDS
        sugar_t = SOLID_SUGAR_THRESHOLDS
        fat_sat_t = SOLID_FAT_SAT_THRESHOLDS
        sodium_t = SOLID_SODIUM_THRESHOLDS
        fibre_t = SOLID_FIBRE_THRESHOLDS
        protein_t = SOLID_PROTEIN_THRESHOLDS
        fruit_t = SOLID_FRUIT_THRESHOLDS

    # Negative points (0-10 each, max 40)
    neg_energy = _lookup_points(ingredient.energy_kj, energy_t)
    neg_sugar = _lookup_points(ingredient.sugar_g, sugar_t)
    neg_fat_sat = _lookup_points(ingredient.fat_sat_g, fat_sat_t)
    neg_sodium = _lookup_points(ingredient.sodium_mg, sodium_t)
    negative_total = neg_energy + neg_sugar + neg_fat_sat + neg_sodium

    # Positive points (0-5 each, max 15)
    pos_fibre = _lookup_points(ingredient.fibre_g, fibre_t)
    pos_protein = _lookup_points(ingredient.protein_g, protein_t)
    pos_fruit = _lookup_points(ingredient.fruit_factor, fruit_t)
    positive_total = pos_fibre + pos_protein + pos_fruit

    # Special rule: if negative >= 11 and fruit < 5, don't count protein
    if negative_total >= 11 and pos_fruit < 5:
        positive_total = pos_fibre + pos_fruit

    total = negative_total - positive_total

    # Map to class
    nutri_class = _total_to_class(total, is_beverage)

    return total, nutri_class


def _total_to_class(total: int, is_beverage: bool) -> int:
    """Map total nutri-score points to class 1-5."""
    if is_beverage:
        if total <= 1:
            return 2  # B (A is only for water)
        elif total <= 5:
            return 3  # C
        elif total <= 9:
            return 4  # D
        else:
            return 5  # E
    else:
        if total < 0:
            return 1  # A
        elif total <= 2:
            return 2  # B
        elif total <= 10:
            return 3  # C
        elif total <= 18:
            return 4  # D
        else:
            return 5  # E


def get_nutri_score_details(ingredient: "Ingredient") -> dict:
    """Get detailed Nutri-Score breakdown for an ingredient."""
    is_beverage = ingredient.physical_viscosity == "beverage"

    if is_beverage:
        energy_t = BEVERAGE_ENERGY_THRESHOLDS
        sugar_t = BEVERAGE_SUGAR_THRESHOLDS
        fat_sat_t = BEVERAGE_FAT_SAT_THRESHOLDS
        sodium_t = BEVERAGE_SODIUM_THRESHOLDS
        fibre_t = BEVERAGE_FIBRE_THRESHOLDS
        protein_t = BEVERAGE_PROTEIN_THRESHOLDS
        fruit_t = BEVERAGE_FRUIT_THRESHOLDS
    else:
        energy_t = SOLID_ENERGY_THRESHOLDS
        sugar_t = SOLID_SUGAR_THRESHOLDS
        fat_sat_t = SOLID_FAT_SAT_THRESHOLDS
        sodium_t = SOLID_SODIUM_THRESHOLDS
        fibre_t = SOLID_FIBRE_THRESHOLDS
        protein_t = SOLID_PROTEIN_THRESHOLDS
        fruit_t = SOLID_FRUIT_THRESHOLDS

    neg_energy = _lookup_points(ingredient.energy_kj, energy_t)
    neg_sugar = _lookup_points(ingredient.sugar_g, sugar_t)
    neg_fat_sat = _lookup_points(ingredient.fat_sat_g, fat_sat_t)
    neg_sodium = _lookup_points(ingredient.sodium_mg, sodium_t)
    negative_total = neg_energy + neg_sugar + neg_fat_sat + neg_sodium

    pos_fibre = _lookup_points(ingredient.fibre_g, fibre_t)
    pos_protein = _lookup_points(ingredient.protein_g, protein_t)
    pos_fruit = _lookup_points(ingredient.fruit_factor, fruit_t)
    positive_total = pos_fibre + pos_protein + pos_fruit

    if negative_total >= 11 and pos_fruit < 5:
        positive_total = pos_fibre + pos_fruit

    total = negative_total - positive_total
    nutri_class = _total_to_class(total, is_beverage)

    labels = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}

    return {
        "negative_points": negative_total,
        "positive_points": positive_total,
        "total_points": total,
        "nutri_class": nutri_class,
        "nutri_label": labels.get(nutri_class, "?"),
        "details": {
            "energy_points": neg_energy,
            "sugar_points": neg_sugar,
            "fat_sat_points": neg_fat_sat,
            "sodium_points": neg_sodium,
            "fibre_points": pos_fibre,
            "protein_points": pos_protein,
            "fruit_points": pos_fruit,
            "is_beverage": is_beverage,
        },
    }


def update_ingredient_nutri_score(ingredient: "Ingredient") -> None:
    """Recalculate and save Nutri-Score for an ingredient."""
    total, nutri_class = calculate_nutri_score(ingredient)
    ingredient.nutri_score = total
    ingredient.nutri_class = nutri_class
    ingredient.save(update_fields=["nutri_score", "nutri_class"])
