"""Distribute the own-brand order onto a 60k tranche by marginal benefit (BEM-11, design decision 4).

Benefit of a step = units of real demand (net demand up to the target week) that it covers; for
removal, the units that would be left uncovered. Ties resolve by higher weekly forecast, then SKU, so
the result is deterministic. Without true quantiles this is an approximation (PRG-04).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final

from ruebert.domain.derivation import format_int
from ruebert.domain.ordering import DEFAULT_SETTINGS, OrderSettings

TRANCHE: Final = 60_000


@dataclass(frozen=True)
class AllocationItem:
    sku: str
    net_demand: float
    rounded_quantity: int
    lead_time_need: float
    weekly_forecast: float = 0.0


@dataclass(frozen=True)
class Adjustment:
    sku: str
    delta: int
    reason: str


@dataclass(frozen=True)
class Allocation:
    tranche: int
    quantities: dict[str, int]
    adjustments: list[Adjustment] = field(default_factory=lambda: [])
    unresolved: int = 0  # units still missing (>0) or too many (<0) when no step was allowed any more

    @property
    def total(self) -> int:
        return sum(self.quantities.values())


def nearest_tranche(total: int, size: int = TRANCHE) -> int:
    """The multiple of `size` nearest to the total (at least one tranche); a tie goes up."""
    lower = max(total // size, 1) * size
    return lower + size if total - lower >= size / 2 else lower


def neighbouring_tranches(tranche: int, size: int = TRANCHE) -> list[int]:
    return [t for t in (tranche - size, tranche, tranche + size) if t >= size]


def _covered(item: AllocationItem, quantity: int) -> float:
    return min(float(quantity), item.net_demand)


def _lowest_allowed(item: AllocationItem, settings: OrderSettings) -> int:
    """Never below the demand until goods arrive (on the grid); 0 only if no demand arrives before goods."""
    if item.lead_time_need <= 0:
        return 0
    step = settings.order_step
    on_grid = -(-int(item.lead_time_need) // step) * step
    return max(on_grid, settings.min_quantity)


def _up(quantity: int, settings: OrderSettings) -> int:
    return settings.min_quantity if quantity == 0 else quantity + settings.order_step


def _down(quantity: int, settings: OrderSettings) -> int:
    return 0 if quantity <= settings.min_quantity else quantity - settings.order_step


def allocate(items: list[AllocationItem], tranche: int, settings: OrderSettings = DEFAULT_SETTINGS) -> Allocation:
    """Add or remove order steps until the total equals `tranche`; every change is explained."""
    quantities = {item.sku: item.rounded_quantity for item in items}
    start = dict(quantities)
    total = sum(quantities.values())

    while total != tranche:
        if total < tranche:
            ranked = [
                (
                    -(_covered(i, _up(quantities[i.sku], settings)) - _covered(i, quantities[i.sku])),
                    -i.weekly_forecast,
                    i.sku,
                )
                for i in items
            ]
        else:
            ranked = [
                (
                    _covered(i, quantities[i.sku]) - _covered(i, _down(quantities[i.sku], settings)),
                    i.weekly_forecast,
                    i.sku,
                )
                for i in items
                if quantities[i.sku] > 0 and _down(quantities[i.sku], settings) >= _lowest_allowed(i, settings)
            ]
        if not ranked:
            break
        sku = min(ranked)[2]
        before = quantities[sku]
        quantities[sku] = _up(before, settings) if total < tranche else _down(before, settings)
        total += quantities[sku] - before

    adjustments: list[Adjustment] = []
    for sku in sorted(quantities):
        delta = quantities[sku] - start[sku]
        if delta == 0:
            continue
        sign, benefit = ("+", "höchster") if delta > 0 else ("−", "kleinster")
        reason = f"{sign}{format_int(abs(delta))} durch Tranche ({benefit} Grenznutzen)"
        adjustments.append(Adjustment(sku, delta, reason))
    return Allocation(tranche, quantities, adjustments, tranche - total)
