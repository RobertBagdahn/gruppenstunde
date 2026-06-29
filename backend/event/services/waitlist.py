"""Waitlist service — manages waitlist logic and notifications."""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.urls import reverse
from django.utils import timezone

from event.models import WaitlistEntry

logger = logging.getLogger(__name__)


class WaitlistService:
    """Waitlist management service."""

    EXPIRATION_HOURS = 48

    @classmethod
    def _send_notification_email(cls, entry: WaitlistEntry, event, booking_option) -> bool:
        """Send a notification email to the user. Returns True on success."""
        if not entry.user or not entry.user.email:
            logger.warning(
                "Cannot send waitlist notification: user %s has no email",
                entry.user_id,
            )
            return False

        site_url = getattr(settings, "SITE_URL", "https://gruppenstunde.de")
        event_url = f"{site_url}/events/{event.slug}/"
        expiration_hours = cls.EXPIRATION_HOURS

        subject = f"Platz frei bei {event.name}"
        message = (
            f"Hallo {entry.user.first_name or entry.user.username},\n\n"
            f"Für die Veranstaltung „{event.name}“ ist ein Platz in der "
            f"Buchungsoption „{booking_option.name}“ frei geworden.\n\n"
            f"Du hast {expiration_hours} Stunden Zeit, dich anzumelden:\n"
            f"{event_url}\n\n"
            f"Nach Ablauf dieser Frist verfällt der Anspruch auf den freien Platz.\n\n"
            f"Viele Grüße,\ndas Inspi-Team"
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[entry.user.email],
                fail_silently=False,
            )
            logger.info(
                "Waitlist notification sent to %s for event %s, booking option %s",
                entry.user.email,
                event.id,
                booking_option.id,
            )
            return True
        except Exception:
            logger.exception(
                "Failed to send waitlist notification to user %s for event %s",
                entry.user_id,
                event.id,
            )
            return False

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

        sent = cls._send_notification_email(next_entry, event, booking_option)

        if sent:
            next_entry.notified_at = timezone.now()
            next_entry.save(update_fields=["notified_at"])
        else:
            logger.error(
                "Failed to send waitlist notification for entry %s, keeping entry in queue",
                next_entry.id,
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
