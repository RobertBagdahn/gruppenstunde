"""Tests for nutrition plausibility rules and deterministic repairs."""

from supply.services.nutrition_plausibility import detect_nutrition_issues, propose_deterministic_repair


def codes(values, name="Testzutat"):
    return {issue.code for issue in detect_nutrition_issues(values, name=name)}


BASE = {
    "energy_kcal": 64.0,
    "protein_g": 3.3,
    "fat_g": 3.5,
    "fat_sat_g": 2.2,
    "carbohydrate_g": 4.7,
    "sugar_g": 4.7,
    "fibre_g": 0.0,
    "salt_g": 0.1,
    "sodium_mg": 40.0,
}


def test_plausible_profile_has_no_issues():
    assert codes(BASE, "Milch") == set()


def test_sugar_greater_than_carbs():
    assert "sugar_gt_carbs" in codes({**BASE, "carbohydrate_g": 3.0, "sugar_g": 8.0})


def test_broken_import_signature_sets_unknowns():
    values = {**BASE, "energy_kcal": 330.0, "fat_g": 0.0, "fat_sat_g": 0.1, "carbohydrate_g": 0.0, "sugar_g": 8.7}
    assert "broken_import" in codes(values)
    changes = propose_deterministic_repair(values, name="Skyr Vanille")
    assert changes["energy_kcal"] is None
    assert changes["fat_g"] is None
    assert changes["carbohydrate_g"] is None


def test_kj_above_900_is_converted():
    values = {**BASE, "energy_kcal": 1500.0, "protein_g": 10.0, "fat_g": 20.0, "carbohydrate_g": 40.0}
    changes = propose_deterministic_repair(values)
    assert changes["energy_kcal"] == round(1500 / 4.184, 1)


def test_placeholder_zeros_become_unknown_but_water_stays_zero():
    zeros = {field: 0.0 for field in BASE}
    assert "all_zero" in codes(zeros, "Paprika (rot)")
    assert propose_deterministic_repair(zeros, name="Paprika (rot)")["energy_kcal"] is None
    assert codes(zeros, "Mineralwasser") == set()


def test_salt_is_derived_from_sodium():
    changes = propose_deterministic_repair({**BASE, "salt_g": 0.0, "sodium_mg": 400.0})
    assert changes["salt_g"] == 1.0


def test_missing_energy_is_computed_from_macros():
    changes = propose_deterministic_repair({**BASE, "energy_kcal": None})
    assert changes["energy_kcal"] == round(4 * 3.3 + 4 * 4.7 + 9 * 3.5, 1)


def test_alcohol_energy_without_macros_is_plausible():
    rum = {"energy_kcal": 231.0, "protein_g": 0.0, "fat_g": 0.0, "carbohydrate_g": 0.0, "sugar_g": 0.0}
    assert codes(rum, "Rum") == set()


def test_us_total_carbs_lose_their_fibre():
    chocolate = {**BASE, "energy_kcal": 588.0, "protein_g": 6.0, "fat_g": 40.0, "carbohydrate_g": 52.0, "fibre_g": 10.0}
    changes = propose_deterministic_repair(chocolate, name="Zartbitterschokolade")
    # Stated energy (588) fits the net carbs (52 - 10 fibre) better than the gross value.
    assert changes["carbohydrate_g"] == 42.0
