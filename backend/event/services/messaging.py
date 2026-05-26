"""MessagingService — unified facade over MailService and WhatsAppService."""

from __future__ import annotations

import logging
from typing import Any

from django.db import models

from ..choices import TimelineActionChoices
from ..services.mail import MailService
from ..services.placeholders import apply_participant_filters, replace_placeholders
from ..services.timeline import TimelineService
from ..services.whatsapp import WhatsAppService

logger = logging.getLogger(__name__)


class MessagingService:
    """Unified messaging facade that delegates to MailService or WhatsAppService.

    Provides preview and send methods that work across channels.
    """

    def __init__(self) -> None:
        self._whatsapp = WhatsAppService()

    @staticmethod
    def preview(
        event: models.Model,
        channel: str,
        body: str,
        recipient_type: str,
        user: models.Model,
        filters: dict[str, Any] | None = None,
        participant_ids: list[int] | None = None,
    ) -> dict[str, Any]:
        """Build a preview of the message for all recipients.

        For WhatsApp: includes is_on_whatsapp availability check.

        Args:
            event: Event instance.
            channel: "email" or "whatsapp".
            body: Message body with placeholders.
            recipient_type: "all", "filtered", or "selected".
            user: The user sending the message.
            filters: Optional filters dict.
            participant_ids: Required when recipient_type is "selected".

        Returns:
            Dict with recipients, counts, sample_message, channel.
        """
        from ..models import Participant

        # Build participant queryset
        participants_qs = Participant.objects.filter(
            registration__event=event,
        ).select_related("registration", "booking_option")

        if recipient_type == "filtered" and filters:
            participants_qs = apply_participant_filters(participants_qs, filters)
        elif recipient_type == "selected" and participant_ids:
            participants_qs = participants_qs.filter(id__in=participant_ids)

        participants = list(participants_qs)

        # Build recipient list with contact info
        recipients: list[dict[str, Any]] = []
        phone_numbers_to_check: list[str] = []

        for p in participants:
            recipient = {
                "participant_id": p.id,
                "name": f"{p.first_name} {p.last_name}",
                "contact": "",
                "whatsapp_status": "unknown",
            }

            if channel == "email":
                recipient["contact"] = _mask_email(p.email) if p.email else ""
                recipient["whatsapp_status"] = "not_applicable"
            elif channel == "whatsapp":
                recipient["contact"] = _mask_phone(p.phone_number) if p.phone_number else ""
                if p.phone_number:
                    phone_numbers_to_check.append(p.phone_number)

            recipients.append(recipient)

        # Check WhatsApp availability if channel is whatsapp
        wa_availability: dict[str, bool] = {}
        if channel == "whatsapp" and phone_numbers_to_check:
            wa_service = WhatsAppService()
            wa_availability = wa_service.check_whatsapp_availability(user, phone_numbers_to_check)

        # Update recipients with WhatsApp status
        reachable_count = 0
        unreachable_count = 0

        for i, p in enumerate(participants):
            if channel == "email":
                if p.email:
                    reachable_count += 1
                else:
                    unreachable_count += 1
                    recipients[i]["whatsapp_status"] = "no_contact"
            elif channel == "whatsapp":
                if not p.phone_number:
                    recipients[i]["whatsapp_status"] = "no_phone"
                    unreachable_count += 1
                elif wa_availability.get(p.phone_number, False):
                    recipients[i]["whatsapp_status"] = "available"
                    reachable_count += 1
                else:
                    recipients[i]["whatsapp_status"] = "unavailable"
                    unreachable_count += 1

        # Generate sample message from first participant
        sample_message = ""
        if participants:
            sample_message = replace_placeholders(body, participants[0], event)

        return {
            "recipients": recipients,
            "total_count": len(participants),
            "reachable_count": reachable_count,
            "unreachable_count": unreachable_count,
            "channel": channel,
            "sample_message": sample_message,
        }

    @staticmethod
    def send(
        event: models.Model,
        channel: str,
        subject: str,
        body: str,
        recipient_type: str,
        user: models.Model,
        filters: dict[str, Any] | None = None,
        participant_ids: list[int] | None = None,
    ) -> dict[str, Any]:
        """Send messages via the specified channel.

        Args:
            event: Event instance.
            channel: "email" or "whatsapp".
            subject: Email subject (ignored for whatsapp).
            body: Message body with placeholders.
            recipient_type: "all", "filtered", or "selected".
            user: The user sending the message.
            filters: Optional filters dict.
            participant_ids: Required when recipient_type is "selected".

        Returns:
            Dict with sent_count, failed_count, failed_recipients.
        """
        if channel == "email":
            return MailService.send_mail(
                event=event,
                subject=subject,
                body=body,
                recipient_type=recipient_type,
                user=user,
                filters=filters,
                participant_ids=participant_ids,
            )
        elif channel == "whatsapp":
            return _send_whatsapp(
                event=event,
                body=body,
                recipient_type=recipient_type,
                user=user,
                filters=filters,
                participant_ids=participant_ids,
            )
        else:
            raise ValueError(f"Unbekannter Kanal: {channel}")


def _send_whatsapp(
    event: models.Model,
    body: str,
    recipient_type: str,
    user: models.Model,
    filters: dict[str, Any] | None = None,
    participant_ids: list[int] | None = None,
) -> dict[str, Any]:
    """Send WhatsApp messages to participants."""
    from ..models import Participant

    wa_service = WhatsAppService()

    # Build participant queryset
    participants_qs = Participant.objects.filter(
        registration__event=event,
    ).select_related("registration", "booking_option")

    if recipient_type == "filtered" and filters:
        participants_qs = apply_participant_filters(participants_qs, filters)
    elif recipient_type == "selected" and participant_ids:
        participants_qs = participants_qs.filter(id__in=participant_ids)

    participants = list(participants_qs)

    sent_count = 0
    failed_count = 0
    failed_recipients: list[dict[str, Any]] = []

    for participant in participants:
        # Replace placeholders per participant
        participant_body = replace_placeholders(body, participant, event)

        result = wa_service.send_to_participant(
            user=user,
            event=event,
            participant=participant,
            text=participant_body,
        )

        if result["success"]:
            sent_count += 1

            # Log timeline entry
            TimelineService.log(
                event=event,
                action_type=TimelineActionChoices.WHATSAPP_SENT,
                description=(f"WhatsApp an {participant.first_name} {participant.last_name}"),
                participant=participant,
                user=user,
                metadata={},
            )
        else:
            failed_count += 1
            failed_recipients.append(
                {
                    "participant_id": participant.id,
                    "phone_number": _mask_phone(participant.phone_number),
                    "error": result["error"],
                }
            )

    return {
        "sent_count": sent_count,
        "failed_count": failed_count,
        "failed_recipients": failed_recipients,
    }


def _mask_email(email: str) -> str:
    """Mask an email address for privacy display.

    Example: "test@example.com" -> "t***@example.com"
    """
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        return f"{local}***@{domain}"
    return f"{local[0]}***@{domain}"


def _mask_phone(phone: str) -> str:
    """Mask a phone number for privacy display.

    Example: "+4917012345678" -> "+49 170 ***5678"
    """
    if not phone:
        return ""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) <= 4:
        return phone
    return f"{phone[:-4]}***{phone[-4:]}" if len(phone) > 4 else phone
