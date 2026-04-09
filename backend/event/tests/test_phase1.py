"""Tests for Timeline, Payment, CustomField, Label APIs and integration."""

import json
from decimal import Decimal

import pytest
from django.test import Client
from django.utils import timezone

from event.choices import (
    CustomFieldTypeChoices,
    PaymentMethodChoices,
    TimelineActionChoices,
)
from event.models import (
    CustomField,
    CustomFieldValue,
    Event,
    Participant,
    ParticipantLabel,
    Payment,
    TimelineEntry,
)
from event.tests import (
    make_booking_option,
    make_custom_field,
    make_event,
    make_label,
    make_participant,
    make_payment,
    make_registration,
    make_timeline_entry,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def manager_user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="manager",
        email="manager@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def manager_client(manager_user) -> Client:
    client = Client()
    client.force_login(manager_user)
    client._user = manager_user
    return client


@pytest.fixture
def regular_user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="regular",
        email="regular@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def regular_client(regular_user) -> Client:
    client = Client()
    client.force_login(regular_user)
    client._user = regular_user
    return client


@pytest.fixture
def event_with_manager(manager_user) -> Event:
    event = make_event()
    event.responsible_persons.add(manager_user)
    return event


# ===========================================================================
# Timeline API Tests (1.5.3)
# ===========================================================================


class TestTimelineAPI:
    def test_list_timeline_empty(self, manager_client, event_with_manager):
        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/timeline/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_timeline_entries(self, manager_client, event_with_manager):
        make_timeline_entry(event=event_with_manager, action_type="registered")
        make_timeline_entry(event=event_with_manager, action_type="payment_received")

        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/timeline/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_list_timeline_filter_action_type(self, manager_client, event_with_manager):
        make_timeline_entry(event=event_with_manager, action_type="registered")
        make_timeline_entry(event=event_with_manager, action_type="payment_received")

        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/timeline/?action_type=registered")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["action_type"] == "registered"

    def test_list_timeline_filter_participant(self, manager_client, event_with_manager):
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg)
        make_timeline_entry(event=event_with_manager, participant=p)
        make_timeline_entry(event=event_with_manager, participant=None)

        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/timeline/?participant_id={p.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    def test_list_timeline_permission_denied(self, regular_client, event_with_manager):
        resp = regular_client.get(f"/api/events/{event_with_manager.slug}/timeline/")
        assert resp.status_code == 403

    def test_list_timeline_unauthenticated(self, client, event_with_manager):
        resp = client.get(f"/api/events/{event_with_manager.slug}/timeline/")
        assert resp.status_code == 403


# ===========================================================================
# Payment API Tests (1.5.4)
# ===========================================================================


class TestPaymentAPI:
    def test_list_payments_empty(self, manager_client, event_with_manager):
        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/payments/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_payment(self, manager_client, event_with_manager):
        option = make_booking_option(event=event_with_manager, price=Decimal("45.00"))
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg, booking_option=option)

        payload = {
            "participant_id": p.id,
            "amount": "25.00",
            "method": "bar",
            "received_at": timezone.now().isoformat(),
        }
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/payments/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["amount"] == "25.00"
        assert data["method"] == "bar"
        assert data["participant_id"] == p.id

        # Verify timeline entry was created
        assert TimelineEntry.objects.filter(
            event=event_with_manager,
            action_type=TimelineActionChoices.PAYMENT_RECEIVED,
        ).exists()

    def test_delete_payment(self, manager_client, event_with_manager):
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg)
        payment = make_payment(participant=p)

        resp = manager_client.delete(f"/api/events/{event_with_manager.slug}/payments/{payment.id}/")
        assert resp.status_code == 200
        assert not Payment.objects.filter(id=payment.id).exists()

        # Verify timeline entry for removal
        assert TimelineEntry.objects.filter(
            event=event_with_manager,
            action_type=TimelineActionChoices.PAYMENT_REMOVED,
        ).exists()

    def test_computed_is_paid(self, db):
        """Test that is_paid is computed from payments vs booking option price."""
        event = make_event()
        option = make_booking_option(event=event, price=Decimal("50.00"))
        reg = make_registration(event=event)
        p = make_participant(registration=reg, booking_option=option)

        # No payments yet — not paid
        assert p.is_paid is False
        assert p.total_paid == Decimal("0.00")
        assert p.remaining_amount == Decimal("50.00")

        # Partial payment
        make_payment(participant=p, amount=Decimal("30.00"))
        # Refresh from DB to clear any caching
        p = Participant.objects.get(pk=p.pk)
        assert p.is_paid is False
        assert p.total_paid == Decimal("30.00")
        assert p.remaining_amount == Decimal("20.00")

        # Full payment
        make_payment(participant=p, amount=Decimal("20.00"))
        p = Participant.objects.get(pk=p.pk)
        assert p.is_paid is True
        assert p.total_paid == Decimal("50.00")
        assert p.remaining_amount == Decimal("0.00")

    def test_is_paid_no_booking_option(self, db):
        """Participant without booking option is considered paid."""
        p = make_participant(booking_option=None)
        assert p.is_paid is True
        assert p.remaining_amount == Decimal("0.00")

    def test_payment_permission_denied(self, regular_client, event_with_manager):
        resp = regular_client.get(f"/api/events/{event_with_manager.slug}/payments/")
        assert resp.status_code == 403

    def test_payment_methods_choices(self, manager_client):
        resp = manager_client.get("/api/events/choices/payment-methods/")
        assert resp.status_code == 200
        data = resp.json()
        values = [c["value"] for c in data]
        assert "bar" in values
        assert "paypal" in values
        assert "ueberweisung" in values


