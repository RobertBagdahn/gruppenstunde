"""Attendance service — batch check-in and timeline integration."""

import logging

from django.utils import timezone

from event.models import AttendanceRecord, Participant

logger = logging.getLogger(__name__)


class AttendanceService:
    """Attendance tracking service."""

    @classmethod
    def batch_check_in(cls, event, participant_ids, checked_in_by):
        """Check in multiple participants at once."""
        participants = Participant.objects.filter(
            id__in=participant_ids,
            registration__event=event,
        )

        now = timezone.now()
        records = []

        for participant in participants:
            record, created = AttendanceRecord.objects.get_or_create(
                participant=participant,
                defaults={
                    "checked_in_at": now,
                    "checked_in_by": checked_in_by,
                },
            )
            if not created and record.checked_in_at is None:
                record.checked_in_at = now
                record.checked_in_by = checked_in_by
                record.checked_out_at = None
                record.save()

            records.append(record)

        # Log timeline entry
        cls._log_timeline(event, checked_in_by, "attendance_check_in", len(records))

        return records

    @classmethod
    def _log_timeline(cls, event, user, action_type, count):
        """Create a timeline entry for attendance actions."""
        try:
            from event.models import TimelineEntry

            TimelineEntry.objects.create(
                event=event,
                user=user,
                action_type=action_type,
                description=f"{count} Teilnehmer eingecheckt",
            )
        except Exception:
            logger.exception("Failed to create timeline entry for attendance")
