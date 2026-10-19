"""API endpoints for event shopping trips: stores, event overview, plan, trips and allocation rules."""

from typing import Literal  # noqa: F401

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from ninja import Router, Status
from ninja.errors import HttpError

from content.api.helpers import paginate_queryset
from core.permissions import require_login

from .models import ShoppingAllocationRule, ShoppingList, Store
from .schemas import (
    AllocationRuleIn,
    AllocationRuleOut,
    HintOut,
    NextTripOut,
    PaginatedManageableEventOut,
    PaginatedShoppingEventOut,
    PaginatedStoreOut,
    PlannedTripOut,
    ShoppingEventOut,
    ShoppingListOut,
    ShoppingTripIn,
    StoreIn,
    StoreOut,
    TripPlanOut,
    TripRowOut,
    TripSourceOut,
    UncoveredOut,
)
from .services.stores import clean_store_name, get_or_create_store, selectable_stores
from .services.trips.events import shopping_events
from .services.trips.plan import PlannedTrip, ShoppingPlan, TripRow, build_shopping_plan
from .services.trips.rules import create_rule
from .services.trips.trips import create_trip

store_router = Router(tags=["shopping-stores"])
READ_LOGIN_ACTION = "um deine Läden zu sehen"


def _event_for_store_search(user, event_slug: str | None):
    """The event whose team stores are offered; unknown or foreign events simply add nothing."""
    if not event_slug:
        return None
    from event.models import Event

    from .services.trip_access import event_shopping_role

    event = Event.objects.filter(slug=event_slug).first()
    if event is None or event_shopping_role(event, user) is None:
        return None
    return event


@store_router.get("/", response=PaginatedStoreOut)
def list_stores(request, page: int = 1, page_size: int = 20, search: str = "", event_slug: str | None = None):
    """Own stores, plus the stores used in trips of the given event for its team."""
    require_login(request, READ_LOGIN_ACTION)
    event = _event_for_store_search(request.user, event_slug)
    return paginate_queryset(selectable_stores(request.user, search, event), page, page_size)


@store_router.post("/", response={200: StoreOut, 201: StoreOut})
def create_store(request, payload: StoreIn):
    """Create a store; an existing store with the same name is returned instead of a duplicate."""
    require_login(request)
    store, created = get_or_create_store(request.user, payload.name)
    return Status(201 if created else 200, store)


def _own_store_or_404(user, store_id: int) -> Store:
    return get_object_or_404(Store, id=store_id, owner=user)


@store_router.patch("/{store_id}/", response=StoreOut)
def rename_store(request, store_id: int, payload: StoreIn):
    require_login(request)
    store = _own_store_or_404(request.user, store_id)
    name = clean_store_name(payload.name)
    if Store.objects.filter(owner=request.user, name__iexact=name).exclude(id=store.id).exists():
        raise HttpError(409, "Du hast schon einen Laden mit diesem Namen.")
    store.name = name
    store.save(update_fields=["name"])
    return store


@store_router.delete("/{store_id}/", response={204: None})
def delete_store(request, store_id: int):
    require_login(request)
    store = _own_store_or_404(request.user, store_id)
    if store.shopping_lists.exists():
        raise HttpError(409, "Dieser Laden wird noch in Einkäufen verwendet.")
    store.delete()
    return Status(204, None)


# ---------------------------------------------------------------------------
# Events in the shopping overview
# ---------------------------------------------------------------------------

event_router = Router(tags=["shopping-events"])


def _event_out(event) -> ShoppingEventOut:
    next_trip = None
    if event.next_trip_id is not None:
        next_trip = NextTripOut(
            list_id=event.next_trip_id, store_name=event.next_trip_store or "", scheduled_at=event.next_trip_at
        )
    return ShoppingEventOut(
        id=event.id,
        slug=event.slug,
        name=event.name,
        start_date=event.start_date,
        end_date=event.end_date,
        trips_count=event.trips_count,
        next_trip=next_trip,
        can_manage=bool(event.can_manage),
    )


