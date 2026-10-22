"""Shopping plan of an event: trips with the demand allocated to them, cached per state."""

from __future__ import annotations

import copy
import dataclasses
import datetime as dt
import hashlib
from dataclasses import dataclass, field

from django.core.cache import cache
from django.db.models import Count, Max

from shopping.models import ShoppingAllocationRule, ShoppingList, ShoppingListItemSource
from supply.services.material_aggregation import MaterialRecipeRef, MaterialRequirement
from supply.services.shopping_service import (
    CollectedContributions,
    aggregate_contributions,
)
from supply.services.shopping_service import (
    ShoppingListItem as AggregatedIngredient,
)

from .allocation import Allocation, Hint, Part, PinnedShare, RuleInfo, TripInfo, allocate
from .demand import DemandUnit, build_demand, event_meal_plans

PLAN_CACHE_TIMEOUT_S = 60 * 60
PLAN_CACHE_VERSION = "v1"


@dataclass
class TripRow:
    """One ingredient or material line of a trip's allocated demand."""

    kind: str
    subject_id: int
    name: str
    ingredient: AggregatedIngredient | None = None
    material: MaterialRequirement | None = None
    rule_ids: list[int] = field(default_factory=list)
    spread_count: int = 1


@dataclass
class PlannedTrip:
    list_id: int
    name: str
    store_id: int | None
    store_name: str
    scheduled_at: dt.datetime | None
    status: str
    rows: list[TripRow]


@dataclass
class UncoveredRow:
    kind: str
    subject_id: int
    name: str
    quantity: float
    meal_id: int
    meal_label: str
    reason: str


@dataclass
class ShoppingPlan:
    event_id: int
    trips: list[PlannedTrip]
    uncovered: list[UncoveredRow]
    hints: list[Hint]
    stamp: str


@dataclass
class PlanState:
    """Everything needed to render or freeze the plan; never cached (it holds model instances)."""

    trips: list[ShoppingList]
    allocation: Allocation


def scale_part(part: Part) -> Part:
    """Part whose underlying contributions / requirement carry only the allocated share."""
    unit = part.unit
    ratio = part.ratio
    if ratio >= 1 - 1e-9:
        return part
    if unit.kind == "ingredient":
        scaled = [
            dataclasses.replace(
                c,
                weight_g=c.weight_g * ratio,
                raw_quantity=None if c.raw_quantity is None else c.raw_quantity * ratio,
            )
            for c in unit.contributions
        ]
        return Part(
            dataclasses.replace(unit, contributions=scaled, quantity=part.quantity), part.quantity, part.rule_id
        )
    requirement = unit.requirement
    assert requirement is not None
    scaled_requirement = MaterialRequirement(
        material=requirement.material,
        amount=part.quantity,
        recipes=[MaterialRecipeRef(r.id, r.title, r.slug, r.amount * ratio) for r in requirement.recipes],
    )
    return Part(
        dataclasses.replace(unit, requirement=scaled_requirement, quantity=part.quantity), part.quantity, part.rule_id
    )


def rows_for_parts(parts: list[Part]) -> list[TripRow]:
    """Aggregate the parts of one trip exactly like the shopping tab of a plan does."""
    scaled = [scale_part(p) for p in parts]
    rule_ids: dict[tuple[str, int], set[int]] = {}
    for part in scaled:
        if part.rule_id is not None:
            rule_ids.setdefault(part.unit.subject, set()).add(part.rule_id)

    contributions = [c for p in scaled if p.unit.kind == "ingredient" for c in p.unit.contributions]
    rows: list[TripRow] = []
    for item in aggregate_contributions(CollectedContributions(contributions=contributions, reserve_factor=1.0)):
        rows.append(
            TripRow(
                "ingredient",
                item.ingredient_id,
                item.ingredient_name,
                ingredient=item,
                rule_ids=sorted(rule_ids.get(("ingredient", item.ingredient_id), ())),
            )
        )

    materials: dict[int, MaterialRequirement] = {}
    for part in scaled:
        if part.unit.kind != "material" or part.unit.requirement is None:
            continue
        merged = materials.get(part.unit.subject_id)
        if merged is None:
            merged = MaterialRequirement(material=part.unit.requirement.material, amount=0, recipes=[])
            materials[part.unit.subject_id] = merged
        merged.amount += part.unit.requirement.amount
        for ref in part.unit.requirement.recipes:
            existing = next((r for r in merged.recipes if r.id == ref.id), None)
            if existing is None:
                merged.recipes.append(copy.copy(ref))
            else:
                existing.amount += ref.amount
    for subject_id, requirement in sorted(materials.items(), key=lambda kv: kv[1].material.name.lower()):
        rows.append(
            TripRow(
                "material",
                subject_id,
                requirement.material.name,
                material=requirement,
                rule_ids=sorted(rule_ids.get(("material", subject_id), ())),
            )
        )
    return rows


