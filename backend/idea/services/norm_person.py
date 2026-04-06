"""Norm-person calculation service (Mifflin-St Jeor).

Provides BMR/TDEE calculation, norm-person reference, reference tables
for average weight/height by age and gender, and group portion scaling.

Spec reference: openspec/specs/ingredient-database/spec.md, lines 330-365
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


# ---------------------------------------------------------------------------
# Reference tables: average weight (kg) and height (cm) by age and gender
# Sources: WHO/RKI growth charts, German paediatric references
# Ages 0-99, grouped for simplicity
# ---------------------------------------------------------------------------

# (age_min, age_max): (weight_kg, height_cm)
_MALE_REFERENCE: dict[tuple[int, int], tuple[float, float]] = {
    (0, 0): (3.5, 50),
    (1, 1): (10.0, 76),
    (2, 2): (12.5, 88),
    (3, 3): (14.5, 96),
    (4, 4): (16.5, 103),
    (5, 5): (18.5, 110),
    (6, 6): (21.0, 116),
    (7, 7): (23.5, 122),
    (8, 8): (26.0, 128),
    (9, 9): (28.5, 134),
    (10, 10): (31.5, 139),
    (11, 11): (35.0, 144),
    (12, 12): (39.0, 150),
    (13, 13): (44.0, 157),
    (14, 14): (50.0, 164),
    (15, 15): (56.0, 170),
    (16, 16): (61.0, 174),
    (17, 17): (65.0, 177),
    (18, 19): (70.0, 179),
    (20, 29): (75.0, 180),
    (30, 39): (80.0, 179),
    (40, 49): (82.0, 178),
    (50, 59): (83.0, 177),
    (60, 69): (81.0, 175),
    (70, 79): (78.0, 173),
    (80, 99): (73.0, 170),
}

_FEMALE_REFERENCE: dict[tuple[int, int], tuple[float, float]] = {
    (0, 0): (3.3, 49),
    (1, 1): (9.5, 74),
    (2, 2): (12.0, 86),
    (3, 3): (14.0, 95),
    (4, 4): (16.0, 102),
    (5, 5): (18.0, 109),
    (6, 6): (20.5, 115),
    (7, 7): (23.0, 121),
    (8, 8): (25.5, 127),
    (9, 9): (28.5, 133),
    (10, 10): (32.0, 139),
    (11, 11): (36.0, 145),
    (12, 12): (41.0, 152),
    (13, 13): (46.0, 157),
    (14, 14): (50.0, 161),
    (15, 15): (53.0, 163),
    (16, 16): (55.0, 164),
    (17, 17): (57.0, 165),
    (18, 19): (59.0, 166),
    (20, 29): (62.0, 166),
    (30, 39): (65.0, 166),
    (40, 49): (67.0, 165),
    (50, 59): (69.0, 164),
    (60, 69): (70.0, 163),
    (70, 79): (68.0, 161),
    (80, 99): (63.0, 158),
}


def _lookup_reference(age: int, gender: Gender) -> tuple[float, float]:
    """Look up average (weight_kg, height_cm) for a given age and gender."""
    table = _MALE_REFERENCE if gender == Gender.MALE else _FEMALE_REFERENCE
    for (age_min, age_max), (weight, height) in table.items():
        if age_min <= age <= age_max:
            return weight, height
    # Fallback: use the last entry for very old ages
    if gender == Gender.MALE:
        return 73.0, 170.0
    return 63.0, 158.0


def get_reference_data(age: int, gender: Gender) -> dict[str, float]:
    """Get reference weight and height for a given age and gender.

    Returns:
        {"weight_kg": float, "height_cm": float}
    """
    weight, height = _lookup_reference(age, gender)
    return {"weight_kg": weight, "height_cm": height}


# ---------------------------------------------------------------------------
# Mifflin-St Jeor BMR Calculation
# ---------------------------------------------------------------------------


def calculate_bmr(
    weight_kg: float,
    height_cm: float,
    age_years: int,
    gender: Gender,
) -> float:
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.

    Formula: BMR = 10 * weight + 6.25 * height - 5 * age + s
    where s = +5 for male, s = -161 for female

    Args:
        weight_kg: Body weight in kilograms
        height_cm: Height in centimeters
        age_years: Age in years
        gender: Gender.MALE or Gender.FEMALE

    Returns:
        BMR in kcal/day
    """
    s = 5.0 if gender == Gender.MALE else -161.0
    return 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age_years + s


def calculate_tdee(bmr: float, pal: float) -> float:
    """Calculate Total Daily Energy Expenditure.

    Formula: TDEE = BMR * PAL

    Args:
        bmr: Basal Metabolic Rate (kcal/day)
        pal: Physical Activity Level (typical values: 1.2-2.0)

    Returns:
        TDEE in kcal/day
    """
    return bmr * pal


