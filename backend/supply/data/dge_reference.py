"""DGE (Deutsche Gesellschaft für Ernährung) reference values.

Static reference data for daily nutritional requirements by age group and gender.
Source: DGE, ÖGE, SGE D-A-CH Referenzwerte für die Nährstoffzufuhr.

All values are per day, for moderate physical activity (PAL 1.4-1.6).
Energy values can be scaled with the PAL factor.
"""

from __future__ import annotations


# Age group key: (min_age, max_age) inclusive
# Values: {parameter: value}
# Energy in kcal, macronutrients in g, fibre in g

DGE_REFERENCE: dict[tuple[int, int], dict[str, dict[str, float]]] = {
    # --- Children 1-3 ---
    (1, 3): {
        "male": {
            "energy_kcal": 1195,
            "protein_g": 14,
            "fat_g": 45,
            "carbohydrate_g": 150,
            "fibre_g": 10,
        },
        "female": {
            "energy_kcal": 1099,
            "protein_g": 14,
            "fat_g": 42,
            "carbohydrate_g": 138,
            "fibre_g": 10,
        },
    },
    # --- Children 4-6 ---
    (4, 6): {
        "male": {
            "energy_kcal": 1530,
            "protein_g": 18,
            "fat_g": 55,
            "carbohydrate_g": 190,
            "fibre_g": 15,
        },
        "female": {
            "energy_kcal": 1386,
            "protein_g": 17,
            "fat_g": 52,
            "carbohydrate_g": 175,
            "fibre_g": 15,
        },
    },
    # --- Children 7-9 ---
    (7, 9): {
        "male": {
            "energy_kcal": 1793,
            "protein_g": 24,
            "fat_g": 65,
            "carbohydrate_g": 220,
            "fibre_g": 18,
        },
        "female": {
            "energy_kcal": 1697,
            "protein_g": 24,
            "fat_g": 60,
            "carbohydrate_g": 210,
            "fibre_g": 18,
        },
    },
    # --- Children 10-12 ---
    (10, 12): {
        "male": {
            "energy_kcal": 2199,
            "protein_g": 34,
            "fat_g": 78,
            "carbohydrate_g": 270,
            "fibre_g": 20,
        },
        "female": {
            "energy_kcal": 2032,
            "protein_g": 35,
            "fat_g": 72,
            "carbohydrate_g": 250,
            "fibre_g": 20,
        },
    },
    # --- Adolescents 13-14 ---
    (13, 14): {
        "male": {
            "energy_kcal": 2533,
            "protein_g": 46,
            "fat_g": 90,
            "carbohydrate_g": 310,
            "fibre_g": 23,
        },
        "female": {
            "energy_kcal": 2294,
            "protein_g": 45,
            "fat_g": 82,
            "carbohydrate_g": 285,
            "fibre_g": 23,
        },
    },
    # --- Adolescents 15-18 ---
    (15, 18): {
        "male": {
            "energy_kcal": 2868,
            "protein_g": 56,
            "fat_g": 100,
            "carbohydrate_g": 350,
            "fibre_g": 30,
        },
        "female": {
            "energy_kcal": 2342,
            "protein_g": 46,
            "fat_g": 83,
            "carbohydrate_g": 290,
            "fibre_g": 30,
        },
    },
    # --- Adults 19-24 ---
    (19, 24): {
        "male": {
            "energy_kcal": 2749,
            "protein_g": 57,
            "fat_g": 95,
            "carbohydrate_g": 340,
            "fibre_g": 30,
        },
        "female": {
            "energy_kcal": 2247,
            "protein_g": 46,
            "fat_g": 80,
            "carbohydrate_g": 280,
            "fibre_g": 30,
        },
    },
    # --- Adults 25-50 ---
    (25, 50): {
        "male": {
            "energy_kcal": 2629,
            "protein_g": 57,
            "fat_g": 90,
            "carbohydrate_g": 325,
            "fibre_g": 30,
        },
        "female": {
            "energy_kcal": 2103,
            "protein_g": 46,
            "fat_g": 75,
            "carbohydrate_g": 260,
            "fibre_g": 30,
        },
    },
    # --- Adults 51-64 ---
    (51, 64): {
        "male": {
            "energy_kcal": 2438,
            "protein_g": 57,
            "fat_g": 85,
            "carbohydrate_g": 300,
            "fibre_g": 30,
        },
        "female": {
            "energy_kcal": 1960,
            "protein_g": 46,
            "fat_g": 70,
            "carbohydrate_g": 245,
            "fibre_g": 30,
        },
    },
    # --- Seniors 65+ ---
    (65, 99): {
        "male": {
            "energy_kcal": 2151,
            "protein_g": 57,
            "fat_g": 75,
            "carbohydrate_g": 265,
            "fibre_g": 30,
        },
        "female": {
            "energy_kcal": 1793,
            "protein_g": 46,
            "fat_g": 63,
            "carbohydrate_g": 225,
            "fibre_g": 30,
        },
    },
}


def get_dge_reference(age: int, gender: str) -> dict[str, float] | None:
    """Look up DGE reference values for a given age and gender.

    Args:
        age: Age in years (0-99).
        gender: 'male' or 'female'.

    Returns:
        Dict with energy_kcal, protein_g, fat_g, carbohydrate_g, fibre_g
        or None if no matching age group found.
    """
    for (min_age, max_age), values in DGE_REFERENCE.items():
        if min_age <= age <= max_age:
            return values.get(gender)
    return None


def get_all_dge_reference() -> list[dict]:
    """Return all DGE reference data as a flat list suitable for API responses.

    Returns:
        List of dicts with age_min, age_max, gender, and all nutritional values.
    """
    result = []
    for (min_age, max_age), genders in DGE_REFERENCE.items():
        for gender, values in genders.items():
            result.append(
                {
                    "age_min": min_age,
                    "age_max": max_age,
                    "gender": gender,
                    **values,
                }
            )
    return result
