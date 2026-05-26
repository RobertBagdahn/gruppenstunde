"""Publish readiness checklist API endpoint."""

from django.shortcuts import get_object_or_404

from event.api.events import event_router
from event.api.helpers import require_auth, require_event_manager
from event.models import Event
from event.schemas import ChecklistOut


@event_router.get("/{event_slug}/checklist/", response=ChecklistOut)
def get_event_checklist(request, event_slug: str):
    """Return publish readiness checklist for an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    from event.services.checklist import ChecklistService

    result = ChecklistService.compute_checklist(event)
    return result
