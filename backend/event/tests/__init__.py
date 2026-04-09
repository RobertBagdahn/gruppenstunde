"""Factories for creating test data (event app)."""

import datetime
from decimal import Decimal

from django.utils import timezone
from model_bakery import baker

from event.choices import GenderChoices, PaymentMethodChoices, CustomFieldTypeChoices
from event.models import (
    BookingOption,
    CustomField,
    CustomFieldValue,
    Event,
    EventLocation,
    Participant,
    ParticipantLabel,
    Payment,
    Person,
    Registration,
    TimelineEntry,
)


# ---------------------------------------------------------------------------
# EventLocation
# ---------------------------------------------------------------------------


def make_event_location(**kwargs) -> EventLocation:
    defaults = {
        "name": "Pfadfinderheim Waldwiese",
        "street": "Waldweg 12",
        "zip_code": "12345",
        "city": "Waldstadt",
        "state": "Hessen",
        "country": "Deutschland",
        "description": "Unser gemütliches Pfadfinderheim am Waldrand",
    }
    defaults.update(kwargs)
    return baker.make(EventLocation, **defaults)


# ---------------------------------------------------------------------------
# Event
# ---------------------------------------------------------------------------


def make_event(**kwargs) -> Event:
    now = timezone.now()
    defaults = {
        "name": "Sommerlager 2026",
        "description": "Eine Woche Spaß im Wald",
        "location": "Waldstadt",
        "start_date": now + datetime.timedelta(days=30),
        "end_date": now + datetime.timedelta(days=37),
        "registration_deadline": now + datetime.timedelta(days=25),
        "registration_start": now - datetime.timedelta(days=5),
        "is_public": True,
    }
    defaults.update(kwargs)
    return baker.make(Event, **defaults)


# ---------------------------------------------------------------------------
# BookingOption
# ---------------------------------------------------------------------------


def make_booking_option(event: Event | None = None, **kwargs) -> BookingOption:
    if event is None:
        event = make_event()
    defaults = {
        "name": "Ganzes Wochenende",
        "description": "Freitag bis Sonntag inkl. Verpflegung",
        "price": Decimal("45.00"),
        "max_participants": 30,
    }
    defaults.update(kwargs)
    return baker.make(BookingOption, event=event, **defaults)


# ---------------------------------------------------------------------------
# Person
# ---------------------------------------------------------------------------


def make_person(user=None, **kwargs) -> Person:
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    defaults = {
        "first_name": "Max",
        "last_name": "Mustermann",
        "scout_name": "Falke",
        "address": "Musterstraße 1",
        "zip_code": "12345",
        "city": "Musterstadt",
        "email": "max@example.com",
        "birthday": datetime.date(2010, 5, 15),
        "gender": GenderChoices.MALE,
    }
    defaults.update(kwargs)
    return baker.make(Person, user=user, **defaults)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def make_registration(user=None, event: Event | None = None, **kwargs) -> Registration:
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    if event is None:
        event = make_event()
    defaults = {}
    defaults.update(kwargs)
    return baker.make(Registration, user=user, event=event, **defaults)


# ---------------------------------------------------------------------------
# Participant
# ---------------------------------------------------------------------------


def make_participant(
    registration: Registration | None = None,
    person: Person | None = None,
    booking_option: BookingOption | None = None,
    **kwargs,
) -> Participant:
    if registration is None:
        registration = make_registration()
    defaults = {
        "first_name": "Max",
        "last_name": "Mustermann",
        "scout_name": "Falke",
        "gender": GenderChoices.MALE,
        "birthday": datetime.date(2010, 5, 15),
    }
    defaults.update(kwargs)
    return baker.make(
        Participant,
        registration=registration,
        person=person,
        booking_option=booking_option,
        **defaults,
    )


# ---------------------------------------------------------------------------
# TimelineEntry
# ---------------------------------------------------------------------------


def make_timeline_entry(event: Event | None = None, **kwargs) -> TimelineEntry:
    if event is None:
        event = make_event()
    defaults = {
        "action_type": "registered",
        "description": "Test timeline entry",
    }
    defaults.update(kwargs)
    return baker.make(TimelineEntry, event=event, **defaults)


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------


def make_payment(participant: Participant | None = None, **kwargs) -> Payment:
    if participant is None:
        participant = make_participant()
    defaults = {
        "amount": Decimal("25.00"),
        "method": PaymentMethodChoices.BAR,
        "received_at": timezone.now(),
        "location": "Pfadfinderheim",
        "note": "Barzahlung",
    }
    defaults.update(kwargs)
    return baker.make(Payment, participant=participant, **defaults)


# ---------------------------------------------------------------------------
# CustomField
# ---------------------------------------------------------------------------


def make_custom_field(event: Event | None = None, **kwargs) -> CustomField:
    if event is None:
        event = make_event()
    defaults = {
        "label": "T-Shirt Größe",
        "field_type": CustomFieldTypeChoices.SELECT,
        "options": ["S", "M", "L", "XL"],
        "is_required": False,
        "sort_order": 0,
    }
    defaults.update(kwargs)
    return baker.make(CustomField, event=event, **defaults)


def make_custom_field_value(
    custom_field: CustomField | None = None,
    participant: Participant | None = None,
    **kwargs,
) -> CustomFieldValue:
    if custom_field is None:
        custom_field = make_custom_field()
    if participant is None:
        participant = make_participant()
    defaults = {
        "value": "M",
    }
    defaults.update(kwargs)
    return baker.make(
        CustomFieldValue,
        custom_field=custom_field,
        participant=participant,
        **defaults,
    )


# ---------------------------------------------------------------------------
# ParticipantLabel
# ---------------------------------------------------------------------------


def make_label(event: Event | None = None, **kwargs) -> ParticipantLabel:
    if event is None:
        event = make_event()
    defaults = {
        "name": "Betreuer",
        "color": "#4CAF50",
    }
    defaults.update(kwargs)
    return baker.make(ParticipantLabel, event=event, **defaults)
