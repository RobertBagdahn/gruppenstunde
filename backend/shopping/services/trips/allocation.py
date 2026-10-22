"""Distribute the demand of an event over its shopping trips.

Pure functions only (no database access), so every rule can be unit-tested with plain objects.
Order of precedence: pinned shares of created trips, then manual rules, then the date default.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

from .demand import DemandUnit, SubjectKey

EPSILON = 1e-6

HINT_AFTER_MEAL = "after_meal"
HINT_RULE_EXCEEDS_DEMAND = "rule_exceeds_demand"
HINT_NO_TIME = "no_time"

UNCOVERED_BEFORE_FIRST_TRIP = "before_first_trip"
UNCOVERED_NO_TIME = "no_time"
UNCOVERED_NO_TRIPS = "no_trips"


@dataclass(frozen=True)
class TripInfo:
    id: int
    scheduled_at: dt.datetime | None
    is_created: bool


@dataclass(frozen=True)
class RuleInfo:
    id: int
    target_id: int
    kind: str
    subject_id: int
    meal_id: int | None
    quantity: float | None
    created_at: dt.datetime

    @property
    def subject(self) -> SubjectKey:
        return (self.kind, self.subject_id)


@dataclass(frozen=True)
class PinnedShare:
    """Quantity a created trip stored for one `(meal, subject)` in its sources."""

    trip_id: int
    meal_id: int
    kind: str
    subject_id: int
    quantity: float


@dataclass
class Part:
    """Share of a DemandUnit that lands in one trip."""

    unit: DemandUnit
    quantity: float
    rule_id: int | None = None
    pinned: bool = False

    @property
    def ratio(self) -> float:
        return self.quantity / self.unit.quantity if self.unit.quantity else 0.0


@dataclass
class UncoveredPart:
    part: Part
    reason: str


@dataclass
class Hint:
    kind: str
    message: str
    meal_id: int | None = None
    trip_id: int | None = None
    rule_id: int | None = None
    kind_subject: SubjectKey | None = None


@dataclass
class Allocation:
    by_trip: dict[int, list[Part]] = field(default_factory=dict)
    uncovered: list[UncoveredPart] = field(default_factory=list)
    hints: list[Hint] = field(default_factory=list)


def _need_sort_key(unit: DemandUnit) -> tuple[int, dt.datetime | int, int]:
    # Units without a time go last
    if unit.need_at is None:
        return (1, 0, unit.meal_id)
    return (0, unit.need_at, unit.meal_id)


def _default_trip(trips: list[TripInfo], need_at: dt.datetime) -> TripInfo | None:
    eligible = [t for t in trips if t.scheduled_at is not None and t.scheduled_at <= need_at]
    if not eligible:
        return None
    # Latest start wins; on equal times the trip created first (smallest id)
    return max(eligible, key=lambda t: (t.scheduled_at, -t.id))


def _split_pinned(shares: list[PinnedShare], total: float) -> list[tuple[int, float]]:
    """Pinned trips keep their stored quantity; the last one absorbs growth or shrinkage."""
    ordered = sorted(shares, key=lambda s: s.trip_id)
    result: list[tuple[int, float]] = []
    remaining = total
    for index, share in enumerate(ordered):
        is_last = index == len(ordered) - 1
        take = remaining if is_last else min(share.quantity, remaining)
        if take > EPSILON:
            result.append((share.trip_id, take))
        remaining -= take
    return result


def allocate(
    trips: list[TripInfo],
    rules: list[RuleInfo],
    demand: list[DemandUnit],
    pinned: list[PinnedShare] | None = None,
) -> Allocation:
    trip_by_id = {t.id: t for t in trips}
    result = Allocation(by_trip={t.id: [] for t in trips})
    remaining = {id(unit): unit.quantity for unit in demand}
    units = sorted(demand, key=_need_sort_key)

    pins: dict[tuple[int, str, int], list[PinnedShare]] = {}
    for share in pinned or []:
        pins.setdefault((share.meal_id, share.kind, share.subject_id), []).append(share)

    for unit in units:
        shares = pins.get(unit.key)
        if not shares:
            continue
        for trip_id, quantity in _split_pinned(shares, unit.quantity):
            if trip_id in result.by_trip:
                result.by_trip[trip_id].append(Part(unit, quantity, pinned=True))
        remaining[id(unit)] = 0.0

    ordered_rules = sorted(rules, key=lambda r: (r.meal_id is None, r.created_at, r.id))
    for rule in ordered_rules:
        target = trip_by_id.get(rule.target_id)
        if target is None:
            continue
        _apply_rule(rule, target, units, remaining, result)

    for unit in units:
        left = remaining[id(unit)]
        if left <= EPSILON:
            continue
        if unit.need_at is None:
            result.uncovered.append(UncoveredPart(Part(unit, left), UNCOVERED_NO_TIME))
            continue
        trip = _default_trip(trips, unit.need_at)
        if trip is not None:
            result.by_trip[trip.id].append(Part(unit, left))
            continue
        reason = UNCOVERED_BEFORE_FIRST_TRIP if any(t.scheduled_at is not None for t in trips) else UNCOVERED_NO_TRIPS
        result.uncovered.append(UncoveredPart(Part(unit, left), reason))

    _add_no_time_hints(result)
    return result


def _apply_rule(
    rule: RuleInfo,
    target: TripInfo,
    units: list[DemandUnit],
    remaining: dict[int, float],
    result: Allocation,
) -> None:
    budget = rule.quantity
    flagged_after_meal: set[tuple[int, SubjectKey]] = set()

    for unit in units:
        if unit.subject != rule.subject or (rule.meal_id is not None and unit.meal_id != rule.meal_id):
            continue
        left = remaining[id(unit)]
        if left <= EPSILON:
            continue
        if budget is None:
            take = left
        else:
            if budget <= EPSILON:
                break
            take = min(left, budget)
            if take < left:
                # Whole grams / pieces; the rest stays with the default trip so the sum is kept
                take = float(round(take))
                if take <= 0:
                    break
            budget -= take
        remaining[id(unit)] = left - take
        result.by_trip[target.id].append(Part(unit, take, rule_id=rule.id))

        marker = (unit.meal_id, unit.subject)
        if (
            marker not in flagged_after_meal
            and unit.need_at is not None
            and target.scheduled_at is not None
            and target.scheduled_at > unit.need_at
        ):
            flagged_after_meal.add(marker)
            result.hints.append(
                Hint(
                    HINT_AFTER_MEAL,
                    "Einkauf liegt nach der Mahlzeit",
                    meal_id=unit.meal_id,
                    trip_id=target.id,
                    rule_id=rule.id,
                    kind_subject=unit.subject,
                )
            )

    if budget is not None and budget > 0.5:
        result.hints.append(
            Hint(
                HINT_RULE_EXCEEDS_DEMAND,
                "Regel größer als Bedarf",
                trip_id=target.id,
                rule_id=rule.id,
                kind_subject=rule.subject,
            )
        )


def _add_no_time_hints(result: Allocation) -> None:
    seen: set[int] = set()
    for entry in result.uncovered:
        if entry.reason != UNCOVERED_NO_TIME or entry.part.unit.meal_id in seen:
            continue
        seen.add(entry.part.unit.meal_id)
        unit = entry.part.unit
        result.hints.append(
            Hint(
                HINT_NO_TIME,
                f"{unit.meal_label}: Mahlzeit ohne Uhrzeit – keinem Einkauf zugeordnet",
                meal_id=unit.meal_id,
            )
        )
