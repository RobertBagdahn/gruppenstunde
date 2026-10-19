"""Freshness of a shopping list created from a meal plan (openspec `shopping-list-source-freshness`).

The list is a snapshot. It counts as `changed` when the plan was modified after the list was
created (event trips: after the last sync with the plan), and as `deleted` when the plan or event is gone. Users without read access to the plan get no
status, so nothing about foreign plans leaks. Plans of a page are loaded in a fixed number of queries.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any, Literal

SourceStatus = Literal["current", "changed", "deleted"]


@dataclass(frozen=True)
class SourceFreshness:
    status: SourceStatus | None = None
    updated_at: dt.datetime | None = None


NO_STATUS = SourceFreshness()


def _readable_plan_ids(user: Any, plans: dict[int, Any]) -> set[int]:
    from django.contrib.contenttypes.models import ContentType

    from content.models import ContentCollaborator
    from content.services.food_access import is_public_meal_plan
    from planner.models import MealPlan, MealPlanCollaborator

    if user is None or not getattr(user, "is_authenticated", False):
        return {plan_id for plan_id, plan in plans.items() if is_public_meal_plan(plan)}
    if user.is_staff:
        return set(plans)
    readable = {
        plan_id for plan_id, plan in plans.items() if plan.created_by_id == user.id or is_public_meal_plan(plan)
    }
    pending = set(plans) - readable
    if pending:
        readable |= set(
            MealPlanCollaborator.objects.filter(meal_plan_id__in=pending, user=user).values_list(
                "meal_plan_id", flat=True
            )
        )
        pending = set(plans) - readable
    if pending:
        content_type = ContentType.objects.get_for_model(MealPlan)
        readable |= set(
            ContentCollaborator.objects.filter(content_type=content_type, object_id__in=pending, user=user).values_list(
                "object_id", flat=True
            )
        )
    return readable


def _event_freshness(user: Any, trips: list[Any]) -> dict[int, SourceFreshness]:
    """Created event trips: `changed` when a plan of the event was touched after the last sync."""
    from django.db.models import Max

    from event.models import EventMealPlanRelation
    from shopping.services.trips.events import shopping_events

    event_ids = {trip.event_id for trip in trips}
    if user is None or not getattr(user, "is_authenticated", False):
        return {trip.id: NO_STATUS for trip in trips}
    readable = set(shopping_events(user, include_past=True).filter(id__in=event_ids).values_list("id", flat=True))
    latest = dict(
        EventMealPlanRelation.objects.filter(event_id__in=event_ids)
        .values("event_id")
        .annotate(latest=Max("meal_plan__updated_at"))
        .values_list("event_id", "latest")
    )
    result: dict[int, SourceFreshness] = {}
    for trip in trips:
        updated_at = latest.get(trip.event_id)
        if trip.event_id not in readable or updated_at is None:
            result[trip.id] = NO_STATUS
            continue
        synced = trip.plan_synced_at or trip.materialized_at
        status: SourceStatus = "changed" if synced is not None and updated_at > synced else "current"
        result[trip.id] = SourceFreshness(status, updated_at)
    return result


def freshness_for_lists(user: Any, shopping_lists: Iterable[Any]) -> dict[int, SourceFreshness]:
    """Status per shopping list id for plan-based lists; other lists are absent from the result."""
    from planner.models import MealPlan
    from shopping.models import SourceType

    shopping_lists = list(shopping_lists)
    result: dict[int, SourceFreshness] = {}

    event_trips = [sl for sl in shopping_lists if sl.event_id is not None and sl.materialized_at is not None]
    if event_trips:
        result.update(_event_freshness(user, event_trips))
    for shopping_list in shopping_lists:
        if shopping_list.source_type == SourceType.EVENT_TRIP and shopping_list.event_id is None:
            # The event is gone; created trips keep their entries as history
            result[shopping_list.id] = SourceFreshness("deleted", None) if shopping_list.materialized_at else NO_STATUS
        elif shopping_list.source_type == SourceType.EVENT_TRIP and shopping_list.materialized_at is None:
            result[shopping_list.id] = NO_STATUS

    plan_lists = [
        shopping_list
        for shopping_list in shopping_lists
        if shopping_list.source_type == SourceType.MEAL_EVENT
        and shopping_list.source_id
        and shopping_list.id not in result
    ]
    if not plan_lists:
        return result
    plan_ids = {shopping_list.source_id for shopping_list in plan_lists}
    plans = {plan.id: plan for plan in MealPlan.objects.filter(id__in=plan_ids)}
    readable = _readable_plan_ids(user, plans)

    for shopping_list in plan_lists:
        plan = plans.get(shopping_list.source_id)
        if plan is None:
            # A deleted plan reveals nothing about content, but only the list's own readers see this list.
            result[shopping_list.id] = SourceFreshness("deleted", None)
        elif plan.id not in readable:
            result[shopping_list.id] = NO_STATUS
        else:
            status: SourceStatus = "changed" if plan.updated_at > shopping_list.created_at else "current"
            result[shopping_list.id] = SourceFreshness(status, plan.updated_at)
    return result
