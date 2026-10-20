"""Business parameters shown on the settings page: definitions, defaults, validation (spec app-settings)."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from typing import Final

from ruebert.domain.ordering import OrderSettings
from ruebert.domain.traffic_light import LightSettings

Value = int | float


@dataclass(frozen=True)
class ParameterDef:
    key: str
    label: str
    help: str
    unit: str
    default: Value
    minimum: Value
    maximum: Value
    question_id: str | None = None  # None = bestätigt
    integer: bool = True
    multiple_of: int | None = None


PARAMETERS: Final[tuple[ParameterDef, ...]] = (
    ParameterDef(
        "lead_time_weeks",
        "Lieferzeit",
        "Wochen von der Bestellung bis zum Wareneingang (Eigenmarke).",
        "Wochen",
        12,
        1,
        52,
        "Q-080",
    ),
    ParameterDef(
        "planning_window_weeks",
        "Planungsfenster",
        "Wochen nach Ablauf der Lieferzeit, in denen ein Artikel gelb ist.",
        "Wochen",
        8,
        1,
        52,
        "Q-080",
    ),
    ParameterDef(
        "overstock_weeks",
        "Überbestand ab",
        "Bestand über der Prognose dieser Wochen gilt als Überbestand (blau).",
        "Wochen",
        130,
        26,
        260,
        "Q-080",
    ),
    ParameterDef(
        "rounding_threshold_percent",
        "Rundungsschwelle",
        "Ab diesem Anteil des angebrochenen 5.000er-Schritts wird aufgerundet.",
        "%",
        80,
        1,
        100,
        "Q-050",
        integer=False,
    ),
    ParameterDef("min_stock", "Mindestbestand", "Stück, die nie unterschritten werden sollen.", "Stück", 30, 0, 10_000),
    ParameterDef(
        "order_step",
        "Bestellraster",
        "Erlaubte Mengen sind Vielfache dieses Rasters (zugleich Mindestmenge).",
        "Stück",
        5_000,
        1_000,
        50_000,
        multiple_of=1_000,
    ),
    ParameterDef(
        "tranche_size",
        "Stufengröße",
        "Die Gesamtbestellung ist ein Vielfaches dieser Stufe.",
        "Stück",
        60_000,
        5_000,
        600_000,
        "Q-044",
        multiple_of=5_000,
    ),
    ParameterDef(
        "target_year",
        "Zieltermin: Jahr",
        "Jahr der Zielwoche, bis zu der der Bedarf geplant wird.",
        "Jahr",
        2027,
        2026,
        2035,
    ),
    ParameterDef("target_week", "Zieltermin: Kalenderwoche", "ISO-Kalenderwoche des Zieltermins.", "KW", 39, 1, 53),
)
BY_KEY: Final = {p.key: p for p in PARAMETERS}


class InvalidParameterError(ValueError):
    """The value is not allowed; the message is German and meant for the field."""


def validate(key: str, value: object) -> Value:
    definition = BY_KEY.get(key)
    if definition is None:
        raise InvalidParameterError(f"Unbekannte Einstellung „{key}“.")
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise InvalidParameterError(f"{definition.label}: Bitte eine Zahl eingeben.")
    if definition.integer and float(value) != int(value):
        raise InvalidParameterError(f"{definition.label}: Bitte eine ganze Zahl eingeben.")
    number: Value = int(value) if definition.integer else float(value)
    if not definition.minimum <= number <= definition.maximum:
        raise InvalidParameterError(
            f"{definition.label}: Der Wert muss zwischen {definition.minimum} und {definition.maximum} "
            f"{definition.unit} liegen."
        )
    if definition.multiple_of and number % definition.multiple_of != 0:
        raise InvalidParameterError(
            f"{definition.label}: Der Wert muss ein Vielfaches von {definition.multiple_of} sein."
        )
    return number


def effective_values(journal_values: Mapping[str, object]) -> dict[str, Value]:
    """Defaults overlaid with valid journal values. A stale invalid journal value falls back to the default."""
    values: dict[str, Value] = {p.key: p.default for p in PARAMETERS}
    for key, raw in journal_values.items():
        try:
            values[key] = validate(key, raw)
        except InvalidParameterError:
            continue
    return values


def light_settings(values: dict[str, Value]) -> LightSettings:
    return LightSettings(
        lead_time_weeks=int(values["lead_time_weeks"]),
        planning_window_weeks=int(values["planning_window_weeks"]),
        overstock_weeks=int(values["overstock_weeks"]),
        min_stock=int(values["min_stock"]),
    )


def order_settings(values: dict[str, Value]) -> OrderSettings:
    return OrderSettings(
        order_step=int(values["order_step"]),
        min_quantity=int(values["order_step"]),
        rounding_threshold=float(values["rounding_threshold_percent"]) / 100,
        min_stock=int(values["min_stock"]),
        lead_time_weeks=int(values["lead_time_weeks"]),
        overstock_weeks=int(values["overstock_weeks"]),
    )


def target_week(values: dict[str, Value]) -> date:
    """Monday of the target week; a week 53 that does not exist in that year falls back to week 52."""
    year, week = int(values["target_year"]), int(values["target_week"])
    try:
        return date.fromisocalendar(year, week, 1)
    except ValueError:
        return date.fromisocalendar(year, 52, 1)
