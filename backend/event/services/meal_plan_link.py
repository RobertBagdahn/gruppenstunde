"""Link a meal plan to an event; a plan belongs to at most one event."""

from django.db import transaction
from ninja.errors import HttpError

from event.models import Event, EventMealPlanRelation

ALREADY_LINKED_MESSAGE = "Dieser Essensplan gehört schon zu einem Event"


def link_meal_plan(event: Event, meal_plan) -> EventMealPlanRelation:
    """Create the link; confirming an existing link to the same event is fine, another event is a conflict."""
    with transaction.atomic():
        existing = EventMealPlanRelation.objects.select_for_update().filter(meal_plan=meal_plan).first()
        if existing is not None:
            if existing.event_id != event.id:
                raise HttpError(409, ALREADY_LINKED_MESSAGE)
            return existing
        return EventMealPlanRelation.objects.create(event=event, meal_plan=meal_plan)
