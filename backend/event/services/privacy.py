"""Event app privacy data collectors."""

from __future__ import annotations

from typing import Any, cast

from django.contrib.auth.models import User

from profiles.services.privacy import PrivacyDataCollector


class EventPrivacyCollector(PrivacyDataCollector):
    """Collects and anonymizes Person, Participant, Registration, Payment data."""

    def collect(self, user: User) -> dict[str, Any]:
        from event.models import Participant, Payment, Person, Registration

        persons = list(
            Person.objects.filter(user=user).values(
                "id",
                "scout_name",
                "first_name",
                "last_name",
                "email",
                "phone_number",
                "address",
                "zip_code",
                "city",
                "birthday",
                "gender",
                "is_owner",
            )
        )
        for p in persons:
            p_any = cast(dict[str, Any], p)
            p_any["birthday"] = str(p_any["birthday"]) if p_any["birthday"] else None

        registrations_qs = Registration.objects_all.filter(user=user).select_related("event")
        reg_items = []
        for reg in registrations_qs:
            participants = list(
                Participant.objects.filter(registration=reg).values(
                    "id",
                    "first_name",
                    "last_name",
                    "email",
                    "phone_number",
                    "birthday",
                )
            )
            for part in participants:
                part_any = cast(dict[str, Any], part)
                part_any["birthday"] = str(part_any["birthday"]) if part_any["birthday"] else None

            payments = list(
                Payment.objects.filter(participant__registration=reg).values(
                    "amount",
                    "method",
                    "received_at",
                )
            )
            for pay in payments:
                pay_any = cast(dict[str, Any], pay)
                pay_any["amount"] = str(pay_any["amount"])
                pay_any["received_at"] = str(pay_any["received_at"]) if pay_any["received_at"] else None

            reg_items.append(
                {
                    "event_name": reg.event.name,
                    "created_at": str(reg.created_at),
                    "deleted_at": str(reg.deleted_at) if reg.deleted_at else None,
                    "participants": participants,
                    "payments": payments,
                }
            )

        return {
            "persons": {"count": len(persons), "items": persons},
            "events": {"count": len(reg_items), "items": reg_items},
        }

    def anonymize(self, user: User) -> None:
        from event.models import Participant, Person, Registration

        # Anonymize persons owned by this user
        persons = Person.objects.filter(user=user)
        for person in persons:
            person.first_name = "Gelöscht"
            person.last_name = "Gelöscht"
            person.scout_name = ""
            person.email = ""
            person.phone_number = ""
            person.address = ""
            person.zip_code = ""
            person.city = ""
            person.birthday = None
            person.nutritional_tags.clear()
            person.save()

        # Anonymize participants linked through registrations
        registrations = Registration.objects_all.filter(user=user)
        participants = Participant.objects.filter(registration__in=registrations)
        for participant in participants:
            participant.first_name = "Gelöscht"
            participant.last_name = "Gelöscht"
            participant.scout_name = ""
            participant.email = ""
            participant.phone_number = ""
            participant.address = ""
            participant.zip_code = ""
            participant.city = ""
            participant.birthday = None
            participant.nutritional_tags.clear()
            participant.save()


class WhatsAppPrivacyCollector(PrivacyDataCollector):
    """Collects and deletes WhatsApp connection data, message logs, and neonize sessions."""

    def collect(self, user: User) -> dict[str, Any]:
        from event.models import WhatsAppConnection, WhatsAppConnectionLog, WhatsAppMessage

        conn = WhatsAppConnection.objects.filter(user=user).first()
        if not conn:
            return {"whatsapp": {"has_connection": False}}

        message_count = WhatsAppMessage.objects.filter(connection=conn).count()
        log_count = WhatsAppConnectionLog.objects.filter(connection=conn).count()

        return {
            "whatsapp": {
                "has_connection": True,
                "phone_number": conn.phone_number,
                "connected_at": str(conn.connected_at) if conn.connected_at else None,
                "is_active": conn.is_active,
                "total_messages_sent": conn.total_messages_sent,
                "message_log_count": message_count,
                "connection_log_count": log_count,
                "privacy_consent_given_at": (
                    str(conn.privacy_consent_given_at) if conn.privacy_consent_given_at else None
                ),
            },
        }

    def anonymize(self, user: User) -> None:
        from event.services.whatsapp import WhatsAppService

        # WhatsAppService.delete_data handles everything:
        # disconnect client, delete neonize session, delete messages, delete connection
        wa_service = WhatsAppService()
        wa_service.delete_data(user)
