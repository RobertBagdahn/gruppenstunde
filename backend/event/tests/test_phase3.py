"""Tests for Phase 3: Mail sending."""

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client

from event.tests import (
    make_booking_option,
    make_event,
    make_label,
    make_participant,
    make_registration,
)

User = get_user_model()

EVENTS_URL = "/api/events"


@pytest.fixture
def manager_client(db):
    user = User.objects.create_user("manager@test.com", "manager@test.com", "pass1234")
    client = Client()
    client.login(username="manager@test.com", password="pass1234")
    return client, user


@pytest.fixture
def non_manager_client(db):
    user = User.objects.create_user("viewer@test.com", "viewer@test.com", "pass1234")
    client = Client()
    client.login(username="viewer@test.com", password="pass1234")
    return client, user


@pytest.fixture
def event_with_participants(manager_client):
    client, user = manager_client
    event = make_event(created_by=user)
    event.responsible_persons.add(user)
    bo = make_booking_option(event=event, price="30.00")

    reg = make_registration(user=user, event=event)
    p1 = make_participant(
        registration=reg,
        booking_option=bo,
        first_name="Alice",
        last_name="Schmidt",
        scout_name="Adler",
        email="alice@test.com",
    )
    p2 = make_participant(
        registration=reg,
        booking_option=bo,
        first_name="Bob",
        last_name="Müller",
        scout_name="Bär",
        email="bob@test.com",
    )
    return event, [p1, p2], client, user


class TestMailEndpoint:
    """Test POST /api/events/{slug}/send-mail/"""

    def test_send_mail_to_all(self, event_with_participants):
        event, participants, client, user = event_with_participants
        mail.outbox.clear()

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "Info zum {event_name}",
                "body": "Hallo {vorname}, du bist angemeldet!",
                "recipient_type": "all",
            },
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sent_count"] == 2
        assert data["failed_count"] == 0
        assert data["failed_recipients"] == []

        # Check emails were actually sent
        assert len(mail.outbox) == 2
        subjects = {m.subject for m in mail.outbox}
        assert f"Info zum {event.name}" in subjects

        # Check placeholder replacement in body
        bodies = {m.body for m in mail.outbox}
        assert any("Hallo Alice" in b for b in bodies)
        assert any("Hallo Bob" in b for b in bodies)

    def test_send_mail_to_selected(self, event_with_participants):
        event, participants, client, user = event_with_participants
        mail.outbox.clear()

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "Persönliche Nachricht",
                "body": "Hallo {vorname}!",
                "recipient_type": "selected",
                "participant_ids": [participants[0].id],
            },
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sent_count"] == 1
        assert data["failed_count"] == 0
        assert len(mail.outbox) == 1
        assert "Hallo Alice" in mail.outbox[0].body

    def test_send_mail_to_filtered(self, event_with_participants):
        event, participants, client, user = event_with_participants
        # Add label to first participant only
        lbl = make_label(event=event, name="VIP")
        participants[0].labels.add(lbl)
        mail.outbox.clear()

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "VIP Info",
                "body": "Hallo {vorname}!",
                "recipient_type": "filtered",
                "filters": {"label_id": lbl.id},
            },
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sent_count"] == 1
        assert len(mail.outbox) == 1
        assert "Hallo Alice" in mail.outbox[0].body

    def test_send_mail_creates_timeline_entries(self, event_with_participants):
        event, participants, client, user = event_with_participants
        from event.models import TimelineEntry

        initial_count = TimelineEntry.objects.filter(event=event).count()

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "Test",
                "body": "Body",
                "recipient_type": "all",
            },
            content_type="application/json",
        )
        assert resp.status_code == 200

        new_entries = TimelineEntry.objects.filter(event=event, action_type="mail_sent").count()
        assert new_entries == 2

    def test_placeholder_replacement(self, event_with_participants):
        event, participants, client, user = event_with_participants
        mail.outbox.clear()

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "{event_name}",
                "body": "{vorname} {nachname} ({pfadiname}), Preis: {preis}, Bezahlt: {bezahlt}, Rest: {restbetrag}",
                "recipient_type": "selected",
                "participant_ids": [participants[0].id],
            },
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert len(mail.outbox) == 1
        body = mail.outbox[0].body
        assert "Alice" in body
        assert "Schmidt" in body
        assert "Adler" in body
        assert "30.00" in body  # price
        assert mail.outbox[0].subject == event.name

    def test_send_mail_non_manager_forbidden(self, non_manager_client, db):
        client, user = non_manager_client
        event = make_event()

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "Test",
                "body": "Body",
                "recipient_type": "all",
            },
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_send_mail_selected_without_ids(self, event_with_participants):
        event, participants, client, user = event_with_participants

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "Test",
                "body": "Body",
                "recipient_type": "selected",
            },
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_send_mail_no_email_participant(self, event_with_participants):
        event, participants, client, user = event_with_participants
        # Remove email from one participant
        participants[1].email = ""
        participants[1].save()
        mail.outbox.clear()

        resp = client.post(
            f"{EVENTS_URL}/{event.slug}/send-mail/",
            data={
                "subject": "Test",
                "body": "Body",
                "recipient_type": "all",
            },
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sent_count"] == 1
        assert data["failed_count"] == 1
        assert len(data["failed_recipients"]) == 1
        assert data["failed_recipients"][0]["participant_id"] == participants[1].id
