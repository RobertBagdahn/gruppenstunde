"""Room assignment API endpoints."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.api.events import event_router
from event.api.helpers import require_auth, require_event_manager
from event.models import Event, Participant, RoomAssignment
from event.schemas import (
    RoomAssignmentCreateIn,
    RoomAssignmentOut,
    RoomAssignmentUpdateIn,
    RoomAssignParticipantIn,
)


@event_router.get("/{event_slug}/rooms/", response=list[RoomAssignmentOut])
def list_rooms(request, event_slug: str):
    """List all room assignments for an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    return list(RoomAssignment.objects.filter(event=event).prefetch_related("participants"))


@event_router.post("/{event_slug}/rooms/", response={201: RoomAssignmentOut})
def create_room(request, event_slug: str, payload: RoomAssignmentCreateIn):
    """Create a new room assignment."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    room = RoomAssignment.objects.create(event=event, **payload.dict())
    return 201, room


@event_router.patch("/{event_slug}/rooms/{room_id}/", response=RoomAssignmentOut)
def update_room(request, event_slug: str, room_id: int, payload: RoomAssignmentUpdateIn):
    """Update a room assignment."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    room = get_object_or_404(RoomAssignment, id=room_id, event=event)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(room, field, value)
    room.save()
    return room


@event_router.delete("/{event_slug}/rooms/{room_id}/")
def delete_room(request, event_slug: str, room_id: int):
    """Delete a room assignment."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    room = get_object_or_404(RoomAssignment, id=room_id, event=event)
    room.delete()
    return {"success": True, "message": "Zimmer gelöscht"}


@event_router.patch("/{event_slug}/rooms/{room_id}/assign/", response=RoomAssignmentOut)
def assign_participant(request, event_slug: str, room_id: int, payload: RoomAssignParticipantIn):
    """Assign a participant to a room."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    room = get_object_or_404(RoomAssignment, id=room_id, event=event)
    participant = get_object_or_404(Participant, id=payload.participant_id, registration__event=event)

    if room.is_full:
        raise HttpError(400, "Zimmer ist voll.")

    # Remove from other rooms in same event first
    RoomAssignment.objects.filter(event=event, participants=participant).exclude(id=room.id).update()
    for other_room in RoomAssignment.objects.filter(event=event, participants=participant).exclude(id=room.id):
        other_room.participants.remove(participant)

    room.participants.add(participant)
    room.refresh_from_db()
    return room


@event_router.patch("/{event_slug}/rooms/{room_id}/unassign/", response=RoomAssignmentOut)
def unassign_participant(request, event_slug: str, room_id: int, payload: RoomAssignParticipantIn):
    """Remove a participant from a room."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    room = get_object_or_404(RoomAssignment, id=room_id, event=event)
    participant = get_object_or_404(Participant, id=payload.participant_id)

    room.participants.remove(participant)
    room.refresh_from_db()
    return room
