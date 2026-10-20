"""Own-brand order quantity per article: net demand, grid, rounding on the started step (BEM-02/03/04)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Final

from ruebert.domain.derivation import Derivation, DerivationStep, format_int, week_label
from ruebert.domain.traffic_light import ForecastWeek, forecast_within

ROUNDING_QUESTION: Final = "Q-050"


@dataclass(frozen=True)
class OrderSettings:
    order_step: int = 5_000
    min_quantity: int = 5_000
    rounding_threshold: float = 0.8
    min_stock: int = 30
    lead_time_weeks: int = 12
    overstock_weeks: int = 130


DEFAULT_SETTINGS: Final = OrderSettings()


@dataclass(frozen=True)
class ArticlePlan:
    sku: str
    net_demand: float
    rounded_quantity: int
    lead_time_need: float  # demand until goods arrive: below this a cut would cause a stock-out
    warnings: tuple[str, ...]
    derivation: Derivation


def is_allowed_quantity(quantity: int, settings: OrderSettings = DEFAULT_SETTINGS) -> bool:
    """0, or a multiple of the step that is at least the minimum quantity."""
    return quantity == 0 or (quantity >= settings.min_quantity and quantity % settings.order_step == 0)


def round_on_started_step(net_demand: float, settings: OrderSettings = DEFAULT_SETTINGS) -> int:
    """Round within the started step: up if remainder ÷ step ≥ threshold, else down; ≥ minimum once ordered.

    18,000 → 15,000 · 20,207 → 20,000 · 24,100 → 25,000 (threshold 80 %). Demand above zero never
    drops to nothing: a remainder that rounds down to 0 becomes the minimum quantity.
    """
    if net_demand <= 0:
        return 0
    step = settings.order_step
    whole_steps = int(net_demand // step)
    remainder = (net_demand - whole_steps * step) / step
    steps = whole_steps + (1 if remainder >= settings.rounding_threshold else 0)
    return max(steps * step, settings.min_quantity)


def target_week_of(year: int, iso_week: int) -> date:
    """Monday of an ISO week, e.g. (2027, 39) for the default target KW 39/2027."""
    return date.fromisocalendar(year, iso_week, 1)


def plan_article(
    sku: str,
    stock: float,
    forecast: list[ForecastWeek],
    reference_date: date,
    target_week: date,
    settings: OrderSettings = DEFAULT_SETTINGS,
) -> ArticlePlan:
    """Net demand = forecast up to and including the target week + minimum stock − stock.

    The forecast already contains demand through sets (v1 trains on total sales); it is not added again.
    """
    demand = sum(w.quantity for w in forecast if reference_date <= w.week_start <= target_week)
    net = max(demand + settings.min_stock - stock, 0.0)
    rounded = round_on_started_step(net, settings)
    lead_demand = forecast_within(forecast, reference_date, settings.lead_time_weeks)
    lead_need = max(lead_demand + settings.min_stock - stock, 0.0)

    steps = [
        DerivationStep("demand", f"Prognose bis {week_label(target_week)}", demand, demand),
        DerivationStep("min_stock", "Mindestbestand", settings.min_stock, demand + settings.min_stock),
        DerivationStep("stock", "Bestand zum Stichtag", -stock, demand + settings.min_stock - stock),
        DerivationStep(
            "net",
            "Netto-Bedarf",
            net - (demand + settings.min_stock - stock),
            net,
            "nicht unter 0" if net == 0 else "",
        ),
        DerivationStep(
            "rounding",
            "Rundung auf den angebrochenen 5.000er-Schritt",
            rounded - net,
            float(rounded),
            f"Schwelle {settings.rounding_threshold:.0%}",
            ROUNDING_QUESTION,
        ),
    ]

    warnings: list[str] = []
    if stock - settings.min_stock < lead_demand:
        warnings.append(
            f"Bestand reicht nicht bis zum Wareneingang nach {settings.lead_time_weeks} Wochen Lieferzeit (BEM-06)."
        )
    long_demand = forecast_within(forecast, reference_date, settings.overstock_weeks)
    if rounded > long_demand and rounded > 0:
        warnings.append(
            f"Menge {format_int(rounded)} übersteigt die Prognose der nächsten {settings.overstock_weeks} "
            f"Wochen ({format_int(long_demand)}) – Überbestand (BEM-10)."
        )
    return ArticlePlan(sku, net, rounded, lead_need, tuple(warnings), Derivation(tuple(steps)))