def pinned_shares(trip_ids: list[int]) -> list[PinnedShare]:
    """Quantities stored in the sources of created trips; they keep their demand."""
    if not trip_ids:
        return []
    totals: dict[tuple[int, int, str, int], float] = {}
    sources = ShoppingListItemSource.objects.filter(
        shopping_list_item__shopping_list_id__in=trip_ids, meal_id__isnull=False
    ).values_list(
        "shopping_list_item__shopping_list_id",
        "meal_id",
        "shopping_list_item__ingredient_id",
        "shopping_list_item__material_id",
        "quantity_g",
    )
    for trip_id, meal_id, ingredient_id, material_id, quantity in sources:
        if ingredient_id is not None:
            key = (trip_id, meal_id, "ingredient", ingredient_id)
        elif material_id is not None:
            key = (trip_id, meal_id, "material", material_id)
        else:
            continue
        totals[key] = totals.get(key, 0.0) + float(quantity or 0)
    return [PinnedShare(*key, quantity=quantity) for key, quantity in totals.items()]


def compute_state(event) -> PlanState:
    """Fresh, uncached allocation; used for the preview on a cache miss and when freezing a trip."""
    trips = list(ShoppingList.objects.filter(event=event).select_related("store").order_by("scheduled_at", "id"))
    rules = [
        RuleInfo(
            r.id,
            r.target_id,
            "ingredient" if r.ingredient_id else "material",
            r.ingredient_id or r.material_id,
            r.meal_id,
            r.quantity,
            r.created_at,
        )
        for r in ShoppingAllocationRule.objects.filter(event=event)
    ]
    demand = build_demand(event_meal_plans(event))
    trip_infos = [TripInfo(t.id, t.scheduled_at, t.materialized_at is not None) for t in trips]
    allocation = allocate(trip_infos, rules, demand, pinned_shares([t.id for t in trips if t.materialized_at]))
    return PlanState(trips=trips, allocation=allocation)


def _uncovered_rows(allocation: Allocation) -> list[UncoveredRow]:
    rows = []
    for entry in allocation.uncovered:
        unit: DemandUnit = entry.part.unit
        rows.append(
            UncoveredRow(
                unit.kind, unit.subject_id, unit.name, entry.part.quantity, unit.meal_id, unit.meal_label, entry.reason
            )
        )
    return rows


def plan_stamp(event) -> str:
    """Change marker of everything that feeds the plan; a few aggregate queries, no demand maths."""
    from event.models import EventMealPlanRelation
    from planner.models import MealPlan

    plan_ids = list(EventMealPlanRelation.objects.filter(event=event).values_list("meal_plan_id", flat=True))
    plans = MealPlan.objects.filter(id__in=plan_ids).aggregate(n=Count("id"), at=Max("updated_at"))
    trips = ShoppingList.objects.filter(event=event).aggregate(n=Count("id"), at=Max("updated_at"))
    rules = ShoppingAllocationRule.objects.filter(event=event).aggregate(n=Count("id"), at=Max("updated_at"))
    sources = ShoppingListItemSource.objects.filter(
        shopping_list_item__shopping_list__event=event, shopping_list_item__shopping_list__materialized_at__isnull=False
    ).count()
    return "|".join(
        str(part) for part in (plans["n"], plans["at"], trips["n"], trips["at"], rules["n"], rules["at"], sources)
    )


def build_shopping_plan(event) -> ShoppingPlan:
    stamp = plan_stamp(event)
    key = f"shopping-plan:{PLAN_CACHE_VERSION}:{event.id}:{hashlib.sha256(stamp.encode()).hexdigest()}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    state = compute_state(event)
    allocation = state.allocation
    rows_by_trip = {trip.id: rows_for_parts(allocation.by_trip[trip.id]) for trip in state.trips}

    spread: dict[tuple[str, int], int] = {}
    for rows in rows_by_trip.values():
        for row in rows:
            spread[(row.kind, row.subject_id)] = spread.get((row.kind, row.subject_id), 0) + 1
    for rows in rows_by_trip.values():
        for row in rows:
            row.spread_count = spread[(row.kind, row.subject_id)]

    plan = ShoppingPlan(
        event_id=event.id,
        trips=[
            PlannedTrip(
                list_id=trip.id,
                name=trip.name,
                store_id=trip.store_id,
                store_name=trip.store.name if trip.store else "",
                scheduled_at=trip.scheduled_at,
                status="created" if trip.materialized_at else "planned",
                rows=rows_by_trip[trip.id],
            )
            for trip in state.trips
        ],
        uncovered=_uncovered_rows(allocation),
        hints=allocation.hints,
        stamp=stamp,
    )
    cache.set(key, plan, PLAN_CACHE_TIMEOUT_S)
    return plan
