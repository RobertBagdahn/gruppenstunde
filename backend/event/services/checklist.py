"""Checklist service — compute publish readiness items for events."""

from event.models import Event


class ChecklistService:
    """Computes readiness checklist for event publishing."""

    @classmethod
    def compute_checklist(cls, event: Event) -> dict:
        """Compute checklist items for an event."""
        items = [
            {
                "key": "name",
                "label": "Event hat einen Namen",
                "is_met": bool(event.name and event.name.strip()),
                "link": "settings",
            },
            {
                "key": "dates",
                "label": "Start- und Enddatum gesetzt",
                "is_met": event.start_date is not None and event.end_date is not None,
                "link": "settings",
            },
            {
                "key": "booking_options",
                "label": "Mindestens eine Buchungsoption",
                "is_met": event.booking_options.filter(is_system=False).exists(),
                "link": "settings",
            },
            {
                "key": "registration_dates",
                "label": "Anmeldezeitraum konfiguriert",
                "is_met": event.registration_start is not None,
                "link": "settings",
            },
            {
                "key": "location",
                "label": "Veranstaltungsort angegeben",
                "is_met": event.event_location is not None or bool(event.location and event.location.strip()),
                "link": "settings",
            },
            {
                "key": "description",
                "label": "Beschreibung vorhanden",
                "is_met": bool(event.description and event.description.strip()),
                "link": "settings",
            },
            {
                "key": "invitation_text",
                "label": "Einladungstext erstellt",
                "is_met": bool(event.invitation_text and event.invitation_text.strip()),
                "link": "invitation",
            },
        ]

        return {
            "items": items,
            "all_met": all(item["is_met"] for item in items),
        }
