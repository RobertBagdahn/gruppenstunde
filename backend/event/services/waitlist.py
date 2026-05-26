"""Waitlist service — manages waitlist logic and notifications."""

import logging
from datetime import timedelta

from django.utils import timezone

from event.models import WaitlistEntry

logger = logging.getLogger(__name__)


class WaitlistService:
    """Waitlist management service."""

    EXPIRATION_HOURS = 48

    @classmethod
    def notify_next(cls, event, booking_option):
        """Notify the next person on the waitlist when a spot opens up."""
        next_entry = (
            WaitlistEntry.objects.filter(
                event=event,
                booking_option=booking_option,
                notified_at__isnull=True,
                expired_at__isnull=True,
            )
            .order_by("created_at")
            .first()
        )

        if not next_entry:
            return None

        next_entry.notified_at = timezone.now()
        next_entry.save(update_fields=["notified_at"])

        # TODO: Send notification email to next_entry.user
        logger.info(
            "Waitlist notification sent to user %s for event %s, booking option %s",
            next_entry.user_id,
            event.id,
            booking_option.id,
        )

        return next_entry

    @classmethod
    def expire_stale_entries(cls):
        """Expire waitlist entries that were notified but didn't respond within 48h."""
        cutoff = timezone.now() - timedelta(hours=cls.EXPIRATION_HOURS)
        expired = WaitlistEntry.objects.filter(
            notified_at__isnull=False,
            notified_at__lt=cutoff,
            expired_at__isnull=True,
        )

        count = 0
        for entry in expired:
            entry.expired_at = timezone.now()
            entry.save(update_fields=["expired_at"])
            # Notify next in line
            cls.notify_next(entry.event, entry.booking_option)
            count += 1

        if count:
            logger.info("Expired %d stale waitlist entries", count)
        return count
