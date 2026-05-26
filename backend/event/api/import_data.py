"""Participant import API endpoints."""

from django.shortcuts import get_object_or_404
from ninja import File, UploadedFile
from ninja.errors import HttpError

from event.api.events import event_router
from event.api.helpers import require_auth, require_event_manager
from event.models import Event
from event.schemas import ImportPreviewOut, ImportResultOut


@event_router.post("/{event_slug}/import/preview/", response=ImportPreviewOut)
def preview_import(request, event_slug: str, file: UploadedFile = File(...)):
    """Preview participant import from CSV/Excel file."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    from event.services.import_data import ImportService

    try:
        return ImportService.preview(file)
    except ValueError as e:
        raise HttpError(400, str(e))


@event_router.post("/{event_slug}/import/", response=ImportResultOut)
def import_participants(request, event_slug: str, file: UploadedFile = File(...)):
    """Import participants from CSV/Excel file."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    from event.services.import_data import ImportService

    try:
        return ImportService.import_participants(event, file, request.user)
    except ValueError as e:
        raise HttpError(400, str(e))
