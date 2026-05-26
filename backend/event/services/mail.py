"""MailService — send manual and automated emails to event participants."""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.db import models
from django.template.loader import render_to_string

from ..choices import TimelineActionChoices
from ..services.ci_helper import get_event_ci
from ..services.placeholders import apply_participant_filters, replace_placeholders
from ..services.timeline import TimelineService

logger = logging.getLogger(__name__)

DEFAULT_FROM_EMAIL = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@gruppenstunde.de")


def _ci_context(event: models.Model) -> dict[str, str]:
    """Build template context dict from event CI."""
    ci = get_event_ci(event)
    return {
        "ci_group_name": ci.group_name,
        "ci_primary_color": ci.primary_color,
        "ci_secondary_color": ci.secondary_color,
        "ci_logo_url": ci.logo_url,
        "ci_slogan": ci.slogan,
        "ci_greeting_text": ci.greeting_text,
        "ci_footer_text": ci.footer_text,
        "ci_payment_info": ci.payment_info,
        "ci_signature_text": ci.signature_text,
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
        from ..models import Participant

        # Get participants based on recipient_type
        participants_qs = Participant.objects.filter(
            registration__event=event,
        ).select_related("registration", "booking_option")

        if recipient_type == "filtered" and filters:
            participants_qs = apply_participant_filters(participants_qs, filters)
        elif recipient_type == "selected" and participant_ids:
            participants_qs = participants_qs.filter(id__in=participant_ids)

        participants = list(participants_qs)

        # Determine reply-to
        reply_to = []
        responsible = event.responsible_persons.first()
        if responsible and responsible.email:
            reply_to = [responsible.email]

        # Load CI context once for the event
        ci_ctx = _ci_context(event)

        sent_count = 0
        failed_count = 0
        failed_recipients: list[dict[str, Any]] = []

        for participant in participants:
            participant_subject = replace_placeholders(subject, participant, event)
            participant_body = replace_placeholders(body, participant, event)
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

            # Render HTML version
            html_context = {**ci_ctx, "subject": participant_subject, "body": participant_body}
            html_message = render_to_string("event/email/event_mail.html", html_context)

            try:
                send_mail(
                    subject=participant_subject,
                    message=participant_body,
                    from_email=DEFAULT_FROM_EMAIL,
                    recipient_list=[recipient_email],
                    html_message=html_message,
                    fail_silently=False,
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

    @staticmethod
    def send_registration_confirmation(
        event: models.Model,
        registration: models.Model,
        participants: list | None = None,
    ) -> None:
        """Send a confirmation email after registration.

        Skips silently if no email address is available.
        """
        if participants is None:
            participants = list(registration.participants.select_related("booking_option").all())

        if not participants:
            return

        # Determine recipient email
        recipient_email = registration.user.email
        if not recipient_email:
            for p in participants:
                if p.email:
                    recipient_email = p.email
                    break

        if not recipient_email:
            return

        # Build participant data for template
        participant_data = []
        for p in participants:
            option_name = p.booking_option.name if p.booking_option else "Keine Buchungsoption"
            price = f"{p.booking_option.price:.2f} EUR" if p.booking_option else "0.00 EUR"
            participant_data.append(
                {"first_name": p.first_name, "last_name": p.last_name, "booking_option": option_name, "price": price}
            )

        # Build date info
        date_info = ""
        if event.start_date:
            date_info = f"Beginn: {event.start_date.strftime('%d.%m.%Y %H:%M')}"
            if event.end_date:
                date_info += f"\nEnde: {event.end_date.strftime('%d.%m.%Y %H:%M')}"

        # Build location info
        location_info = ""
        if event.event_location:
            location_info = event.event_location.name
            if event.event_location.full_address:
                location_info += f" ({event.event_location.full_address})"
        elif event.location:
            location_info = event.location

        subject = f"Anmeldebestätigung: {event.name}"

        # Plain-text fallback
        participant_lines = [
            f"  - {p['first_name']} {p['last_name']}: {p['booking_option']} ({p['price']})" for p in participant_data
        ]
        plain_body = (
            f"Hallo,\n\n"
            f'die Anmeldung für "{event.name}" war erfolgreich.\n\n'
            f"Angemeldete Personen:\n" + "\n".join(participant_lines) + "\n"
        )
        if date_info:
            plain_body += f"\n{date_info}\n"
        if location_info:
            plain_body += f"Ort: {location_info}\n"
        plain_body += f"\nViele Grüße,\nDas Team von {event.name}\n"

        # Render HTML
        ci_ctx = _ci_context(event)
        html_context = {
            **ci_ctx,
            "event_name": event.name,
            "participants": participant_data,
            "date_info": date_info,
            "location_info": location_info,
        }
        html_message = render_to_string("event/email/registration_confirmation.html", html_context)

        try:
            send_mail(
                subject=subject,
                message=plain_body,
                from_email=DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception:
            logger.exception("Failed to send registration confirmation to %s", recipient_email)
