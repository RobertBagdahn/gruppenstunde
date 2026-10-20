"""Order traffic light: stock-out week, colour by order window, recommendation (spec order-traffic-light)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Final, Literal

from ruebert.domain.derivation import Derivation, DerivationStep, format_int, week_label

Colour = Literal["red", "yellow", "green", "blue"]

SPECIAL_SKUS: Final = frozenset({"DGW158", "DGWADV", "DGWADV2"})
THRESHOLD_QUESTION: Final = "Q-080"


@dataclass(frozen=True)
class LightSettings:
    lead_time_weeks: int = 12
    planning_window_weeks: int = 8
    overstock_weeks: int = 130
    min_stock: int = 30


@dataclass(frozen=True)
class ForecastWeek:
    week_start: date
    quantity: float


@dataclass(frozen=True)
class Recommendation:
    order_by_week: date
    text: str


@dataclass(frozen=True)
class TrafficLight:
    sku: str
    colour: Colour
    is_special: bool
    stockout_week: date | None
    stockout_label: str
    recommendation: Recommendation | None
    derivation: Derivation


def is_special(sku: str) -> bool:
    return sku in SPECIAL_SKUS


def stockout_week(stock: float, forecast: list[ForecastWeek], min_stock: int) -> date | None:
    """First week whose cumulative forecast exceeds stock minus the minimum stock; None if never."""
    available = stock - min_stock
    cumulative = 0.0
    for week in sorted(forecast, key=lambda w: w.week_start):
        cumulative += week.quantity
        if cumulative > available:
            return week.week_start
    return None


def forecast_within(forecast: list[ForecastWeek], reference_date: date, weeks: int) -> float:
    end = reference_date + timedelta(weeks=weeks)
    return sum(w.quantity for w in forecast if reference_date <= w.week_start < end)


def classify(
    sku: str,
    stock: float,
    forecast: list[ForecastWeek],
    reference_date: date,
    settings: LightSettings,
    suggested_quantity: int | None = None,
) -> TrafficLight:
    """Colour an article. `suggested_quantity` (the planner's quantity) only feeds the recommendation text."""
    forecast = [w for w in forecast if w.week_start >= reference_date]  # v1 keeps a few past weeks
    out_week = stockout_week(stock, forecast, settings.min_stock)
    red_before = reference_date + timedelta(weeks=settings.lead_time_weeks)
    yellow_before = red_before + timedelta(weeks=settings.planning_window_weeks)
    overstock_demand = forecast_within(forecast, reference_date, settings.overstock_weeks)

    if out_week is not None and out_week < red_before:
        colour: Colour = "red"
    elif out_week is not None and out_week < yellow_before:
        colour = "yellow"
    elif stock > overstock_demand and stock > settings.min_stock:
        colour = "blue"
    else:
        colour = "green"

    label = "reicht über den Horizont" if out_week is None else week_label(out_week)
    steps = (
        DerivationStep("stock", "Bestand zum Stichtag", stock, stock, f"Stichtag {week_label(reference_date)}"),
        DerivationStep("min_stock", "Mindestbestand", -settings.min_stock, stock - settings.min_stock),
        DerivationStep(
            "stockout",
            "Ausverkaufswoche",
            0.0,
            stock - settings.min_stock,
            label,
        ),
        DerivationStep(
            "lead_time",
            "Lieferzeit",
            0.0,
            float(settings.lead_time_weeks),
            f"{settings.lead_time_weeks} Wochen; rot vor {week_label(red_before)}",
            THRESHOLD_QUESTION,
        ),
        DerivationStep(
            "planning_window",
            "Planungsfenster",
            0.0,
            float(settings.planning_window_weeks),
            f"{settings.planning_window_weeks} Wochen; gelb vor {week_label(yellow_before)}",
            THRESHOLD_QUESTION,
        ),
        DerivationStep(
            "overstock",
            "Überbestand ab",
            0.0,
            overstock_demand,
            f"Prognose der nächsten {settings.overstock_weeks} Wochen: {format_int(overstock_demand)}",
            THRESHOLD_QUESTION,
        ),
    )

    recommendation = None
    if colour in ("red", "yellow") and out_week is not None:
        order_by = out_week - timedelta(weeks=settings.lead_time_weeks)
        text = f"Bis {week_label(order_by)} bestellen"
        if suggested_quantity:
            text += f" · ca. {format_int(suggested_quantity)} Tüten"
        recommendation = Recommendation(order_by, text)

    return TrafficLight(sku, colour, is_special(sku), out_week, label, recommendation, Derivation(steps))