@event_router.get("/", response=PaginatedShoppingEventOut)
def list_shopping_events(request, page: int = 1, page_size: int = 20, include_past: bool = False):
    """Events with a meal plan that the user may plan or read: running, then upcoming, then (optionally) past."""
    require_login(request, "um deine Einkaufslisten zu sehen")
    result = paginate_queryset(shopping_events(request.user, include_past), page, page_size)
    result["items"] = [_event_out(event) for event in result["items"]]
    return result


@event_router.get("/manageable/", response=PaginatedManageableEventOut)
def list_manageable_events(request, page: int = 1, page_size: int = 20, search: str = ""):
    """Events the user manages (creator, responsible person or staff); offered when linking a meal plan."""
    from event.models import Event

    require_login(request, "um deine Events zu sehen")
    events = Event.objects.filter(is_template=False)
    if not request.user.is_staff:
        events = events.filter(Q(created_by=request.user) | Q(responsible_persons=request.user)).distinct()
    if search.strip():
        events = events.filter(name__icontains=search.strip())
    return paginate_queryset(events.order_by("-start_date", "-id"), page, page_size)


def _event_or_404(slug: str):
    from event.models import Event

    event = Event.objects.filter(slug=slug).first()
    if event is None:
        raise HttpError(404, "Event nicht gefunden")
    return event


def _planning_access(request, slug: str, *, manage: bool):
    """Event for a planning endpoint: strangers get 404, read-only members 403 where editing is needed."""
    from .services.trip_access import event_shopping_role

    require_login(request, "um deine Einkaufslisten zu sehen")
    event = _event_or_404(slug)
    role = event_shopping_role(event, request.user)
    if role is None:
        raise HttpError(404, "Event nicht gefunden")
    if manage and role != "manage":
        raise HttpError(403, "Nur das Event-Team darf Einkäufe planen.")
    return event, role


def _row_out(row: TripRow) -> TripRowOut:
    if row.ingredient is not None:
        item = row.ingredient
        return TripRowOut(
            kind="ingredient",
            subject_id=row.subject_id,
            name=row.name,
            quantity=item.quantity,
            unit=item.unit,
            total_quantity_g=item.total_quantity_g,
            net_quantity_g=item.net_quantity_g,
            reserve_quantity_g=item.reserve_quantity_g,
            retail_section_name=item.retail_section,
            estimated_price_eur=item.estimated_price_eur,
            display_text=item.display_text,
            package_options=item.package_options or [],
            package_surplus_g=item.package_surplus_g,
            sources=[
                TripSourceOut(
                    recipe_id=s.recipe_id,
                    meal_id=s.meal_id,
                    recipe_name=s.recipe_name,
                    recipe_slug=s.recipe_slug,
                    meal_label=s.meal_label,
                    quantity_g=s.quantity_g,
                )
                for s in item.sources or []
            ],
            rule_ids=row.rule_ids,
            spread_count=row.spread_count,
        )
    requirement = row.material
    assert requirement is not None
    return TripRowOut(
        kind="material",
        subject_id=row.subject_id,
        name=row.name,
        quantity=requirement.amount,
        unit="Stück",
        total_quantity_g=requirement.amount,
        net_quantity_g=requirement.amount,
        retail_section_name=str(requirement.material.retail_section.name)
        if requirement.material.retail_section
        else "",
        estimated_price_eur=requirement.cost,
        sources=[
            TripSourceOut(recipe_id=r.id, recipe_name=r.title, recipe_slug=r.slug, quantity_g=r.amount)
            for r in requirement.recipes
        ],
        rule_ids=row.rule_ids,
        spread_count=row.spread_count,
    )


def planned_trip_out(trip: PlannedTrip, counts: dict[int, tuple[int, int]]) -> PlannedTripOut:
    items_count, checked_count = counts.get(trip.list_id, (0, 0))
    return PlannedTripOut(
        list_id=trip.list_id,
        name=trip.name,
        store_id=trip.store_id,
        store_name=trip.store_name,
        scheduled_at=trip.scheduled_at,
        status=trip.status,
        items_count=items_count,
        checked_count=checked_count,
        rows=[_row_out(row) for row in trip.rows],
    )


