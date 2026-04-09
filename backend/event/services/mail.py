"""MailService — send manual emails to event participants."""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.db import models

from ..choices import TimelineActionChoices
from ..services.timeline import TimelineService

logger = logging.getLogger(__name__)

DEFAULT_FROM_EMAIL = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@gruppenstunde.de")

# Supported placeholders and their corresponding Participant fields / computed values.
PLACEHOLDER_MAP = {
    "{vorname}": "first_name",
    "{nachname}": "last_name",
    "{pfadiname}": "scout_name",
    "{event_name}": "_event_name",  # special: from event
    "{buchungsoption}": "booking_option_name",
    "{preis}": "_price",  # special: computed
    "{bezahlt}": "_paid",  # special: computed
    "{restbetrag}": "_remaining",  # special: computed
}


class MailService:
    """Send manual emails to event participants with placeholder support."""

    @staticmethod
    def send_mail(
        event: models.Model,
        subject: str,
        body: str,
        recipient_type: str,
        user: models.Model,
        filters: dict[str, Any] | None = None,
        participant_ids: list[int] | None = None,
    ) -> dict[str, Any]:
        """Send mail to participants and return result.

        Args:
            event: Event instance.
            subject: Email subject (may contain placeholders).
            body: Email body (may contain placeholders).
            recipient_type: "all", "filtered", or "selected".
            user: The user sending the mail (for timeline logging).
            filters: Optional filters dict (is_paid, booking_option_id, label_id).
            participant_ids: Required when recipient_type is "selected".

        Returns:
            Dict with sent_count, failed_count, failed_recipients.
        """
        from ..models import Participant, Registration

        # Get participants based on recipient_type
        participants_qs = Participant.objects.filter(
            registration__event=event,
        ).select_related("registration", "booking_option")

        if recipient_type == "filtered" and filters:
            participants_qs = _apply_filters(participants_qs, filters)
        elif recipient_type == "selected" and participant_ids:
            participants_qs = participants_qs.filter(id__in=participant_ids)

        participants = list(participants_qs)

        # Determine reply-to
        reply_to = []
        responsible = event.responsible_persons.first()
        if responsible and responsible.email:
            reply_to = [responsible.email]

        sent_count = 0
        failed_count = 0
        failed_recipients: list[dict[str, Any]] = []

        for participant in participants:
            participant_subject = _replace_placeholders(subject, participant, event)
            participant_body = _replace_placeholders(body, participant, event)
            recipient_email = participant.email

            if not recipient_email:
                failed_count += 1
                failed_recipients.append(
                    {
                        "participant_id": participant.id,
                        "email": "",
                        "error": "Keine E-Mail-Adresse",
                    }
                )
                continue

            try:
                send_mail(
                    subject=participant_subject,
                    message=participant_body,
                    from_email=DEFAULT_FROM_EMAIL,
                    recipient_list=[recipient_email],
                    fail_silently=False,
                    # Note: reply_to requires EmailMessage; send_mail doesn't support it.
                    # We use send_mail for simplicity; reply-to can be added later via EmailMessage.
                )
                sent_count += 1

                # Log timeline entry per participant
                TimelineService.log(
                    event=event,
                    action_type=TimelineActionChoices.MAIL_SENT,
                    description=f"E-Mail an {participant.first_name} {participant.last_name}: {participant_subject}",
                    participant=participant,
                    user=user,
                    metadata={"subject": participant_subject},
                )
            except Exception as exc:
                logger.warning(
                    "Failed to send mail to %s: %s",
                    recipient_email,
                    exc,
                    exc_info=True,
                )
                failed_count += 1
                failed_recipients.append(
                    {
                        "participant_id": participant.id,
                        "email": recipient_email,
                        "error": str(exc),
                    }
                )

        return {
            "sent_count": sent_count,
            "failed_count": failed_count,
            "failed_recipients": failed_recipients,
        }


def _replace_placeholders(text: str, participant: models.Model, event: models.Model) -> str:
    """Replace all supported placeholders in the text."""
    for placeholder, field in PLACEHOLDER_MAP.items():
        if placeholder not in text:
            continue

        if field == "_event_name":
            value = event.name
        elif field == "_price":
            if participant.booking_option:
                value = f"{participant.booking_option.price:.2f} €"
            else:
                value = "0.00 €"
        elif field == "_paid":
            value = f"{participant.total_paid:.2f} €"
        elif field == "_remaining":
            value = f"{participant.remaining_amount:.2f} €"
        else:
            value = getattr(participant, field, "")

        text = text.replace(placeholder, str(value) if value else "")

    return text


def _apply_filters(qs, filters: dict[str, Any]):
    """Apply filters to a Participant queryset."""
    if "is_paid" in filters:
        if filters["is_paid"]:
            # Paid: no booking option OR total_paid >= price
            from django.db.models import Q, Sum, F
            from ..models import Payment

            paid_ids = []
            for p in qs:
                if p.is_paid:
                    paid_ids.append(p.id)
            qs = qs.filter(id__in=paid_ids)
        else:
            unpaid_ids = []
            for p in qs:
                if not p.is_paid:
                    unpaid_ids.append(p.id)
            qs = qs.filter(id__in=unpaid_ids)

    if "booking_option_id" in filters:
        qs = qs.filter(booking_option_id=filters["booking_option_id"])

    if "label_id" in filters:
        qs = qs.filter(labels__id=filters["label_id"])

    return qs
