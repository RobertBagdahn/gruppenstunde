"""Order plan for the own brand: per-article plans, tranche allocation, one derivation per row (BEM-08/11)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from ruebert.domain.allocation import (
    TRANCHE,
    Allocation,
    AllocationItem,
    allocate,
    nearest_tranche,
    neighbouring_tranches,
)
from ruebert.domain.derivation import Derivation, DerivationStep
from ruebert.domain.ordering import DEFAULT_SETTINGS, ArticlePlan, OrderSettings, plan_article
from ruebert.domain.traffic_light import ForecastWeek, is_special


@dataclass(frozen=True)
class PlanInput:
    sku: str
    stock: float
    forecast: list[ForecastWeek]
    is_set: bool = False


@dataclass(frozen=True)
class PlanRow:
    sku: str
    suggested_quantity: int  # Rübert's suggestion after the tranche
    quantity: int  # equals the suggestion; manual changes are journal overrides on top
    adjustment: int
    warnings: tuple[str, ...]
    derivation: Derivation


@dataclass(frozen=True)
class OrderPlan:
    target_week: date
    tranche: int
    tranche_options: tuple[int, ...]
    rows: list[PlanRow]
    special: list[PlanInput]  # listed separately, not part of the tranche
    unresolved: int

    @property
    def total(self) -> int:
        return sum(row.quantity for row in self.rows)


def build_order_plan(
    inputs: list[PlanInput],
    reference_date: date,
    target_week: date,
    tranche: int | None = None,
    settings: OrderSettings = DEFAULT_SETTINGS,
    tranche_size: int = TRANCHE,
) -> OrderPlan:
    """Sets are planned through their components and special articles stay out of the tranche."""
    special = [i for i in inputs if is_special(i.sku) and not i.is_set]
    regular = [i for i in inputs if not i.is_set and not is_special(i.sku)]
    plans: dict[str, ArticlePlan] = {
        i.sku: plan_article(i.sku, i.stock, i.forecast, reference_date, target_week, settings) for i in regular
    }
    items = [
        AllocationItem(
            sku=i.sku,
            net_demand=plans[i.sku].net_demand,
            rounded_quantity=plans[i.sku].rounded_quantity,
            lead_time_need=plans[i.sku].lead_time_need,
            weekly_forecast=sum(w.quantity for w in i.forecast if w.week_start >= reference_date)
            / max(len([w for w in i.forecast if w.week_start >= reference_date]), 1),
        )
        for i in sorted(regular, key=lambda x: x.sku)
    ]
    rounded_total = sum(item.rounded_quantity for item in items)
    chosen = tranche if tranche is not None else nearest_tranche(rounded_total, tranche_size)
    allocation: Allocation = allocate(items, chosen, settings)
    adjustment_reasons = {a.sku: a for a in allocation.adjustments}

    rows: list[PlanRow] = []
    for item in items:
        plan = plans[item.sku]
        final = allocation.quantities[item.sku]
        adjustment = adjustment_reasons.get(item.sku)
        derivation = plan.derivation
        if adjustment is not None:
            derivation = derivation.extended(
                DerivationStep("tranche", "Anpassung an die Tranche", adjustment.delta, float(final), adjustment.reason)
            )
        rows.append(PlanRow(item.sku, final, final, adjustment.delta if adjustment else 0, plan.warnings, derivation))
    tranche_options = tuple(neighbouring_tranches(chosen, tranche_size))
    return OrderPlan(target_week, chosen, tranche_options, rows, special, allocation.unresolved)
