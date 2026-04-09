"""Event Location CRUD endpoints."""

import math

from django.shortcuts import get_object_or_404
from ninja import Router

from event.models import EventLocation
from event.schemas import (
    EventLocationCreateIn,
    EventLocationOut,
    EventLocationUpdateIn,
    PaginatedLocationOut,
)

from .helpers import require_auth

location_router = Router(tags=["locations"])


# ==========================================================================
# Event Location CRUD
# ==========================================================================


@location_router.get("/", response=PaginatedLocationOut)
def list_locations(request, page: int = 1, page_size: int = 20):
    """List all event locations (paginated)."""
    qs = EventLocation.objects.all()

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


@location_router.post("/", response=EventLocationOut)
def create_location(request, payload: EventLocationCreateIn):
    """Create a new event location."""
    require_auth(request)
    return EventLocation.objects.create(created_by=request.user, **payload.dict())


@location_router.get("/{location_id}/", response=EventLocationOut)
def get_location(request, location_id: int):
    """Get a location by ID."""
    return get_object_or_404(EventLocation, id=location_id)


@location_router.patch("/{location_id}/", response=EventLocationOut)
def update_location(request, location_id: int, payload: EventLocationUpdateIn):
    """Update a location."""
    require_auth(request)
    location = get_object_or_404(EventLocation, id=location_id)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(location, field, value)
    location.save()
    return location


@location_router.delete("/{location_id}/")
def delete_location(request, location_id: int):
    """Delete a location."""
    require_auth(request)
    location = get_object_or_404(EventLocation, id=location_id)
    location.delete()
    return {"success": True, "message": "Veranstaltungsort gelöscht"}
