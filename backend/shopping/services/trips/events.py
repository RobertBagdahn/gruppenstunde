"""Events offered in the shopping overview: those with a meal plan the user may plan or read."""

from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.db.models import (
    BooleanField,
    Case,
    Count,
    DateTimeField,
    Exists,
    ExpressionWrapper,
    F,
    IntegerField,
    OuterRef,
    Q,
    QuerySet,
    Subquery,
    Value,
    When,
)
from django.utils import timezone

from content.models import ContentCollaborator
from event.models import Event, EventMealPlanRelation
from planner.models import MealPlan
from shopping.models import ShoppingList

WRITE_ROLES = ("admin", "editor")

PHASE_RUNNING = 0
PHASE_UPCOMING = 1
PHASE_PAST = 2


def _relation_exists(**filters) -> Exists:
    return Exists(EventMealPlanRelation.objects.filter(event=OuterRef("pk"), **filters))


def shopping_events(user, include_past: bool = False) -> QuerySet[Event]:
    """Events the user may plan or read, ordered running, upcoming, past.

    Everything is annotated, so a page costs a fixed number of queries whatever the number of events.
    """
    now = timezone.now()
    plan_type = ContentType.objects.get_for_model(MealPlan)
    shared = ContentCollaborator.objects.filter(content_type=plan_type, user=user)

    next_trip = ShoppingList.objects.filter(event=OuterRef("pk"), scheduled_at__gte=now).order_by("scheduled_at", "id")
    events = Event.objects.annotate(
        has_plan=_relation_exists(),
        is_responsible=Exists(
            Event.responsible_persons.through.objects.filter(event_id=OuterRef("pk"), user_id=user.id)
        ),
        plan_manage=(
            _relation_exists(meal_plan__created_by=user)
            | _relation_exists(meal_plan__collaborators__user=user, meal_plan__collaborators__role__in=WRITE_ROLES)
            | _relation_exists(meal_plan_id__in=shared.filter(role__in=WRITE_ROLES).values("object_id"))
        ),
        plan_read=(
            _relation_exists(meal_plan__collaborators__user=user)
            | _relation_exists(meal_plan_id__in=shared.values("object_id"))
        ),
        trips_count=Count("shopping_trips", distinct=True),
        next_trip_id=Subquery(next_trip.values("id")[:1]),
        next_trip_at=Subquery(next_trip.values("scheduled_at")[:1]),
        next_trip_store=Subquery(next_trip.values("store__name")[:1]),
        phase=Case(
            When(start_date__isnull=True, then=Value(PHASE_UPCOMING)),
            When(start_date__gt=now, then=Value(PHASE_UPCOMING)),
            When(end_date__gte=now, then=Value(PHASE_RUNNING)),
            default=Value(PHASE_PAST),
            output_field=IntegerField(),
        ),
    ).filter(has_plan=True)

    events = events.annotate(
        can_manage=ExpressionWrapper(
            Value(bool(user.is_staff)) | Q(created_by=user) | Q(is_responsible=True) | Q(plan_manage=True),
            output_field=BooleanField(),
        )
    )
    if not user.is_staff:
        events = events.filter(Q(can_manage=True) | Q(plan_read=True))
    if not include_past:
        events = events.filter(phase__lt=PHASE_PAST)

    # Running and upcoming events start soonest first, past events most recent first
    return events.annotate(
        upcoming_start=Case(When(phase__lt=PHASE_PAST, then=F("start_date")), output_field=DateTimeField()),
        past_start=Case(When(phase=PHASE_PAST, then=F("start_date")), output_field=DateTimeField()),
    ).order_by("phase", F("upcoming_start").asc(nulls_last=True), F("past_start").desc(nulls_last=True), "id")