# Typical PAL values for reference
PAL_SEDENTARY = 1.2
PAL_MODERATE = 1.5
PAL_ACTIVE = 1.75
PAL_VERY_ACTIVE = 2.0


# ---------------------------------------------------------------------------
# Norm Person Definition
# ---------------------------------------------------------------------------

# Norm person: 15-year-old boy with PAL 1.5
NORM_PERSON_AGE = 15
NORM_PERSON_GENDER = Gender.MALE
NORM_PERSON_PAL = 1.5


@dataclass(frozen=True)
class NormPersonResult:
    """Result of a norm person calculation."""

    bmr: float
    tdee: float
    norm_factor: float
    weight_kg: float
    height_cm: float
    age: int
    gender: Gender
    pal: float


def _get_norm_tdee() -> float:
    """Get the TDEE for the reference norm person (cached internally)."""
    ref = _lookup_reference(NORM_PERSON_AGE, NORM_PERSON_GENDER)
    norm_bmr = calculate_bmr(ref[0], ref[1], NORM_PERSON_AGE, NORM_PERSON_GENDER)
    return calculate_tdee(norm_bmr, NORM_PERSON_PAL)


# Pre-calculate once at module load
_NORM_TDEE = _get_norm_tdee()


def calculate_norm_factor(
    age: int,
    gender: Gender,
    pal: float = PAL_MODERATE,
    weight_kg: float | None = None,
    height_cm: float | None = None,
) -> NormPersonResult:
    """Calculate the norm factor for a person relative to the norm person.

    The norm factor is: TDEE(person) / TDEE(norm-person)

    If weight_kg or height_cm are not provided, reference tables are used.

    Args:
        age: Age in years
        gender: Gender
        pal: Physical Activity Level (default: 1.5 moderate)
        weight_kg: Optional individual weight (uses reference if None)
        height_cm: Optional individual height (uses reference if None)

    Returns:
        NormPersonResult with all calculated values
    """
    if weight_kg is None or height_cm is None:
        ref_weight, ref_height = _lookup_reference(age, gender)
        if weight_kg is None:
            weight_kg = ref_weight
        if height_cm is None:
            height_cm = ref_height

    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, pal)
    norm_factor = tdee / _NORM_TDEE

    return NormPersonResult(
        bmr=round(bmr, 1),
        tdee=round(tdee, 1),
        norm_factor=round(norm_factor, 3),
        weight_kg=weight_kg,
        height_cm=height_cm,
        age=age,
        gender=gender,
        pal=pal,
    )


# ---------------------------------------------------------------------------
# Group Portion Scaling
# ---------------------------------------------------------------------------


@dataclass
class PersonSpec:
    """Specification for a person in a group (for portion scaling)."""

    age: int
    gender: Gender
    pal: float = PAL_MODERATE
    weight_kg: float | None = None
    height_cm: float | None = None


def calculate_group_norm_factor(persons: list[PersonSpec]) -> float:
    """Calculate the total norm factor for a group.

    The total is the sum of individual norm factors, which represents
    how many "norm portions" the group needs.

    Example: A group of 10 people might have a total norm factor of 8.5,
    meaning they need 8.5 norm portions worth of food.

    Args:
        persons: List of PersonSpec with age, gender, and optional measurements

    Returns:
        Total norm factor (sum of individual factors)
    """
    if not persons:
        return 0.0

    total = 0.0
    for person in persons:
        result = calculate_norm_factor(
            age=person.age,
            gender=person.gender,
            pal=person.pal,
            weight_kg=person.weight_kg,
            height_cm=person.height_cm,
        )
        total += result.norm_factor

    return round(total, 3)


def scale_recipe_for_group(
    recipe_serves_norm_portions: float,
    persons: list[PersonSpec],
    activity_factor: float = 1.0,
    reserve_factor: float = 1.0,
) -> float:
    """Calculate scaling factor for a recipe given a group.

    The scaling factor is applied to all recipe quantities.

    Formula: scaling = (group_norm_factor / recipe_serves) * activity_factor * reserve_factor

    Args:
        recipe_serves_norm_portions: How many norm-portions the recipe serves (e.g. 4)
        persons: List of group members
        activity_factor: Extra factor for activity level (default 1.0)
        reserve_factor: Extra safety margin (default 1.0, e.g. 1.1 for 10% reserve)

    Returns:
        Scaling factor to multiply all recipe quantities by
    """
    if recipe_serves_norm_portions <= 0:
        return 1.0

    group_factor = calculate_group_norm_factor(persons)
    if group_factor <= 0:
        return 1.0

    scaling = (group_factor / recipe_serves_norm_portions) * activity_factor * reserve_factor
    return round(scaling, 3)