def _item_counts(event) -> dict[int, tuple[int, int]]:
    rows = (
        ShoppingList.objects.filter(event=event, materialized_at__isnull=False)
        .annotate(n=Count("items"), done=Count("items", filter=Q(items__is_checked=True)))
        .values_list("id", "n", "done")
    )
    return {list_id: (n, done) for list_id, n, done in rows}


def _rule_out(rule: ShoppingAllocationRule) -> AllocationRuleOut:
    subject = rule.ingredient or rule.material
    return AllocationRuleOut(
        id=rule.id,
        target_id=rule.target_id,
        ingredient_id=rule.ingredient_id,
        material_id=rule.material_id,
        meal_id=rule.meal_id,
        quantity=rule.quantity,
        name=subject.name if subject else "",
    )


def _rule_outs(event) -> list[AllocationRuleOut]:
    return [
        _rule_out(r)
        for r in ShoppingAllocationRule.objects.filter(event=event).select_related("ingredient", "material")
    ]


def plan_out(event, plan: ShoppingPlan, can_manage: bool) -> TripPlanOut:
    counts = _item_counts(event)
    return TripPlanOut(
        event_id=event.id,
        event_slug=event.slug,
        event_name=event.name,
        can_manage=can_manage,
        trips=[planned_trip_out(trip, counts) for trip in plan.trips],
        uncovered=[UncoveredOut(**vars(entry)) for entry in plan.uncovered],
        hints=[
            HintOut(kind=h.kind, message=h.message, meal_id=h.meal_id, trip_id=h.trip_id, rule_id=h.rule_id)
            for h in plan.hints
        ],
        rules=_rule_outs(event),
        stamp=plan.stamp,
    )


@event_router.get("/{event_slug}/plan/", response=TripPlanOut)
def get_trip_plan(request, event_slug: str):
    """All trips of the event in time order with the demand allocated to each, plus uncovered demand and hints."""
    event, role = _planning_access(request, event_slug, manage=False)
    return plan_out(event, build_shopping_plan(event), role == "manage")


@event_router.post("/{event_slug}/trips/", response={201: ShoppingListOut})
def create_event_trip(request, event_slug: str, payload: ShoppingTripIn):
    """Plan a new trip: a shop and a time; the demand is distributed by the plan afterwards."""
    event, _role = _planning_access(request, event_slug, manage=True)
    store = None
    if payload.store_id is not None:
        store = selectable_stores(request.user, event=event).filter(id=payload.store_id).first()
        if store is None:
            raise HttpError(422, "Laden nicht gefunden")
    trip = create_trip(
        owner=request.user, event=event, store=store, scheduled_at=payload.scheduled_at, name=payload.name
    )
    trip.can_edit = True
    trip.can_delete = True
    return Status(201, trip)


@event_router.get("/{event_slug}/rules/", response=list[AllocationRuleOut])
def list_allocation_rules(request, event_slug: str):
    event, _role = _planning_access(request, event_slug, manage=False)
    return _rule_outs(event)


@event_router.post("/{event_slug}/rules/", response={201: AllocationRuleOut})
def create_allocation_rule(request, event_slug: str, payload: AllocationRuleIn):
    """Move an ingredient or material (all meals or one, whole or in part) to another trip of the event."""
    event, _role = _planning_access(request, event_slug, manage=True)
    rule = create_rule(event=event, user=request.user, **payload.dict())
    return Status(
        201, _rule_out(ShoppingAllocationRule.objects.select_related("ingredient", "material").get(id=rule.id))
    )


rule_router = Router(tags=["shopping-rules"])


@rule_router.delete("/{rule_id}/", response={204: None})
def delete_allocation_rule(request, rule_id: int):
    """Taking a rule back restores the automatic allocation by date."""
    require_login(request)
    rule = get_object_or_404(ShoppingAllocationRule.objects.select_related("event"), id=rule_id)
    from .services.trip_access import event_shopping_role

    role = event_shopping_role(rule.event, request.user)
    if role is None:
        raise HttpError(404, "Regel nicht gefunden")
    if role != "manage":
        raise HttpError(403, "Nur das Event-Team darf Einkäufe planen.")
    rule.delete()
    return Status(204, None)