# ===========================================================================
# Custom Field API Tests (1.5.5)
# ===========================================================================


class TestCustomFieldAPI:
    def test_create_custom_field(self, manager_client, event_with_manager):
        payload = {
            "label": "T-Shirt Größe",
            "field_type": "select",
            "options": ["S", "M", "L", "XL"],
            "is_required": True,
        }
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/custom-fields/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["label"] == "T-Shirt Größe"
        assert data["field_type"] == "select"
        assert data["options"] == ["S", "M", "L", "XL"]
        assert data["is_required"] is True

    def test_list_custom_fields(self, manager_client, event_with_manager):
        make_custom_field(event=event_with_manager, label="Allergien")
        make_custom_field(event=event_with_manager, label="Ernährung")

        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/custom-fields/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_update_custom_field(self, manager_client, event_with_manager):
        field = make_custom_field(event=event_with_manager)

        payload = {"label": "Updated Label"}
        resp = manager_client.patch(
            f"/api/events/{event_with_manager.slug}/custom-fields/{field.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["label"] == "Updated Label"

    def test_delete_custom_field(self, manager_client, event_with_manager):
        field = make_custom_field(event=event_with_manager)

        resp = manager_client.delete(f"/api/events/{event_with_manager.slug}/custom-fields/{field.id}/")
        assert resp.status_code == 200
        assert not CustomField.objects.filter(id=field.id).exists()

    def test_set_custom_field_values(self, manager_client, event_with_manager):
        field = make_custom_field(event=event_with_manager)
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg)

        payload = {
            "values": [{"custom_field_id": field.id, "value": "L"}],
        }
        resp = manager_client.patch(
            f"/api/events/{event_with_manager.slug}/participants/{p.id}/custom-fields/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["value"] == "L"

    def test_custom_field_permission_denied(self, regular_client, event_with_manager):
        resp = regular_client.get(f"/api/events/{event_with_manager.slug}/custom-fields/")
        assert resp.status_code == 403


# ===========================================================================
# Label API Tests (1.5.6)
# ===========================================================================


class TestLabelAPI:
    def test_create_label(self, manager_client, event_with_manager):
        payload = {"name": "Betreuer", "color": "#FF5733"}
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/labels/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Betreuer"
        assert data["color"] == "#FF5733"

    def test_list_labels(self, manager_client, event_with_manager):
        make_label(event=event_with_manager, name="Betreuer")
        make_label(event=event_with_manager, name="Kind")

        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/labels/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_update_label(self, manager_client, event_with_manager):
        label = make_label(event=event_with_manager)

        payload = {"name": "Updated Label", "color": "#000000"}
        resp = manager_client.patch(
            f"/api/events/{event_with_manager.slug}/labels/{label.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Label"
        assert resp.json()["color"] == "#000000"

    def test_delete_label(self, manager_client, event_with_manager):
        label = make_label(event=event_with_manager)

        resp = manager_client.delete(f"/api/events/{event_with_manager.slug}/labels/{label.id}/")
        assert resp.status_code == 200
        assert not ParticipantLabel.objects.filter(id=label.id).exists()

    def test_assign_label(self, manager_client, event_with_manager):
        label = make_label(event=event_with_manager)
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg)

        payload = {"label_id": label.id}
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/participants/{p.id}/labels/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert label in p.labels.all()

        # Verify timeline entry
        assert TimelineEntry.objects.filter(
            event=event_with_manager,
            action_type=TimelineActionChoices.LABEL_ADDED,
        ).exists()

    def test_remove_label(self, manager_client, event_with_manager):
        label = make_label(event=event_with_manager)
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg)
        p.labels.add(label)

        resp = manager_client.delete(f"/api/events/{event_with_manager.slug}/participants/{p.id}/labels/{label.id}/")
        assert resp.status_code == 200
        assert label not in p.labels.all()

        # Verify timeline entry
        assert TimelineEntry.objects.filter(
            event=event_with_manager,
            action_type=TimelineActionChoices.LABEL_REMOVED,
        ).exists()

    def test_filter_participants_by_label(self, manager_client, event_with_manager):
        label = make_label(event=event_with_manager)
        reg = make_registration(event=event_with_manager)
        p1 = make_participant(registration=reg, first_name="Alice")
        p2 = make_participant(registration=reg, first_name="Bob")
        p1.labels.add(label)

        resp = manager_client.get(f"/api/events/{event_with_manager.slug}/participants/?label_id={label.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["first_name"] == "Alice"

    def test_label_permission_denied(self, regular_client, event_with_manager):
        resp = regular_client.get(f"/api/events/{event_with_manager.slug}/labels/")
        assert resp.status_code == 403


# ===========================================================================
# Timeline Integration Tests (1.5.7)
# ===========================================================================


class TestTimelineIntegration:
    """Test that registration/unregistration/update create timeline entries."""

    def test_registration_creates_timeline_entry(self, manager_client, event_with_manager, manager_user):
        from event.models import Person

        # Create a person for the manager
        person = Person.objects.create(
            user=manager_user,
            first_name="Max",
            last_name="Muster",
            gender="no_answer",
        )
        # Invite the user
        event_with_manager.invited_users.add(manager_user)

        payload = {"persons": [{"person_id": person.id}]}
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/register/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200

        # Verify timeline entry
        entries = TimelineEntry.objects.filter(
            event=event_with_manager,
            action_type=TimelineActionChoices.REGISTERED,
        )
        assert entries.count() == 1
        assert "Max Muster" in entries.first().description

    def test_unregistration_creates_timeline_entry(self, manager_client, event_with_manager):
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg)

        resp = manager_client.delete(f"/api/events/{event_with_manager.slug}/participants/{p.id}/")
        assert resp.status_code == 200

        entries = TimelineEntry.objects.filter(
            event=event_with_manager,
            action_type=TimelineActionChoices.UNREGISTERED,
        )
        assert entries.count() == 1

    def test_participant_update_creates_timeline_entry(self, manager_client, event_with_manager):
        reg = make_registration(event=event_with_manager)
        p = make_participant(registration=reg)

        payload = {"first_name": "Updated"}
        resp = manager_client.patch(
            f"/api/events/{event_with_manager.slug}/participants/{p.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200

        entries = TimelineEntry.objects.filter(
            event=event_with_manager,
            action_type=TimelineActionChoices.PARTICIPANT_UPDATED,
        )
        assert entries.count() == 1
