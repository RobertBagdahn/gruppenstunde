"""Factories for creating test data (event app)."""

import datetime
from decimal import Decimal

from django.utils import timezone
from model_bakery import baker

from event.choices import GenderChoices
from event.models import (
    BookingOption,
    Event,
    EventLocation,
    Participant,
    Person,
    Registration,
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
        "is_paid": False,
    }
    defaults.update(kwargs)
    return baker.make(
        Participant,
        registration=registration,
        person=person,
        booking_option=booking_option,
        **defaults,
    )
