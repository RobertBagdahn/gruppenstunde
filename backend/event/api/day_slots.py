"""Event Day Slot CRUD endpoints."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.models import Event, EventDaySlot
from event.schemas import (
    EventDaySlotCreateIn,
    EventDaySlotOut,
    EventDaySlotUpdateIn,
)

from .events import event_router
from .helpers import require_auth, require_event_manager


# ==========================================================================
# Event Day Slots (Tagesplan)
# ==========================================================================


@event_router.get(
    "/{event_slug}/day-slots/",
    response=list[EventDaySlotOut],
    url_name="event_day_slots_list",
)
def list_day_slots(request, event_slug: str):
    """List all day slots for an event."""
    event = get_object_or_404(Event, slug=event_slug)
    return event.day_slots.select_related("content_type").all()


@event_router.post(
    "/{event_slug}/day-slots/",
    response={201: EventDaySlotOut},
    url_name="event_day_slots_create",
)
def create_day_slot(request, event_slug: str, payload: EventDaySlotCreateIn):
    """Add a day slot to an event's day plan."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    from django.contrib.contenttypes.models import ContentType

    ct = None
    if payload.content_type and payload.object_id:
        try:
            ct = ContentType.objects.get(model=payload.content_type)
            # Verify the object exists
            ct.get_object_for_this_type(pk=payload.object_id)
        except (ContentType.DoesNotExist, Exception):
            raise HttpError(400, f"Ungültiger Inhaltstyp oder Objekt: {payload.content_type} #{payload.object_id}")

    slot = EventDaySlot.objects.create(
        event=event,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        title=payload.title,
        notes=payload.notes,
        content_type=ct,
        object_id=payload.object_id if ct else None,
        sort_order=payload.sort_order,
        created_by=request.user,
    )
    return 201, slot


@event_router.patch(
    "/{event_slug}/day-slots/{slot_id}/",
    response=EventDaySlotOut,
    url_name="event_day_slots_update",
)
def update_day_slot(request, event_slug: str, slot_id: int, payload: EventDaySlotUpdateIn):
    """Update a day slot."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    slot = get_object_or_404(EventDaySlot, pk=slot_id, event=event)

    update_data = payload.dict(exclude_unset=True)

    # Handle content_type update
    if "content_type" in update_data:
        from django.contrib.contenttypes.models import ContentType

        ct_name = update_data.pop("content_type")
        if ct_name and update_data.get("object_id"):
            try:
                ct = ContentType.objects.get(model=ct_name)
                ct.get_object_for_this_type(pk=update_data["object_id"])
                slot.content_type = ct
            except (ContentType.DoesNotExist, Exception):
                raise HttpError(400, f"Ungültiger Inhaltstyp oder Objekt: {ct_name}")
        elif ct_name is None:
            slot.content_type = None
            slot.object_id = None
            update_data.pop("object_id", None)

    for field, value in update_data.items():
        setattr(slot, field, value)

    slot.save()
    return slot


@event_router.delete(
    "/{event_slug}/day-slots/{slot_id}/",
    response={204: None},
    url_name="event_day_slots_delete",
)
def delete_day_slot(request, event_slug: str, slot_id: int):
    """Delete a day slot from an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    slot = get_object_or_404(EventDaySlot, pk=slot_id, event=event)
    slot.delete()
    return 204, None
