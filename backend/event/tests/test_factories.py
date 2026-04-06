"""Tests to validate that all event app factories produce valid model instances."""

import pytest

from event.tests import (
    make_booking_option,
    make_event,
    make_event_location,
    make_participant,
    make_person,
    make_registration,
)


@pytest.mark.django_db
class TestEventFactories:
    def test_make_event_location(self):
        loc = make_event_location()
        assert loc.pk is not None
        assert loc.name == "Pfadfinderheim Waldwiese"
        assert loc.full_address

    def test_make_event(self):
        event = make_event()
        assert event.pk is not None
        assert event.slug
        assert event.is_public is True
        assert event.start_date is not None

    def test_make_event_with_location(self):
        loc = make_event_location()
        event = make_event(event_location=loc)
        assert event.event_location == loc

    def test_make_booking_option(self):
        option = make_booking_option()
        assert option.pk is not None
        assert option.event is not None
        assert option.price == 45.00
        assert option.max_participants == 30

    def test_make_person(self):
        person = make_person()
        assert person.pk is not None
        assert person.first_name == "Max"
        assert person.scout_name == "Falke"
        assert person.user is not None

    def test_make_registration(self):
        reg = make_registration()
        assert reg.pk is not None
        assert reg.user is not None
        assert reg.event is not None

    def test_make_participant(self):
        participant = make_participant()
        assert participant.pk is not None
        assert participant.registration is not None
        assert participant.first_name == "Max"
        assert participant.is_paid is False

    def test_make_participant_with_booking(self):
        event = make_event()
        option = make_booking_option(event=event)
        reg = make_registration(event=event)
        participant = make_participant(registration=reg, booking_option=option)
        assert participant.booking_option == option
