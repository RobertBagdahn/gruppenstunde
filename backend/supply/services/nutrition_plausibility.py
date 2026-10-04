"""Nutrition plausibility rules and deterministic repairs for ingredients (per 100 g).

Two outputs per ingredient:

- ``detect_nutrition_issues`` lists every rule violation (for the UI and for
  deciding which ingredients need an AI review).
- ``propose_deterministic_repair`` returns field changes that are safe without
  AI: impossible values become ``None`` ("unknown"), derivable values are
  computed (Atwater energy, salt <-> sodium, kJ -> kcal).

"Unknown" is always ``None``. ``0`` means "measured zero" and is only kept when
it is plausible (water, salt, spices, …).
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass

KJ_PER_KCAL = 4.184
SODIUM_MG_PER_G_SALT = 400.0
MAX_KCAL_PER_100G = 900.0
MAX_KJ_PER_100G = 3800.0

NUTRITION_FIELDS: tuple[str, ...] = (
    "energy_kcal",
    "protein_g",
    "fat_g",
    "fat_sat_g",
    "carbohydrate_g",
    "sugar_g",
    "fibre_g",
    "salt_g",
    "sodium_mg",
)
GRAM_FIELDS: tuple[str, ...] = ("protein_g", "fat_g", "fat_sat_g", "carbohydrate_g", "sugar_g", "fibre_g", "salt_g")

# Ingredients where an all-zero macro profile is genuinely plausible.
_ZERO_MACRO_PATTERN = re.compile(
    r"(wasser|salz|essig|tee\b|kaffee\b|natron|backpulver|gelatine|süßstoff|stevia|pfeffer|gewürz|"
    r"hefe|aroma|farbe|lebensmittelfarbe|eis(würfel)?$|mineral|soda|zitronensäure|fleur de sel|glutamat|drops)",
    re.IGNORECASE,
)

# Alcohol provides 7 kcal/g that Atwater on protein/fat/carbs does not cover.
_ALCOHOL_PATTERN = re.compile(
    r"(\brum\b|wodka|vodka|likör|\bwein\b|rotwein|weißwein|kochwein|\bbier\b|schnaps|\bgin\b|whisk(e)?y|"
    r"\bsekt\b|prosecco|amaretto|\bkorn\b|cognac|brandy|grappa|glühwein|cidre|portwein|sherry|marsala|metaxa|ouzo)",
    re.IGNORECASE,
)
# Macro sums slightly above 100 g almost always come from US "total carbs" (incl. fibre).
MACRO_SUM_CLAMP_LIMIT = 120.0
# Physical limit of protein + fat + carbohydrates + fibre per 100 g (with rounding slack).
MACRO_SUM_LIMIT = 100.5

ISSUE_LABELS: dict[str, str] = {
    "broken_import": "Import-Fehler: Fett/Kohlenhydrate fehlen (0), Unterwerte vorhanden",
    "energy_kj_as_kcal": "Energie vermutlich in kJ statt kcal erfasst",
    "energy_too_high": "Energiedichte über 900 kcal/100 g",
    "energy_missing": "Energie fehlt trotz vorhandener Makros",
    "energy_mismatch": "Energie passt nicht zu den Makronährstoffen",
    "sugar_gt_carbs": "Zucker größer als Kohlenhydrate",
    "sat_fat_gt_fat": "Gesättigte Fettsäuren größer als Fett",
    "macro_sum_gt_100": "Summe der Makros über 100 g/100 g",
    "all_zero": "Alle Nährwerte 0 (Platzhalter)",
    "macros_missing": "Makronährstoffe fehlen",
    "invalid_value": "Negativer oder unmöglicher Wert",
    "salt_sodium_mismatch": "Salz und Natrium widersprechen sich",
}


@dataclass(frozen=True)
class NutritionIssue:
    """A single plausibility rule violation."""

    code: str
    label: str
    fields: tuple[str, ...]
    auto_fixable: bool


def _num(values: Mapping[str, float | None], field: str) -> float | None:
    value = values.get(field)
    if value is None:
        return None
    return float(value)


def atwater_kcal(values: Mapping[str, float | None]) -> float | None:
    """EU Atwater energy (kcal/100 g). ``None`` if protein, fat or carbs are unknown."""
    protein = _num(values, "protein_g")
    fat = _num(values, "fat_g")
    carbs = _num(values, "carbohydrate_g")
    if protein is None or fat is None or carbs is None:
        return None
    fibre = _num(values, "fibre_g") or 0.0
    return 4 * protein + 4 * carbs + 9 * fat + 2 * fibre


def zero_is_plausible(name: str) -> bool:
    """Whether an all-zero macro profile is expected for this ingredient name."""
    return bool(_ZERO_MACRO_PATTERN.search(name or ""))


def is_alcoholic(name: str) -> bool:
    """Whether the ingredient contains alcohol (energy without macros is expected)."""
    return bool(_ALCOHOL_PATTERN.search(name or ""))


def _is_broken_import(values: Mapping[str, float | None]) -> bool:
    """REWE import signature: parent value stored as 0 while its sub-value is set."""
    fat = _num(values, "fat_g")
    sat = _num(values, "fat_sat_g")
    carbs = _num(values, "carbohydrate_g")
    sugar = _num(values, "sugar_g")
    fat_broken = fat == 0 and sat is not None and sat > 0
    carbs_broken = carbs == 0 and sugar is not None and sugar > 0
    return fat_broken or carbs_broken


def _all_zero(values: Mapping[str, float | None]) -> bool:
    """Energy and all macros stored as exactly 0 (unknown ``None`` does not count)."""
    fields = ("energy_kcal", "protein_g", "fat_g", "carbohydrate_g")
    return all(_num(values, f) == 0 for f in fields)


def detect_nutrition_issues(values: Mapping[str, float | None], *, name: str = "") -> list[NutritionIssue]:
    """Return all plausibility issues for a nutrition profile (per 100 g)."""
    issues: list[NutritionIssue] = []

    def add(code: str, fields: tuple[str, ...], auto_fixable: bool) -> None:
        issues.append(NutritionIssue(code, ISSUE_LABELS[code], fields, auto_fixable))

    invalid = [
        field
        for field in NUTRITION_FIELDS
        if (value := _num(values, field)) is not None
        and (
            value < 0 or (field in GRAM_FIELDS and value > 100) or (field == "energy_kcal" and value > MAX_KJ_PER_100G)
        )
    ]
    if invalid:
        add("invalid_value", tuple(invalid), True)

    if _all_zero(values):
        if not zero_is_plausible(name):
            add("all_zero", ("energy_kcal", "protein_g", "fat_g", "carbohydrate_g"), True)
        return issues

    broken = _is_broken_import(values)
    if broken:
        add("broken_import", ("energy_kcal", "fat_g", "carbohydrate_g"), True)

    energy = _num(values, "energy_kcal")
    fat = _num(values, "fat_g")
    sat = _num(values, "fat_sat_g")
    carbs = _num(values, "carbohydrate_g")
    sugar = _num(values, "sugar_g")
    expected = atwater_kcal(values)

    if energy is not None and MAX_KCAL_PER_100G < energy <= MAX_KJ_PER_100G:
        add("energy_kj_as_kcal" if not broken else "energy_too_high", ("energy_kcal",), True)
    elif (
        not broken
        and energy
        and expected
        and expected > 20
        and abs(energy / KJ_PER_KCAL - expected) <= 0.15 * expected
        and abs(energy - expected) > 0.5 * expected
    ):
        add("energy_kj_as_kcal", ("energy_kcal",), True)
    elif not broken and not energy and expected is not None and expected > 5:
        add("energy_missing", ("energy_kcal",), True)
    elif (
        not broken
        and energy
        and expected is not None
        and not is_alcoholic(name)
        and abs(energy - expected) > max(40.0, 0.25 * expected)
    ):
        add("energy_mismatch", ("energy_kcal", "protein_g", "fat_g", "carbohydrate_g"), False)

    if not broken:
        if carbs is not None and carbs > 0 and sugar is not None and sugar > carbs + 0.5:
            add("sugar_gt_carbs", ("sugar_g", "carbohydrate_g"), False)
        if fat is not None and fat > 0 and sat is not None and sat > fat + 0.1:
            add("sat_fat_gt_fat", ("fat_sat_g", "fat_g"), False)

    macro_sum = sum(_num(values, field) or 0.0 for field in ("protein_g", "fat_g", "carbohydrate_g", "fibre_g"))
    if macro_sum > 105:
        add("macro_sum_gt_100", ("protein_g", "fat_g", "carbohydrate_g", "fibre_g"), False)

    if (
        energy
        and energy > 50
        and not is_alcoholic(name)
        and (fat is None or carbs is None or _num(values, "protein_g") is None)
    ):
        add("macros_missing", ("protein_g", "fat_g", "carbohydrate_g"), False)

    salt = _num(values, "salt_g")
    sodium = _num(values, "sodium_mg")
    if salt is not None and sodium is not None and (salt > 0.05 or sodium > 20):
        expected_sodium = salt * SODIUM_MG_PER_G_SALT
        if abs(sodium - expected_sodium) > max(20.0, 0.2 * expected_sodium):
            add("salt_sodium_mismatch", ("salt_g", "sodium_mg"), True)

    return issues


def _energy_tolerance(expected: float) -> float:
    return max(40.0, 0.25 * expected)


def net_carbs_if_total(values: Mapping[str, float | None], name: str) -> float | None:
    """Carbohydrates minus fibre when the stored value is US-style "total carbs" (incl. fibre).

    EU labels list carbohydrates without fibre, so a fibre-rich food with total carbs
    double counts the fibre. Only returns a value when the net value explains the data:
    the macro sum exceeds 100 g and the net sum does not, and the stated energy (if any)
    is at least as close to the Atwater energy of the net value as to the gross one.
    """
    protein, fat, carbs = (_num(values, f) for f in ("protein_g", "fat_g", "carbohydrate_g"))
    fibre = _num(values, "fibre_g")
    if protein is None or fat is None or carbs is None or not fibre or carbs < fibre:
        return None
    net = round(carbs - fibre, 1)
    sugar = _num(values, "sugar_g")
    if sugar is not None and sugar > net + 0.5:
        return None
    energy = _num(values, "energy_kcal")
    before = atwater_kcal(values)
    after = atwater_kcal({**values, "carbohydrate_g": net})
    if before is None or after is None:
        return None
    energy_fits_net = energy is None or is_alcoholic(name) or abs(energy - after) <= abs(energy - before)
    if protein + fat + carbs + fibre > MACRO_SUM_LIMIT >= protein + fat + net + fibre and energy_fits_net:
        return net
    if energy and not is_alcoholic(name):
        if abs(energy - before) > _energy_tolerance(before) and abs(energy - after) <= _energy_tolerance(after):
            return net
    return None


def propose_deterministic_repair(values: Mapping[str, float | None], *, name: str = "") -> dict[str, float | None]:
    """Return safe field changes. Never guesses values that need domain knowledge."""
    changes: dict[str, float | None] = {}
    current = dict(values)

    def set_value(field: str, value: float | None) -> None:
        if current.get(field) != value:
            changes[field] = value
            current[field] = value

    for field in NUTRITION_FIELDS:
        value = _num(current, field)
        if value is None:
            continue
        if value < 0 or (field in GRAM_FIELDS and value > 100) or (field == "energy_kcal" and value > MAX_KJ_PER_100G):
            set_value(field, None)

    if _all_zero(current) and not zero_is_plausible(name):
        # Placeholder zeros: the true values are unknown, not zero.
        for field in ("energy_kcal", "protein_g", "fat_g", "carbohydrate_g", "sugar_g", "fat_sat_g", "fibre_g"):
            if _num(current, field) == 0:
                set_value(field, None)
        return changes

    if _is_broken_import(current):
        # Column-shifted import: energy unit and the zeroed parents are unknown.
        set_value("energy_kcal", None)
        if _num(current, "fat_g") == 0 and (_num(current, "fat_sat_g") or 0) > 0:
            set_value("fat_g", None)
        if _num(current, "carbohydrate_g") == 0 and (_num(current, "sugar_g") or 0) > 0:
            set_value("carbohydrate_g", None)

    net_carbs = net_carbs_if_total(current, name)
    if net_carbs is not None:
        set_value("carbohydrate_g", net_carbs)

    protein, fat, carbs = (_num(current, f) for f in ("protein_g", "fat_g", "carbohydrate_g"))
    fibre = _num(current, "fibre_g") or 0.0
    if protein is not None and fat is not None and carbs:
        macro_sum = protein + fat + carbs + fibre
        if 105 < macro_sum <= MACRO_SUM_CLAMP_LIMIT:
            # Water and ash need at least ~1.5 g; shorten the (US-style) carbohydrates.
            clamped = round(max(_num(current, "sugar_g") or 0.0, 100 - protein - fat - fibre - 1.5), 1)
            if clamped < carbs:
                set_value("carbohydrate_g", clamped)
                expected_after = atwater_kcal(current)
                if expected_after is not None and _num(current, "energy_kcal"):
                    set_value("energy_kcal", round(expected_after, 1))

    energy = _num(current, "energy_kcal")
    expected = atwater_kcal(current)
    if (energy is not None and MAX_KCAL_PER_100G < energy <= MAX_KJ_PER_100G) or (
        energy
        and expected
        and expected > 20
        and abs(energy / KJ_PER_KCAL - expected) <= 0.15 * expected
        and abs(energy - expected) > 0.5 * expected
    ):
        set_value("energy_kcal", round(energy / KJ_PER_KCAL, 1))
    elif not energy and expected is not None and expected > 5:
        set_value("energy_kcal", round(expected, 1))

    salt = _num(current, "salt_g")
    sodium = _num(current, "sodium_mg")
    if salt and (sodium is None or abs(sodium - salt * SODIUM_MG_PER_G_SALT) > max(20.0, 0.2 * salt * 400)):
        # EU labels declare salt; sodium is derived from it.
        set_value("sodium_mg", round(salt * SODIUM_MG_PER_G_SALT, 1))
    elif not salt and sodium:
        set_value("salt_g", round(sodium / SODIUM_MG_PER_G_SALT, 3))

    return changes


# Findings that are physically impossible: saving is rejected. Everything else only warns.
HARD_ISSUE_CODES: frozenset[str] = frozenset({"invalid_value", "macro_sum_gt_100", "sugar_gt_carbs", "sat_fat_gt_fat"})


def check_nutrition_for_save(
    values: Mapping[str, float | None], *, name: str = ""
) -> tuple[list[NutritionIssue], list[NutritionIssue]]:
    """Split plausibility findings into ``(errors, warnings)`` for create/update endpoints."""
    errors: list[NutritionIssue] = []
    warnings: list[NutritionIssue] = []
    for issue in detect_nutrition_issues(values, name=name):
        (errors if issue.code in HARD_ISSUE_CODES else warnings).append(issue)
    return errors, warnings


def ingredient_nutrition_values(ingredient: object) -> dict[str, float | None]:
    """Read the nutrition fields from an ingredient-like object."""
    return {field: getattr(ingredient, field, None) for field in NUTRITION_FIELDS}
