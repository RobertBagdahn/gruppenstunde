"""Labels API endpoints — CRUD for event labels and participant label assignment."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.models import Event, Participant, ParticipantLabel
from event.choices import TimelineActionChoices
from event.schemas import LabelAssignIn, LabelCreateIn, LabelOut, LabelUpdateIn
from event.services.timeline import TimelineService

from .events import event_router
from .helpers import require_auth, require_event_manager


# ==========================================================================
# Label CRUD (on events)
# ==========================================================================


@event_router.get("/{event_slug}/labels/", response=list[LabelOut])
def list_labels(request, event_slug: str):
    """List labels for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    return event.participant_labels.all()


@event_router.post("/{event_slug}/labels/", response={201: LabelOut})
def create_label(request, event_slug: str, payload: LabelCreateIn):
    """Create a label for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    label = ParticipantLabel.objects.create(event=event, **payload.dict())
    return 201, label


@event_router.patch("/{event_slug}/labels/{label_id}/", response=LabelOut)
def update_label(request, event_slug: str, label_id: int, payload: LabelUpdateIn):
    """Update a label (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    label = get_object_or_404(ParticipantLabel, id=label_id, event=event)

    data = payload.dict(exclude_unset=True)
    for attr, value in data.items():
        setattr(label, attr, value)
    label.save()

    return label


@event_router.delete("/{event_slug}/labels/{label_id}/")
def delete_label(request, event_slug: str, label_id: int):
    """Delete a label (managers only). Also removes from all participants."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    label = get_object_or_404(ParticipantLabel, id=label_id, event=event)
    label.delete()

    return {"success": True, "message": "Label gelöscht"}


# ==========================================================================
# Label Assignment (on participants)
# ==========================================================================


@event_router.post("/{event_slug}/participants/{participant_id}/labels/")
def assign_label(request, event_slug: str, participant_id: int, payload: LabelAssignIn):
    """Assign a label to a participant (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)
    label = get_object_or_404(ParticipantLabel, id=payload.label_id, event=event)

    participant.labels.add(label)

    TimelineService.log(
        event=event,
        action_type=TimelineActionChoices.LABEL_ADDED,
        description=f"Label '{label.name}' hinzugefügt zu {participant.first_name} {participant.last_name}",
        participant=participant,
        user=request.user,
        metadata={"label_id": label.id, "label_name": label.name},
    )

    return {"success": True, "message": f"Label '{label.name}' zugewiesen"}


@event_router.delete("/{event_slug}/participants/{participant_id}/labels/{label_id}/")
def remove_label(request, event_slug: str, participant_id: int, label_id: int):
    """Remove a label from a participant (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)
    label = get_object_or_404(ParticipantLabel, id=label_id, event=event)

    participant.labels.remove(label)

    TimelineService.log(
        event=event,
        action_type=TimelineActionChoices.LABEL_REMOVED,
        description=f"Label '{label.name}' entfernt von {participant.first_name} {participant.last_name}",
        participant=participant,
        user=request.user,
        metadata={"label_id": label.id, "label_name": label.name},
    )

    return {"success": True, "message": f"Label '{label.name}' entfernt"}
