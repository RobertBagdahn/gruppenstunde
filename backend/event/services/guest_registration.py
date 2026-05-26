"""GuestRegistrationService — handle guest registrations without authentication."""

from __future__ import annotations

import logging
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from ninja.errors import HttpError

from ..choices import GenderChoices, TimelineActionChoices
from ..models import BookingOption, Event, Participant, Person, Registration
from ..services.timeline import TimelineService

logger = logging.getLogger(__name__)
User = get_user_model()


class GuestRegistrationService:
    """Handle guest registrations: account creation + registration in one step."""

    @staticmethod
    def create_or_get_user(email: str) -> Any:
        """Get existing user by email or create a new one with unusable password."""
        email_lower = email.lower().strip()
        try:
            return User.objects.get(email__iexact=email_lower)
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=email_lower,
                email=email_lower,
                password=None,  # unusable password
            )
            user.set_unusable_password()
            user.save()
            return user

    @staticmethod
    def validate_guest_registration(event: Event, persons_data: list[dict]) -> None:
        """Validate that guest registration is allowed for this event."""
        if not event.guest_registration_enabled:
            raise HttpError(403, "Gastregistrierung ist für dieses Event nicht aktiviert.")

        phase = event.compute_phase()
        if phase != "registration":
            raise HttpError(400, "Die Anmeldephase ist nicht aktiv.")

        for person_data in persons_data:
            booking_option_id = person_data.get("booking_option_id")
            if booking_option_id:
                try:
                    option = BookingOption.objects.get(id=booking_option_id, event=event)
                except BookingOption.DoesNotExist:
                    raise HttpError(400, "Diese Buchungsoption ist nicht verfügbar.")

                if option.is_system:
                    raise HttpError(400, "Diese Buchungsoption ist nicht verfügbar.")
                if not option.is_bookable:
                    raise HttpError(400, "Diese Buchungsoption ist nicht mehr verfügbar.")
                if option.is_full:
                    raise HttpError(400, "Diese Buchungsoption ist bereits ausgebucht.")

    @staticmethod
    @transaction.atomic
    def create_guest_registration(
        event: Event,
        persons_data: list[dict],
        email: str,
    ) -> Registration:
        """Create a full guest registration: User + Persons + Registration + Participants."""
        user = GuestRegistrationService.create_or_get_user(email)

        # Reactivate soft-deleted registration if exists
        try:
            registration = Registration.objects_all.get(user=user, event=event)
            if registration.deleted_at is not None:
                registration.deleted_at = None
                registration.deleted_by = None
                registration.deleted_reason = ""
                registration.save()
        except Registration.DoesNotExist:
            registration = Registration.objects_all.create(user=user, event=event)

        participants = []
        for person_data in persons_data:
            person = Person.objects.create(
                user=user,
                first_name=person_data["first_name"],
                last_name=person_data["last_name"],
                scout_name=person_data.get("scout_name", ""),
                phone_number=person_data.get("phone_number", ""),
                birthday=person_data.get("birthday"),
                gender=person_data.get("gender", GenderChoices.NO_ANSWER),
                email=email,
            )

            booking_option = None
            booking_option_id = person_data.get("booking_option_id")
            if booking_option_id:
                booking_option = BookingOption.objects.get(id=booking_option_id, event=event)

            participant = Participant.create_from_person(registration, person, booking_option)
            participants.append(participant)

            TimelineService.log(
                event=event,
                action_type=TimelineActionChoices.REGISTERED,
                description=f"{person.first_name} {person.last_name} angemeldet (Gastregistrierung)",
                participant=participant,
                user=None,
                metadata={"guest_email": email},
            )

        return registration
