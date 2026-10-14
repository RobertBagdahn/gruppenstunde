"""Single source for the value ranges of meal plan inputs (openspec `meal-plan-input-guardrails`).

Pydantic schemas and services use these constants and checks; the Food-Frontend mirrors them in
`frontend-food/src/lib/mealPlanBounds.ts` and a backend test keeps both files equal.
Violations raise ``ValueError`` with a German message that names the allowed range.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Mapping

RESERVE_FACTOR_MIN = 1.0
RESERVE_FACTOR_MAX = 2.0
ACTIVITY_FACTOR_MIN = 1.0
ACTIVITY_FACTOR_MAX = 2.5
DAY_PART_FACTOR_MIN = 0.0
DAY_PART_FACTOR_MAX = 1.0
DAY_PART_FACTORS_SUM_MAX = 1.5
NORM_PORTIONS_MIN_EXCLUSIVE = 0.0
NORM_PORTIONS_MAX = 1000.0
OVERRIDE_PORTIONS_MIN = 1
OVERRIDE_PORTIONS_MAX = 1000
MEAL_ITEM_FACTOR_MAX = 100.0
QUANTITY_GRAMS_MAX = 100_000.0
QUANTITY_COUNT_MAX = 100_000.0
PORTION_WEIGHT_G_MAX = 100_000.0
PLAN_MAX_DAYS = 60
PLAN_MAX_MEALS = 500


def _de(value: float) -> str:
    """German number text: 1.0 -> "1,0", 100000 -> "100.000"."""
    if float(value).is_integer() and abs(value) >= 1000:
        return f"{int(value):,}".replace(",", ".")
    text = f"{value:g}"
    if "." not in text and abs(value) < 1000 and isinstance(value, float):
        text = f"{value:.1f}"
    return text.replace(".", ",")


def check_between(value: float, low: float, high: float, label: str) -> float:
    if not (low <= value <= high):
        raise ValueError(f"{label} muss zwischen {_de(low)} und {_de(high)} liegen.")
    return value


def check_reserve_factor(value: float) -> float:
    return check_between(value, RESERVE_FACTOR_MIN, RESERVE_FACTOR_MAX, "Der Reservefaktor")


def check_activity_factor(value: float) -> float:
    return check_between(value, ACTIVITY_FACTOR_MIN, ACTIVITY_FACTOR_MAX, "Der Aktivitätsfaktor")


def check_day_part_factor(value: float) -> float:
    return check_between(value, DAY_PART_FACTOR_MIN, DAY_PART_FACTOR_MAX, "Der Tagesanteil")


def check_day_part_factors(values: Mapping[str, float]) -> dict[str, float]:
    for factor in values.values():
        check_day_part_factor(factor)
    if sum(values.values()) > DAY_PART_FACTORS_SUM_MAX:
        raise ValueError(f"Die Tagesanteile dürfen zusammen höchstens {_de(DAY_PART_FACTORS_SUM_MAX)} ergeben.")
    return dict(values)


def check_norm_portions(value: float) -> float:
    if not (NORM_PORTIONS_MIN_EXCLUSIVE < value <= NORM_PORTIONS_MAX):
        raise ValueError(f"Die Normportionen müssen größer 0 und höchstens {_de(NORM_PORTIONS_MAX)} sein.")
    return value


def check_override_portions(value: int | None) -> int | None:
    if value is None:
        return value
    if not (OVERRIDE_PORTIONS_MIN <= value <= OVERRIDE_PORTIONS_MAX):
        raise ValueError(f"Die Portionen müssen zwischen {OVERRIDE_PORTIONS_MIN} und {OVERRIDE_PORTIONS_MAX} liegen.")
    return value


def check_meal_item_factor(value: float) -> float:
    if not (0 < value <= MEAL_ITEM_FACTOR_MAX):
        raise ValueError(f"Der Faktor muss größer 0 und höchstens {_de(MEAL_ITEM_FACTOR_MAX)} sein.")
    return value


def check_quantity_count(value: float) -> float:
    if not (0 < value <= QUANTITY_COUNT_MAX):
        raise ValueError(f"Die Menge muss größer 0 und höchstens {_de(QUANTITY_COUNT_MAX)} sein.")
    return value


def check_quantity_grams(grams: float | None) -> float | None:
    """Upper bound of the resolved gram amount; unknown weights are not checked here."""
    if grams is not None and grams > QUANTITY_GRAMS_MAX:
        raise ValueError(f"Die Menge darf höchstens {_de(QUANTITY_GRAMS_MAX)} g ergeben.")
    return grams


def check_portion_weight_g(value: float) -> float:
    if not (0 < value <= PORTION_WEIGHT_G_MAX):
        raise ValueError(f"Das Portionsgewicht muss größer 0 und höchstens {_de(PORTION_WEIGHT_G_MAX)} g sein.")
    return value


def plan_length_days(start: dt.datetime | None, end: dt.datetime | None) -> int | None:
    if start is None or end is None:
        return None
    return (end.date() - start.date()).days + 1


def check_plan_period(start: dt.datetime | None, end: dt.datetime | None) -> None:
    days = plan_length_days(start, end)
    if days is not None and days > PLAN_MAX_DAYS:
        raise ValueError(f"Ein Plan darf höchstens {PLAN_MAX_DAYS} Tage umfassen.")


def check_meal_count(current_count: int, adding: int = 1) -> None:
    if current_count + adding > PLAN_MAX_MEALS:
        raise ValueError(f"Ein Plan darf höchstens {PLAN_MAX_MEALS} Mahlzeiten enthalten.")


def clamp_reserve_factor(value: float | None) -> float:
    """Runtime guard for stored values: out-of-range or missing values fall back into the range."""
    if value is None:
        return RESERVE_FACTOR_MIN
    return min(max(float(value), RESERVE_FACTOR_MIN), RESERVE_FACTOR_MAX)


def clamp_activity_factor(value: float | None) -> float:
    if value is None:
        return ACTIVITY_FACTOR_MIN
    return min(max(float(value), ACTIVITY_FACTOR_MIN), ACTIVITY_FACTOR_MAX)


def clamp_day_part_factor(value: float | None) -> float:
    if value is None:
        return DAY_PART_FACTOR_MIN
    return min(max(float(value), DAY_PART_FACTOR_MIN), DAY_PART_FACTOR_MAX)
