"""Tests for Export and Statistics APIs (Phase 2)."""

import io
import json
from decimal import Decimal

import pytest
from django.test import Client

from event.models import Event
from event.tests import (
    make_booking_option,
    make_custom_field,
    make_event,
    make_label,
    make_participant,
    make_payment,
    make_registration,
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
def event_with_data(manager_user):
    """Event with booking options, participants, payments, custom fields, labels."""
    event = make_event()
    event.responsible_persons.add(manager_user)

    opt = make_booking_option(event, name="Standard", price=Decimal("50.00"))
    reg = make_registration(user=manager_user, event=event)
    p1 = make_participant(
        registration=reg,
        booking_option=opt,
        first_name="Anna",
        last_name="Schmidt",
        email="anna@example.com",
        gender="female",
    )
    p2 = make_participant(
        registration=reg,
        booking_option=opt,
        first_name="Ben",
        last_name="Mueller",
        email="ben@example.com",
        gender="male",
    )

    # Payment for p1 (fully paid)
    make_payment(participant=p1, amount=Decimal("50.00"))
    # Payment for p2 (partial)
    make_payment(participant=p2, amount=Decimal("20.00"), method="paypal")

    # Custom field
    cf = make_custom_field(event, label="T-Shirt Größe")

    # Label
    label = make_label(event, name="Betreuer", color="#4CAF50")
    p1.labels.add(label)

    return event


# ---------------------------------------------------------------------------
# Export: GET columns
# ---------------------------------------------------------------------------


class TestExportColumnsEndpoint:
    def test_columns_list(self, manager_client, event_with_data):
        resp = manager_client.get(f"/api/events/{event_with_data.slug}/export/columns/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # Should have standard + custom field columns
        ids = [c["id"] for c in data]
        assert "first_name" in ids
        assert "last_name" in ids
        assert "is_paid" in ids
        assert "labels" in ids
        # Custom field column
        cf_cols = [c for c in data if c["type"] == "custom_field"]
        assert len(cf_cols) == 1
        assert cf_cols[0]["label"] == "T-Shirt Größe"

    def test_columns_requires_manager(self, regular_client, event_with_data):
        resp = regular_client.get(f"/api/events/{event_with_data.slug}/export/columns/")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Export: POST export
# ---------------------------------------------------------------------------


class TestExportEndpoint:
    def test_export_excel(self, manager_client, event_with_data):
        resp = manager_client.post(
            f"/api/events/{event_with_data.slug}/export/",
            data=json.dumps(
                {
                    "format": "excel",
                    "columns": ["first_name", "last_name", "email", "is_paid"],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert "spreadsheetml" in resp["Content-Type"]
        assert "attachment" in resp["Content-Disposition"]
        assert resp["Content-Disposition"].endswith('.xlsx"')
        # Verify it's valid Excel by checking file starts with PK (zip)
        assert resp.content[:2] == b"PK"

    def test_export_csv(self, manager_client, event_with_data):
        resp = manager_client.post(
            f"/api/events/{event_with_data.slug}/export/",
            data=json.dumps(
                {
                    "format": "csv",
                    "columns": ["first_name", "last_name", "is_paid"],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert "text/csv" in resp["Content-Type"]
        content = resp.content.decode("utf-8-sig")
        lines = content.strip().split("\n")
        assert len(lines) == 3  # header + 2 participants
        # Header uses semicolons
        assert "Vorname" in lines[0]
        assert ";" in lines[0]

    def test_export_pdf(self, manager_client, event_with_data):
        resp = manager_client.post(
            f"/api/events/{event_with_data.slug}/export/",
            data=json.dumps(
                {
                    "format": "pdf",
                    "columns": ["first_name", "last_name"],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"
        assert resp.content[:5] == b"%PDF-"

    def test_export_all_columns(self, manager_client, event_with_data):
        resp = manager_client.post(
            f"/api/events/{event_with_data.slug}/export/",
            data=json.dumps(
                {
                    "format": "csv",
                    "columns": ["all"],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        content = resp.content.decode("utf-8-sig")
        lines = content.strip().split("\n")
        # Should have many columns (17 standard + 1 custom field)
        header_cols = lines[0].split(";")
        assert len(header_cols) >= 17

    def test_export_with_filter_paid(self, manager_client, event_with_data):
        resp = manager_client.post(
            f"/api/events/{event_with_data.slug}/export/",
            data=json.dumps(
                {
                    "format": "csv",
                    "columns": ["first_name", "is_paid"],
                    "filters": {"is_paid": True},
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        content = resp.content.decode("utf-8-sig")
        lines = content.strip().split("\n")
        # Only Anna (fully paid) should appear
        assert len(lines) == 2  # header + 1 participant
        assert "Anna" in lines[1]

    def test_export_requires_manager(self, regular_client, event_with_data):
        resp = regular_client.post(
            f"/api/events/{event_with_data.slug}/export/",
            data=json.dumps(
                {
                    "format": "csv",
                    "columns": ["first_name"],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


class TestStatsEndpoint:
    def test_stats_response(self, manager_client, event_with_data):
        resp = manager_client.get(f"/api/events/{event_with_data.slug}/stats/")
        assert resp.status_code == 200
        data = resp.json()

        # Capacity
        assert data["capacity"]["total_registered"] == 2
        assert len(data["capacity"]["booking_options"]) == 1
        assert data["capacity"]["booking_options"][0]["current_count"] == 2

        # Payment
        assert data["payment"]["paid_count"] == 1
        assert data["payment"]["unpaid_count"] == 1
        assert float(data["payment"]["total_received"]) == 70.0  # 50 + 20
        assert float(data["payment"]["total_expected"]) == 100.0  # 2 * 50
        assert len(data["payment"]["payment_by_method"]) >= 1

        # Demographics
        assert len(data["demographics"]["gender_distribution"]) >= 1
        genders = {g["gender"] for g in data["demographics"]["gender_distribution"]}
        assert len(genders) >= 2  # male + female

        # Nutrition
        assert "nutritional_summary" in data["nutrition"]

        # Registration timeline
        assert isinstance(data["registration_timeline"], list)

    def test_stats_requires_manager(self, regular_client, event_with_data):
        resp = regular_client.get(f"/api/events/{event_with_data.slug}/stats/")
        assert resp.status_code == 403

    def test_stats_capacity_percentage(self, manager_client, event_with_data):
        resp = manager_client.get(f"/api/events/{event_with_data.slug}/stats/")
        data = resp.json()
        # 2 participants out of 30 max
        opt = data["capacity"]["booking_options"][0]
        assert opt["max_participants"] == 30
        assert opt["current_count"] == 2
        assert opt["fill_percentage"] == pytest.approx(6.7, abs=0.1)

    def test_stats_empty_event(self, manager_client, manager_user):
        """Stats for event with no participants should return zeros."""
        event = make_event(name="Leeres Event")
        event.responsible_persons.add(manager_user)

        resp = manager_client.get(f"/api/events/{event.slug}/stats/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["capacity"]["total_registered"] == 0
        assert data["payment"]["paid_count"] == 0
        assert data["payment"]["unpaid_count"] == 0
        assert data["demographics"]["gender_distribution"] == []
        assert data["registration_timeline"] == []
