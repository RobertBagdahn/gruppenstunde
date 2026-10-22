"""Who may plan the shopping trips of an event (openspec `shopping-trip-planning`).

``manage``: event team (creator, responsible persons, staff) and owners, admins and editors of a meal
plan of the event. ``read``: viewers of such a plan. Public plans grant nothing here, otherwise every
visitor would see the shopping plan of a public event.
"""

from __future__ import annotations

from typing import Literal

from django.contrib.contenttypes.models import ContentType

from content.models import ContentCollaborator
from event.models import Event, EventMealPlanRelation
from planner.models import MealPlan, MealPlanCollaborator

EventShoppingRole = Literal["manage", "read"]

_WRITE_ROLES = {"admin", "editor"}


def event_shopping_role(event: Event, user) -> EventShoppingRole | None:
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    if event.user_can_manage(user):
        return "manage"

    plan_ids = list(EventMealPlanRelation.objects.filter(event=event).values_list("meal_plan_id", flat=True))
    if not plan_ids:
        return None

    if MealPlan.objects.filter(id__in=plan_ids, created_by=user).exists():
        return "manage"

    roles = set(
        MealPlanCollaborator.objects.filter(meal_plan_id__in=plan_ids, user=user).values_list("role", flat=True)
    )
    roles |= set(
        ContentCollaborator.objects.filter(
            content_type=ContentType.objects.get_for_model(MealPlan), object_id__in=plan_ids, user=user
        ).values_list("role", flat=True)
    )
    if roles & _WRITE_ROLES:
        return "manage"
    return "read" if roles else None


def request_event_shopping_role(request, event_id: int, user) -> EventShoppingRole | None:
    """Role of the requesting user, computed once per request because board and pulse poll often."""
    cache: dict[int, EventShoppingRole | None] = request.__dict__.setdefault("_event_shopping_roles", {})
    if event_id not in cache:
        event = Event.objects.filter(id=event_id).first()
        cache[event_id] = event_shopping_role(event, user) if event is not None else None
    return cache[event_id]
