"""Shared placeholder replacement logic for email and WhatsApp messages."""

from __future__ import annotations

from typing import Any

from django.db import models

# Supported placeholders and their corresponding Participant fields / computed values.
PLACEHOLDER_MAP: dict[str, str] = {
    "{vorname}": "first_name",
    "{nachname}": "last_name",
    "{pfadiname}": "scout_name",
    "{event_name}": "_event_name",
    "{buchungsoption}": "booking_option_name",
    "{preis}": "_price",
    "{bezahlt}": "_paid",
    "{restbetrag}": "_remaining",
}


def replace_placeholders(text: str, participant: models.Model, event: models.Model) -> str:
    """Replace all supported placeholders in the text.

    Works for both email and WhatsApp messages — the placeholder syntax
    is the same, only the surrounding formatting differs per channel.
    """
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


def get_available_placeholders() -> list[dict[str, str]]:
    """Return list of available placeholders with descriptions (for UI display)."""
    return [
        {"key": "{vorname}", "label": "Vorname", "description": "Vorname des Teilnehmers"},
        {"key": "{nachname}", "label": "Nachname", "description": "Nachname des Teilnehmers"},
        {"key": "{pfadiname}", "label": "Pfadiname", "description": "Pfadfindername des Teilnehmers"},
        {"key": "{event_name}", "label": "Event-Name", "description": "Name der Veranstaltung"},
        {"key": "{buchungsoption}", "label": "Buchungsoption", "description": "Gewählte Buchungsoption"},
        {"key": "{preis}", "label": "Preis", "description": "Preis der Buchungsoption"},
        {"key": "{bezahlt}", "label": "Bezahlt", "description": "Bereits bezahlter Betrag"},
        {"key": "{restbetrag}", "label": "Restbetrag", "description": "Noch offener Betrag"},
    ]


def apply_participant_filters(qs: Any, filters: dict[str, Any]) -> Any:
    """Apply filters to a Participant queryset.

    Shared between MailService and MessagingService.
    """
    if "is_paid" in filters:
        if filters["is_paid"]:
            paid_ids = [p.id for p in qs if p.is_paid]
            qs = qs.filter(id__in=paid_ids)
        else:
            unpaid_ids = [p.id for p in qs if not p.is_paid]
            qs = qs.filter(id__in=unpaid_ids)

    if "booking_option_id" in filters:
        qs = qs.filter(booking_option_id=filters["booking_option_id"])

    if "label_id" in filters:
        qs = qs.filter(labels__id=filters["label_id"])

    return qs
