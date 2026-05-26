"""Waitlist API endpoints."""

import math

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.api.events import event_router
from event.api.helpers import require_auth, require_event_manager
from event.models import BookingOption, Event, WaitlistEntry
from event.schemas import (
    PaginatedWaitlistEntryOut,
    WaitlistEntryCreateIn,
    WaitlistEntryOut,
)


@event_router.post("/{event_slug}/waitlist/", response={201: WaitlistEntryOut})
def join_waitlist(request, event_slug: str, payload: WaitlistEntryCreateIn):
    """Join the waitlist for a booking option."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    booking_option = get_object_or_404(BookingOption, id=payload.booking_option_id, event=event)

    # Check if already on waitlist
    if WaitlistEntry.objects.filter(event=event, user=request.user, booking_option=booking_option).exists():
        raise HttpError(400, "Du bist bereits auf der Warteliste für diese Buchungsoption.")

    entry = WaitlistEntry.objects.create(
        event=event,
        booking_option=booking_option,
        user=request.user,
        person_id=payload.person_id,
    )
    return 201, entry


@event_router.get("/{event_slug}/waitlist/", response=PaginatedWaitlistEntryOut)
def list_waitlist(request, event_slug: str, page: int = 1, page_size: int = 20):
    """List waitlist entries for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    qs = (
        WaitlistEntry.objects.filter(event=event)
        .select_related("booking_option", "user", "person")
        .order_by("-created_at")
    )
    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@event_router.delete("/{event_slug}/waitlist/{entry_id}/")
def remove_from_waitlist(request, event_slug: str, entry_id: int):
    """Remove a waitlist entry."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    entry = get_object_or_404(WaitlistEntry, id=entry_id, event=event)

    # Allow self-removal or manager removal
    is_manager = event.user_can_manage(request.user)
    if entry.user != request.user and not is_manager:
        raise HttpError(403, "Keine Berechtigung")

    entry.delete()
    return {"success": True, "message": "Wartelisten-Eintrag entfernt"}
