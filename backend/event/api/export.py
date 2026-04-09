"""Export API endpoints for event participants."""

from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from event.models import Event
from event.schemas import ExportColumnOut, ExportConfigIn
from event.services.export import ExportService

from .events import event_router
from .helpers import require_auth, require_event_manager


@event_router.get("/{event_slug}/export/columns/", response=list[ExportColumnOut])
def export_columns(request, event_slug: str):
    """Return all available export columns for this event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    columns = ExportService.get_available_columns(event)
    return columns


@event_router.post("/{event_slug}/export/")
def export_participants(request, event_slug: str, payload: ExportConfigIn):
    """Export participants as Excel/CSV/PDF file download."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    filters = None
    if payload.filters:
        filters = payload.filters.model_dump(exclude_none=True)

    file_bytes, content_type, filename = ExportService.export_participants(
        event=event,
        columns=payload.columns,
        fmt=payload.format,
        filters=filters,
    )

    response = HttpResponse(file_bytes, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
