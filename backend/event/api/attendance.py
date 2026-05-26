"""Attendance tracking API endpoints."""

import math

from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja.errors import HttpError

from event.api.events import event_router
from event.api.helpers import require_auth, require_event_manager
from event.models import AttendanceRecord, Event, Participant
from event.schemas import (
    AttendanceRecordCreateIn,
    AttendanceRecordOut,
    BatchCheckInIn,
    PaginatedAttendanceRecordOut,
)


@event_router.post("/{event_slug}/attendance/check-in/", response=AttendanceRecordOut)
def check_in_participant(request, event_slug: str, payload: AttendanceRecordCreateIn):
    """Check in a single participant."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participant = get_object_or_404(Participant, id=payload.participant_id, registration__event=event)

    record, created = AttendanceRecord.objects.get_or_create(
        participant=participant,
        defaults={
            "checked_in_at": timezone.now(),
            "checked_in_by": request.user,
        },
    )
    if not created and record.checked_in_at is None:
        record.checked_in_at = timezone.now()
        record.checked_in_by = request.user
        record.checked_out_at = None
        record.save()

    return record


@event_router.post("/{event_slug}/attendance/batch-check-in/", response=list[AttendanceRecordOut])
def batch_check_in(request, event_slug: str, payload: BatchCheckInIn):
    """Check in multiple participants at once."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participants = Participant.objects.filter(
        id__in=payload.participant_ids,
        registration__event=event,
    )

    records = []
    now = timezone.now()
    for participant in participants:
        record, created = AttendanceRecord.objects.get_or_create(
            participant=participant,
            defaults={
                "checked_in_at": now,
                "checked_in_by": request.user,
            },
        )
        if not created and record.checked_in_at is None:
            record.checked_in_at = now
            record.checked_in_by = request.user
            record.checked_out_at = None
            record.save()
        records.append(record)

    return records


@event_router.patch("/{event_slug}/attendance/{participant_id}/check-out/", response=AttendanceRecordOut)
def check_out_participant(request, event_slug: str, participant_id: int):
    """Check out a participant."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)
    record = get_object_or_404(AttendanceRecord, participant=participant)

    if record.checked_in_at is None:
        raise HttpError(400, "Teilnehmer ist nicht eingecheckt.")

    record.checked_out_at = timezone.now()
    record.save()
    return record


@event_router.get("/{event_slug}/attendance/", response=PaginatedAttendanceRecordOut)
def list_attendance(request, event_slug: str, page: int = 1, page_size: int = 50):
    """List attendance records for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    qs = AttendanceRecord.objects.filter(
        participant__registration__event=event,
    ).select_related("participant")

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
