"""Timeline API endpoints — audit log for event actions."""

from django.shortcuts import get_object_or_404

from event.models import Event, TimelineEntry
from event.schemas import TimelineEntryOut

from .events import event_router
from .helpers import require_auth, require_event_manager


@event_router.get("/{event_slug}/timeline/", response=list[TimelineEntryOut])
def list_timeline(
    request,
    event_slug: str,
    participant_id: int | None = None,
    action_type: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    """List timeline entries for an event (managers only). Supports filtering and pagination."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    qs = TimelineEntry.objects.filter(event=event).select_related("participant", "user")

    if participant_id is not None:
        qs = qs.filter(participant_id=participant_id)
    if action_type:
        qs = qs.filter(action_type=action_type)

    # Simple offset pagination
    offset = (page - 1) * page_size
    return qs[offset : offset + page_size]
