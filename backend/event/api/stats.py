"""Statistics API endpoint for event KPIs."""

from django.shortcuts import get_object_or_404

from core.permissions import require_login
from event.models import Event
from event.schemas import StatsOut
from event.services.stats import StatsService

from .events import event_router
from .helpers import require_event_manager


@event_router.get("/{event_slug}/stats/", response=StatsOut)
def event_stats(request, event_slug: str):
    """Return aggregated statistics for the event."""
    require_login(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    return StatsService.get_stats(event)
