"""Tests for WhatsApp messaging feature (tasks 11.1–11.8) and
connection management (health check, test message, reconnect, logs).

Covers models, placeholder service, messaging service, WhatsApp API,
message templates CRUD, rate limiting, phone numbers, reconnect logic,
and the new connection management features.
"""

import json
import time
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from event.choices import WhatsAppMessageStatusChoices
from event.models import (
    MessageTemplate,
    Participant,
    WhatsAppConnection,
    WhatsAppConnectionLog,
    WhatsAppMessage,
)
from event.services.messaging import MessagingService, _mask_email, _mask_phone
from event.services.placeholders import (
    apply_participant_filters,
    get_available_placeholders,
    replace_placeholders,
)
from event.tests import (
    make_booking_option,
    make_event,
    make_label,
    make_participant,
    make_person,
    make_registration,
)

# ---------------------------------------------------------------------------
# 11.1 — WhatsApp Models
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestWhatsAppModels:
    """Test WhatsAppConnection, WhatsAppMessage, and MessageTemplate models."""

    def test_whatsapp_connection_create(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(
            user=user,
            phone_number="+4917012345678",
            session_db_name="inspi_wa_user_1",
            is_active=True,
            connected_at=timezone.now(),
        )
        assert conn.pk is not None
        assert conn.phone_number == "+4917012345678"
        assert conn.is_active is True
        assert conn.total_messages_sent == 0

    def test_whatsapp_connection_str_active(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)
        assert "aktiv" in str(conn)
        assert str(user) in str(conn)

    def test_whatsapp_connection_str_inactive(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=False)
        assert "inaktiv" in str(conn)

    def test_whatsapp_connection_unique_per_user(self, auth_client):
        user = auth_client._user
        WhatsAppConnection.objects.create(user=user)
        with pytest.raises(Exception):
            WhatsAppConnection.objects.create(user=user)

    def test_whatsapp_connection_defaults(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        assert conn.phone_number == ""
        assert conn.session_db_name == ""
        assert conn.is_active is False
        assert conn.total_messages_sent == 0
        assert conn.connected_at is None
        assert conn.privacy_consent_given_at is None
        assert conn.created_at is not None
        assert conn.updated_at is not None

    def test_whatsapp_message_create(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg)

        msg = WhatsAppMessage.objects.create(
            connection=conn,
            event=event,
            participant=participant,
            status=WhatsAppMessageStatusChoices.PENDING,
        )
        assert msg.pk is not None
        assert msg.status == "pending"
        assert msg.sent_at is None
        assert msg.error_message == ""

    def test_whatsapp_message_str(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg)

        msg = WhatsAppMessage.objects.create(
            connection=conn,
            event=event,
            participant=participant,
            status=WhatsAppMessageStatusChoices.SENT,
        )
        assert "WhatsApp an" in str(msg)
        assert "sent" in str(msg)

    def test_whatsapp_message_ordering(self, auth_client):
        """Messages should be ordered by -created_at (newest first)."""
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        event = make_event()
        reg = make_registration(user=user, event=event)
        p1 = make_participant(registration=reg, first_name="Alpha")
        p2 = make_participant(registration=reg, first_name="Beta")

        msg1 = WhatsAppMessage.objects.create(connection=conn, event=event, participant=p1)
        msg2 = WhatsAppMessage.objects.create(connection=conn, event=event, participant=p2)

        messages = list(WhatsAppMessage.objects.all())
        assert messages[0].pk == msg2.pk
        assert messages[1].pk == msg1.pk

    def test_message_template_create(self, auth_client):
        user = auth_client._user
        tmpl = MessageTemplate.objects.create(
            user=user,
            title="Zahlungserinnerung",
            subject="Bitte bezahlen",
            body="Hallo {vorname}, bitte bezahle {restbetrag}.",
            is_system=False,
        )
        assert tmpl.pk is not None
        assert tmpl.title == "Zahlungserinnerung"
        assert tmpl.is_system is False

    def test_message_template_system(self):
        tmpl = MessageTemplate.objects.create(
            user=None,
            title="Willkommen",
            body="Willkommen bei {event_name}!",
            is_system=True,
        )
        assert tmpl.user is None
        assert tmpl.is_system is True

    def test_message_template_str(self, auth_client):
        user = auth_client._user
        user_tmpl = MessageTemplate.objects.create(user=user, title="Mein Template", body="test")
        sys_tmpl = MessageTemplate.objects.create(user=None, title="System Template", body="test", is_system=True)
        assert str(user_tmpl) == "Mein Template"
        assert str(sys_tmpl) == "[System] System Template"

    def test_message_template_ordering(self, auth_client):
        """System templates first, then alphabetical by title."""
        user = auth_client._user
        t_user_b = MessageTemplate.objects.create(user=user, title="Beta", body="b")
        t_user_a = MessageTemplate.objects.create(user=user, title="Alpha", body="a")
        t_sys = MessageTemplate.objects.create(user=None, title="Zed", body="z", is_system=True)

        templates = list(MessageTemplate.objects.all())
        assert templates[0].pk == t_sys.pk  # system first
        assert templates[1].pk == t_user_a.pk  # then alpha
        assert templates[2].pk == t_user_b.pk  # then beta

    def test_message_template_subject_default(self, auth_client):
        user = auth_client._user
        tmpl = MessageTemplate.objects.create(user=user, title="Test", body="body")
        assert tmpl.subject == ""


# ---------------------------------------------------------------------------
# 11.2 — Placeholder Service
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPlaceholderService:
    """Test replace_placeholders, get_available_placeholders, apply_participant_filters."""

    def _make_setup(self, auth_client, price="45.00"):
        user = auth_client._user
        event = make_event(name="Sommerlager 2026")
        option = make_booking_option(event=event, price=Decimal(price))
        reg = make_registration(user=user, event=event)
        participant = make_participant(
            registration=reg,
            booking_option=option,
            first_name="Luna",
            last_name="Adler",
            scout_name="Eule",
        )
        return event, participant

    def test_replace_all_placeholders(self, auth_client):
        event, participant = self._make_setup(auth_client)
        text = (
            "Hallo {vorname} {nachname} ({pfadiname}), "
            "du bist für {event_name} angemeldet. "
            "Buchungsoption: {buchungsoption}. "
            "Preis: {preis}. Bezahlt: {bezahlt}. Rest: {restbetrag}."
        )
        result = replace_placeholders(text, participant, event)
        assert "Luna" in result
        assert "Adler" in result
        assert "Eule" in result
        assert "Sommerlager 2026" in result
        assert "45.00" in result
        assert "0.00" in result  # nothing paid yet

    def test_replace_vorname(self, auth_client):
        event, participant = self._make_setup(auth_client)
        result = replace_placeholders("Hallo {vorname}!", participant, event)
        assert result == "Hallo Luna!"

    def test_replace_nachname(self, auth_client):
        event, participant = self._make_setup(auth_client)
        result = replace_placeholders("{nachname}", participant, event)
        assert result == "Adler"

    def test_replace_pfadiname(self, auth_client):
        event, participant = self._make_setup(auth_client)
        result = replace_placeholders("{pfadiname}", participant, event)
        assert result == "Eule"

    def test_replace_event_name(self, auth_client):
        event, participant = self._make_setup(auth_client)
        result = replace_placeholders("Event: {event_name}", participant, event)
        assert result == "Event: Sommerlager 2026"

    def test_replace_preis(self, auth_client):
        event, participant = self._make_setup(auth_client)
        result = replace_placeholders("{preis}", participant, event)
        assert "45.00" in result

    def test_replace_bezahlt(self, auth_client):
        event, participant = self._make_setup(auth_client)
        result = replace_placeholders("{bezahlt}", participant, event)
        assert "0.00" in result

    def test_replace_restbetrag(self, auth_client):
        event, participant = self._make_setup(auth_client)
        result = replace_placeholders("{restbetrag}", participant, event)
        assert "45.00" in result

    def test_replace_no_booking_option_price(self, auth_client):
        user = auth_client._user
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg, booking_option=None)
        result = replace_placeholders("{preis}", participant, event)
        assert "0.00" in result

    def test_replace_missing_scout_name(self, auth_client):
        user = auth_client._user
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg, scout_name="", first_name="Max")
        result = replace_placeholders("Hi {pfadiname}!", participant, event)
        assert result == "Hi !"

    def test_partial_text_no_placeholders(self, auth_client):
        event, participant = self._make_setup(auth_client)
        text = "Keine Platzhalter hier."
        result = replace_placeholders(text, participant, event)
        assert result == text

    def test_get_available_placeholders(self):
        placeholders = get_available_placeholders()
        assert isinstance(placeholders, list)
        assert len(placeholders) == 8
        keys = [p["key"] for p in placeholders]
        assert "{vorname}" in keys
        assert "{nachname}" in keys
        assert "{restbetrag}" in keys

    def test_apply_participant_filters_booking_option(self, auth_client):
        user = auth_client._user
        event = make_event()
        opt_a = make_booking_option(event=event, name="Option A")
        opt_b = make_booking_option(event=event, name="Option B")
        reg = make_registration(user=user, event=event)
        make_participant(registration=reg, booking_option=opt_a, first_name="P1")
        make_participant(registration=reg, booking_option=opt_b, first_name="P2")

        qs = Participant.objects.filter(registration__event=event)
        filtered = apply_participant_filters(qs, {"booking_option_id": opt_a.id})
        assert filtered.count() == 1
        assert filtered.first().first_name == "P1"

    def test_apply_participant_filters_label(self, auth_client):
        user = auth_client._user
        event = make_event()
        reg = make_registration(user=user, event=event)
        label = make_label(event=event, name="VIP")
        p1 = make_participant(registration=reg, first_name="Tagged")
        p1.labels.add(label)
        make_participant(registration=reg, first_name="Untagged")

        qs = Participant.objects.filter(registration__event=event)
        filtered = apply_participant_filters(qs, {"label_id": label.id})
        assert filtered.count() == 1
        assert filtered.first().first_name == "Tagged"


# ---------------------------------------------------------------------------
# 11.3 — MessagingService Preview + mask helpers
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMessagingServicePreview:
    """Test MessagingService.preview and _mask_email / _mask_phone helpers."""

    def test_mask_email_normal(self):
        assert _mask_email("test@example.com") == "t***@example.com"

    def test_mask_email_single_char(self):
        assert _mask_email("a@example.com") == "a***@example.com"

    def test_mask_email_empty(self):
        assert _mask_email("") == ""

    def test_mask_email_no_at(self):
        assert _mask_email("invalid") == "invalid"

    def test_mask_phone_normal(self):
        result = _mask_phone("+4917012345678")
        assert result.endswith("5678")
        assert "***" in result

    def test_mask_phone_short(self):
        result = _mask_phone("1234")
        assert result == "1234"

    def test_mask_phone_empty(self):
        assert _mask_phone("") == ""

    @patch("event.services.messaging.WhatsAppService")
    def test_preview_email_channel(self, MockWAService, auth_client):
        user = auth_client._user
        event = make_event()
        event.responsible_persons.add(user)
        reg = make_registration(user=user, event=event)
        make_participant(
            registration=reg,
            first_name="Max",
            last_name="Muster",
            email="max@example.com",
        )

        result = MessagingService.preview(
            event=event,
            channel="email",
            body="Hallo {vorname}!",
            recipient_type="all",
            user=user,
        )

        assert result["total_count"] == 1
        assert result["channel"] == "email"
        assert result["reachable_count"] == 1
        assert "Hallo Max!" in result["sample_message"]
        assert result["recipients"][0]["whatsapp_status"] == "not_applicable"

    @patch("event.services.messaging.WhatsAppService")
    def test_preview_whatsapp_channel(self, MockWAService, auth_client):
        mock_instance = MockWAService.return_value
        mock_instance.check_whatsapp_availability.return_value = {"+4917012345678": True}

        user = auth_client._user
        event = make_event()
        event.responsible_persons.add(user)
        reg = make_registration(user=user, event=event)
        make_participant(
            registration=reg,
            first_name="Max",
            last_name="Muster",
            phone_number="+4917012345678",
        )

        result = MessagingService.preview(
            event=event,
            channel="whatsapp",
            body="Hallo {vorname}!",
            recipient_type="all",
            user=user,
        )

        assert result["total_count"] == 1
        assert result["channel"] == "whatsapp"
        assert "Hallo Max!" in result["sample_message"]

    @patch("event.services.messaging.WhatsAppService")
    def test_preview_selected_participants(self, MockWAService, auth_client):
        user = auth_client._user
        event = make_event()
        event.responsible_persons.add(user)
        reg = make_registration(user=user, event=event)
        p1 = make_participant(registration=reg, first_name="A", email="a@example.com")
        make_participant(registration=reg, first_name="B", email="b@example.com")

        result = MessagingService.preview(
            event=event,
            channel="email",
            body="Hi {vorname}",
            recipient_type="selected",
            user=user,
            participant_ids=[p1.id],
        )

        assert result["total_count"] == 1
        assert result["recipients"][0]["name"] == "A Mustermann"

    @patch("event.services.messaging.WhatsAppService")
    def test_preview_no_participants(self, MockWAService, auth_client):
        user = auth_client._user
        event = make_event()

        result = MessagingService.preview(
            event=event,
            channel="email",
            body="Hi",
            recipient_type="all",
            user=user,
        )

        assert result["total_count"] == 0
        assert result["sample_message"] == ""


# ---------------------------------------------------------------------------
# 11.4 — WhatsApp API
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestWhatsAppAPI:
    """Test WhatsApp connection API endpoints."""

    def test_connect_unauthenticated(self, api_client):
        resp = api_client.post(
            "/api/whatsapp/connect/",
            data=json.dumps({"privacy_consent": True}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_status_unauthenticated(self, api_client):
        resp = api_client.get("/api/whatsapp/status/")
        assert resp.status_code == 403

    def test_disconnect_unauthenticated(self, api_client):
        resp = api_client.post("/api/whatsapp/disconnect/")
        assert resp.status_code == 403

    def test_delete_unauthenticated(self, api_client):
        resp = api_client.delete("/api/whatsapp/delete/")
        assert resp.status_code == 403

    def test_stats_unauthenticated(self, api_client):
        resp = api_client.get("/api/whatsapp/stats/")
        assert resp.status_code == 403

    def test_qr_status_unauthenticated(self, api_client):
        resp = api_client.get("/api/whatsapp/qr-status/")
        assert resp.status_code == 403

    @patch("event.api.whatsapp._wa_service")
    def test_connect_requires_privacy_consent(self, mock_service, auth_client):
        resp = auth_client.post(
            "/api/whatsapp/connect/",
            data=json.dumps({"privacy_consent": False}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    @patch("event.api.whatsapp._wa_service")
    def test_connect_with_consent(self, mock_service, auth_client):
        mock_service.connect.return_value = {
            "status": "pending_qr",
            "qr_code_base64": "abc123",
            "phone_number": None,
        }
        resp = auth_client.post(
            "/api/whatsapp/connect/",
            data=json.dumps({"privacy_consent": True}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending_qr"
        mock_service.connect.assert_called_once()

        # Check consent was recorded
        conn = WhatsAppConnection.objects.get(user=auth_client._user)
        assert conn.privacy_consent_given_at is not None

    @patch("event.api.whatsapp._wa_service")
    def test_status_endpoint(self, mock_service, auth_client):
        mock_service.get_connection_status.return_value = {
            "is_connected": False,
            "phone_number": None,
            "connected_since": None,
            "total_messages_sent": 0,
        }
        resp = auth_client.get("/api/whatsapp/status/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_connected"] is False

    @patch("event.api.whatsapp._wa_service")
    def test_disconnect_endpoint(self, mock_service, auth_client):
        mock_service.disconnect.return_value = None
        resp = auth_client.post("/api/whatsapp/disconnect/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        mock_service.disconnect.assert_called_once()

    @patch("event.api.whatsapp._wa_service")
    def test_delete_endpoint(self, mock_service, auth_client):
        mock_service.delete_data.return_value = None
        resp = auth_client.delete("/api/whatsapp/delete/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        mock_service.delete_data.assert_called_once()

    @patch("event.api.whatsapp._wa_service")
    def test_stats_endpoint(self, mock_service, auth_client):
        mock_service.get_stats.return_value = {
            "total_sent": 42,
            "sent_today": 5,
            "sent_this_week": 20,
            "last_sent_at": None,
        }
        resp = auth_client.get("/api/whatsapp/stats/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_sent"] == 42

    @patch("event.api.whatsapp._wa_service")
    def test_qr_status_endpoint(self, mock_service, auth_client):
        mock_service.get_qr_status.return_value = {
            "status": "disconnected",
            "qr_code_base64": None,
            "phone_number": None,
        }
        resp = auth_client.get("/api/whatsapp/qr-status/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "disconnected"


# ---------------------------------------------------------------------------
# 11.5 — Message Template CRUD
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMessageTemplateCRUD:
    """Test message template list/create/update/delete via API."""

    def test_list_templates_unauthenticated(self, api_client):
        resp = api_client.get("/api/message-templates/")
        assert resp.status_code == 403

    def test_create_template(self, auth_client):
        resp = auth_client.post(
            "/api/message-templates/",
            data=json.dumps(
                {
                    "title": "Erinnerung",
                    "subject": "Erinnerung an Event",
                    "body": "Hallo {vorname}, vergiss nicht...",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Erinnerung"
        assert data["is_system"] is False

    def test_list_templates_includes_system_and_own(self, auth_client):
        user = auth_client._user
        # Create a system template
        MessageTemplate.objects.create(user=None, title="System", body="sys", is_system=True)
        # Create a user template
        MessageTemplate.objects.create(user=user, title="Mine", body="mine")
        # Create another user's template (should NOT appear)
        from django.contrib.auth import get_user_model

        User = get_user_model()
        other_user = User.objects.create_user(username="other", password="pass123")
        MessageTemplate.objects.create(user=other_user, title="Other's", body="other")

        resp = auth_client.get("/api/message-templates/")
        assert resp.status_code == 200
        data = resp.json()
        titles = [t["title"] for t in data]
        assert "System" in titles
        assert "Mine" in titles
        assert "Other's" not in titles

    def test_update_own_template(self, auth_client):
        user = auth_client._user
        tmpl = MessageTemplate.objects.create(user=user, title="Old Title", body="old body")
        resp = auth_client.put(
            f"/api/message-templates/{tmpl.id}/",
            data=json.dumps({"title": "New Title", "body": "new body"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "New Title"
        assert data["body"] == "new body"

    def test_cannot_update_system_template(self, auth_client):
        sys_tmpl = MessageTemplate.objects.create(user=None, title="System", body="sys", is_system=True)
        resp = auth_client.put(
            f"/api/message-templates/{sys_tmpl.id}/",
            data=json.dumps({"title": "Hacked"}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_cannot_update_other_users_template(self, auth_client):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        other = User.objects.create_user(username="other2", password="p")
        tmpl = MessageTemplate.objects.create(user=other, title="Other", body="body")
        resp = auth_client.put(
            f"/api/message-templates/{tmpl.id}/",
            data=json.dumps({"title": "Stolen"}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_delete_own_template(self, auth_client):
        user = auth_client._user
        tmpl = MessageTemplate.objects.create(user=user, title="Delete Me", body="bye")
        resp = auth_client.delete(f"/api/message-templates/{tmpl.id}/")
        assert resp.status_code == 200
        assert not MessageTemplate.objects.filter(id=tmpl.id).exists()

    def test_cannot_delete_system_template(self, auth_client):
        sys_tmpl = MessageTemplate.objects.create(user=None, title="System", body="sys", is_system=True)
        resp = auth_client.delete(f"/api/message-templates/{sys_tmpl.id}/")
        assert resp.status_code == 404
        assert MessageTemplate.objects.filter(id=sys_tmpl.id).exists()

    def test_partial_update_template(self, auth_client):
        user = auth_client._user
        tmpl = MessageTemplate.objects.create(user=user, title="Keep", subject="Keep Sub", body="Keep Body")
        resp = auth_client.put(
            f"/api/message-templates/{tmpl.id}/",
            data=json.dumps({"body": "Changed Body"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Keep"
        assert data["subject"] == "Keep Sub"
        assert data["body"] == "Changed Body"


# ---------------------------------------------------------------------------
# 11.6 — Rate Limiting
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRateLimiting:
    """Test WhatsAppService._check_rate_limit."""

    def test_under_limit_returns_true(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg)

        # Create fewer messages than the limit
        for i in range(5):
            WhatsAppMessage.objects.create(
                connection=conn,
                event=event,
                participant=participant,
                status="sent",
                sent_at=timezone.now(),
            )

        service = WhatsAppService()
        assert service._check_rate_limit(conn) is True

    def test_at_limit_returns_false(self, auth_client, settings):
        from event.services.whatsapp import WhatsAppService

        settings.WHATSAPP_RATE_LIMIT_PER_HOUR = 10

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg)

        # Create exactly 10 messages (at the limit)
        for i in range(10):
            WhatsAppMessage.objects.create(
                connection=conn,
                event=event,
                participant=participant,
                status="sent",
                sent_at=timezone.now(),
            )

        service = WhatsAppService()
        assert service._check_rate_limit(conn) is False

    def test_old_messages_dont_count(self, auth_client, settings):
        from event.services.whatsapp import WhatsAppService

        settings.WHATSAPP_RATE_LIMIT_PER_HOUR = 5

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg)

        # Create messages older than 1 hour
        old_time = timezone.now() - timedelta(hours=2)
        for i in range(10):
            msg = WhatsAppMessage.objects.create(
                connection=conn,
                event=event,
                participant=participant,
                status="sent",
            )
            # Manually set sent_at to bypass auto_now
            WhatsAppMessage.objects.filter(pk=msg.pk).update(sent_at=old_time)

        service = WhatsAppService()
        assert service._check_rate_limit(conn) is True

    def test_failed_messages_dont_count(self, auth_client, settings):
        from event.services.whatsapp import WhatsAppService

        settings.WHATSAPP_RATE_LIMIT_PER_HOUR = 5

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg)

        # Create failed messages — should not count toward limit
        for i in range(10):
            WhatsAppMessage.objects.create(
                connection=conn,
                event=event,
                participant=participant,
                status="failed",
                sent_at=timezone.now(),
            )

        service = WhatsAppService()
        assert service._check_rate_limit(conn) is True


# ---------------------------------------------------------------------------
# 11.7 — Phone Number on Person and Participant
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPhoneNumber:
    """Test phone_number field on Person and Participant."""

    def test_person_with_phone_number(self, auth_client):
        person = make_person(user=auth_client._user, phone_number="+4917012345678")
        assert person.phone_number == "+4917012345678"

    def test_person_phone_number_default(self, auth_client):
        person = make_person(user=auth_client._user)
        # Default from factory does not set phone_number, so it's ""
        assert person.phone_number == ""

    def test_participant_with_phone_number(self, auth_client):
        user = auth_client._user
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg, phone_number="+4917098765432")
        assert participant.phone_number == "+4917098765432"

    def test_participant_phone_number_default(self, auth_client):
        user = auth_client._user
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = make_participant(registration=reg)
        assert participant.phone_number == ""

    def test_create_from_person_copies_phone(self, auth_client):
        user = auth_client._user
        person = make_person(user=user, phone_number="+49123456789")
        event = make_event()
        reg = make_registration(user=user, event=event)
        participant = Participant.create_from_person(reg, person)
        assert participant.phone_number == "+49123456789"

    def test_phone_number_max_length(self, auth_client):
        """Phone number field has max_length=20."""
        user = auth_client._user
        person = make_person(user=user, phone_number="+" + "1" * 19)
        assert len(person.phone_number) == 20


# ---------------------------------------------------------------------------
# 11.8 — Reconnect Logic (WhatsAppClientManager)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReconnectLogic:
    """Test WhatsAppClientManager.get_or_create_client caching and locking."""

    def test_get_or_create_client_caching(self, auth_client):
        """Second call returns cached client, not a new one."""
        from event.services.whatsapp import WhatsAppClientManager

        user = auth_client._user
        manager = WhatsAppClientManager()
        # Reset singleton state for isolation
        manager._clients = {}
        manager._statuses = {}

        mock_client = MagicMock()

        with (
            patch.object(manager, "_acquire_advisory_lock", return_value=True),
            patch(
                "event.services.whatsapp._import_neonize",
                return_value=MagicMock(return_value=mock_client),
            ),
        ):
            client1 = manager.get_or_create_client(user)
            # Second call should return cached client
            client2 = manager.get_or_create_client(user)

        assert client1 is client2

    def test_get_or_create_client_lock_failure(self, auth_client):
        """Advisory lock failure raises RuntimeError."""
        from event.services.whatsapp import WhatsAppClientManager

        user = auth_client._user
        manager = WhatsAppClientManager()
        manager._clients = {}
        manager._statuses = {}

        with patch.object(manager, "_acquire_advisory_lock", return_value=False):
            with pytest.raises(RuntimeError, match="bereits auf einer anderen Instanz"):
                manager.get_or_create_client(user)

    def test_get_or_create_client_sets_status(self, auth_client):
        """New client should be set to 'initializing' status."""
        from event.services.whatsapp import WhatsAppClientManager

        user = auth_client._user
        manager = WhatsAppClientManager()
        manager._clients = {}
        manager._statuses = {}

        mock_client = MagicMock()

        with (
            patch.object(manager, "_acquire_advisory_lock", return_value=True),
            patch(
                "event.services.whatsapp._import_neonize",
                return_value=MagicMock(return_value=mock_client),
            ),
        ):
            manager.get_or_create_client(user)

        assert manager._statuses[user.id] == "initializing"

    def test_disconnect_cleans_up_client(self, auth_client):
        """Disconnecting should remove client from caches."""
        from event.services.whatsapp import WhatsAppClientManager

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=True)
        manager = WhatsAppClientManager()

        mock_client = MagicMock()
        manager._clients[user.id] = mock_client
        manager._statuses[user.id] = "connected"
        manager._qr_codes[user.id] = "abc"

        manager.disconnect_client(user)

        assert user.id not in manager._clients
        assert user.id not in manager._statuses
        assert user.id not in manager._qr_codes
        mock_client.disconnect.assert_called_once()

        # DB record should be inactive
        conn = WhatsAppConnection.objects.get(user=user)
        assert conn.is_active is False

    def test_is_on_whatsapp_not_connected(self, auth_client):
        """When not connected, returns False for all numbers."""
        from event.services.whatsapp import WhatsAppClientManager

        user = auth_client._user
        manager = WhatsAppClientManager()
        manager._clients = {}
        manager._statuses = {}

        result = manager.is_on_whatsapp(user, ["+4917012345678", "+4917087654321"])
        assert result == {"+4917012345678": False, "+4917087654321": False}

    def test_is_on_whatsapp_connected(self, auth_client):
        """When connected, delegates to neonize client."""
        from event.services.whatsapp import WhatsAppClientManager

        user = auth_client._user
        manager = WhatsAppClientManager()

        mock_client = MagicMock()
        mock_result_1 = MagicMock(query="+4917012345678", is_in=True)
        mock_result_2 = MagicMock(query="+4917087654321", is_in=False)
        mock_client.is_on_whatsapp.return_value = [mock_result_1, mock_result_2]

        manager._clients[user.id] = mock_client
        manager._statuses[user.id] = "connected"

        result = manager.is_on_whatsapp(user, ["+4917012345678", "+4917087654321"])
        assert result["+4917012345678"] is True
        assert result["+4917087654321"] is False

    def test_get_status_disconnected(self, auth_client):
        """Default status for unknown user is 'disconnected'."""
        from event.services.whatsapp import WhatsAppClientManager

        user = auth_client._user
        manager = WhatsAppClientManager()
        manager._statuses = {}

        assert manager.get_status(user) == "disconnected"

    def test_build_session_name(self, auth_client):
        from event.services.whatsapp import _build_session_name

        user = auth_client._user
        name = _build_session_name(user.id)
        assert name == f"inspi_wa_user_{user.id}"

    def test_advisory_lock_id_stable(self, auth_client):
        from event.services.whatsapp import _advisory_lock_id

        user = auth_client._user
        id1 = _advisory_lock_id(user.id)
        id2 = _advisory_lock_id(user.id)
        assert id1 == id2
        assert isinstance(id1, int)
        assert id1 >= 0


# ---------------------------------------------------------------------------
# 12.1 — WhatsAppConnectionLog Model
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestWhatsAppConnectionLogModel:
    """Test WhatsAppConnectionLog model creation, defaults, and auto-cleanup."""

    def test_connection_log_create(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)
        log = WhatsAppConnectionLog.objects.create(
            connection=conn,
            event_type="connected",
            message="Verbindung hergestellt",
        )
        assert log.pk is not None
        assert log.event_type == "connected"
        assert log.message == "Verbindung hergestellt"
        assert log.created_at is not None

    def test_connection_log_str(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        log = WhatsAppConnectionLog.objects.create(
            connection=conn,
            event_type="health_check_ok",
            message="Verbindung aktiv",
        )
        result = str(log)
        assert "health_check_ok" in result
        assert "Verbindung aktiv" in result

    def test_connection_log_ordering(self, auth_client):
        """Logs should be ordered newest first (-created_at)."""
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        log1 = WhatsAppConnectionLog.objects.create(connection=conn, event_type="connected", message="first")
        log2 = WhatsAppConnectionLog.objects.create(connection=conn, event_type="disconnected", message="second")
        logs = list(WhatsAppConnectionLog.objects.all())
        assert logs[0].pk == log2.pk
        assert logs[1].pk == log1.pk

    def test_connection_log_message_default(self, auth_client):
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        log = WhatsAppConnectionLog.objects.create(connection=conn, event_type="connected")
        assert log.message == ""

    def test_connection_log_cascade_delete(self, auth_client):
        """Deleting a connection should cascade-delete its logs."""
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        WhatsAppConnectionLog.objects.create(connection=conn, event_type="connected", message="test")
        assert WhatsAppConnectionLog.objects.count() == 1
        conn.delete()
        assert WhatsAppConnectionLog.objects.count() == 0

    def test_connection_log_event_type_choices(self, auth_client):
        """All defined event types should be accepted."""
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        event_types = [
            "connected",
            "disconnected",
            "health_check_ok",
            "health_check_failed",
            "reconnect_success",
            "reconnect_failed",
            "test_sent",
            "test_failed",
        ]
        for et in event_types:
            log = WhatsAppConnectionLog.objects.create(connection=conn, event_type=et, message=f"test {et}")
            assert log.event_type == et

    def test_log_event_auto_cleanup(self, auth_client):
        """_log_event should keep max 50 entries per connection."""
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)

        service = WhatsAppService()

        # Create 52 log entries
        for i in range(52):
            service._log_event(user, "connected", f"entry {i}")

        log_count = WhatsAppConnectionLog.objects.filter(connection=conn).count()
        assert log_count == 50

    def test_log_event_no_connection(self, auth_client):
        """_log_event should gracefully handle user without connection."""
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        service = WhatsAppService()
        # Should not raise
        service._log_event(user, "connected", "no connection")
        assert WhatsAppConnectionLog.objects.count() == 0

    def test_last_health_check_at_field(self, auth_client):
        """last_health_check_at should be nullable and settable."""
        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        assert conn.last_health_check_at is None

        now = timezone.now()
        conn.last_health_check_at = now
        conn.save(update_fields=["last_health_check_at"])
        conn.refresh_from_db()
        assert conn.last_health_check_at is not None


# ---------------------------------------------------------------------------
# 12.2 — Health Check Service
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHealthCheckService:
    """Test WhatsAppService.health_check method."""

    def test_health_check_no_connection(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        service = WhatsAppService()
        result = service.health_check(user)

        assert result["is_healthy"] is False
        assert result["status"] == "disconnected"
        assert "Keine WhatsApp-Verbindung" in result["message"]
        assert "checked_at" in result

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_health_check_connected(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=True)

        mock_manager = MockManager.return_value
        mock_manager.get_status.return_value = "connected"

        service = WhatsAppService()
        service._manager = mock_manager

        result = service.health_check(user)

        assert result["is_healthy"] is True
        assert result["status"] == "connected"

        # Check that last_health_check_at was updated
        conn = WhatsAppConnection.objects.get(user=user)
        assert conn.last_health_check_at is not None

        # Check that a log entry was created
        assert WhatsAppConnectionLog.objects.filter(connection=conn, event_type="health_check_ok").exists()

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_health_check_reconnect_success(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=False)

        mock_manager = MockManager.return_value
        # First call: not connected; after start_client_in_thread: connected
        call_count = [0]

        def get_status_side_effect(u):
            call_count[0] += 1
            if call_count[0] <= 1:
                return "disconnected"
            return "connected"

        mock_manager.get_status.side_effect = get_status_side_effect
        mock_manager.get_or_create_client.return_value = MagicMock()

        service = WhatsAppService()
        service._manager = mock_manager

        with patch("event.services.whatsapp.time.sleep"):
            result = service.health_check(user)

        assert result["is_healthy"] is True
        assert result["status"] == "connected"

        conn = WhatsAppConnection.objects.get(user=user)
        assert conn.is_active is True

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_health_check_session_invalid(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=True)

        mock_manager = MockManager.return_value
        mock_manager.get_status.return_value = "disconnected"
        mock_manager.get_or_create_client.return_value = MagicMock()

        service = WhatsAppService()
        service._manager = mock_manager

        with patch("event.services.whatsapp.time.sleep"):
            result = service.health_check(user)

        assert result["is_healthy"] is False
        assert result["status"] == "session_invalid"

        conn = WhatsAppConnection.objects.get(user=user)
        assert conn.is_active is False

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_health_check_neonize_unavailable(self, MockManager, auth_client):
        from event.services.whatsapp import NeonizeUnavailableError, WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=True)

        mock_manager = MockManager.return_value
        mock_manager.get_status.return_value = "disconnected"
        mock_manager.get_or_create_client.side_effect = NeonizeUnavailableError("not available")

        service = WhatsAppService()
        service._manager = mock_manager

        result = service.health_check(user)

        assert result["is_healthy"] is False
        assert result["status"] == "error"
        assert "not available" in result["message"]


# ---------------------------------------------------------------------------
# 12.3 — Test Message Service
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendTestMessage:
    """Test WhatsAppService.send_test_message method."""

    def test_test_message_no_connection(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        service = WhatsAppService()
        result = service.send_test_message(user)

        assert result["success"] is False
        assert "nicht verbunden" in result["message"]

    def test_test_message_no_phone(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=True, phone_number="")

        service = WhatsAppService()
        result = service.send_test_message(user)

        assert result["success"] is False
        assert "Telefonnummer" in result["message"]

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_test_message_success(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True, phone_number="+4917012345678")

        mock_manager = MockManager.return_value
        mock_manager.send_message.return_value = None

        service = WhatsAppService()
        service._manager = mock_manager
        # Clear any previous test timestamps
        service._test_message_timestamps.pop(user.id, None)

        result = service.send_test_message(user)

        assert result["success"] is True
        assert "erfolgreich" in result["message"]

        # Verify message log was created
        msg = WhatsAppMessage.objects.filter(connection=conn).first()
        assert msg is not None
        assert msg.status == "sent"
        assert msg.event is None  # test messages have no event
        assert msg.participant is None  # test messages have no participant

        # Verify connection log was created
        assert WhatsAppConnectionLog.objects.filter(connection=conn, event_type="test_sent").exists()

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_test_message_rate_limit(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=True, phone_number="+4917012345678")

        service = WhatsAppService()
        service._manager = MockManager.return_value
        # Set a recent test timestamp
        service._test_message_timestamps[user.id] = time.time()

        result = service.send_test_message(user)

        assert result["success"] is False
        assert "Minute" in result["message"]

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_test_message_send_failure(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True, phone_number="+4917012345678")

        mock_manager = MockManager.return_value
        mock_manager.send_message.side_effect = RuntimeError("Netzwerkfehler")

        service = WhatsAppService()
        service._manager = mock_manager
        service._test_message_timestamps.pop(user.id, None)

        result = service.send_test_message(user)

        assert result["success"] is False
        assert "Netzwerkfehler" in result["message"]

        # Verify message log was created with failed status
        msg = WhatsAppMessage.objects.filter(connection=conn).first()
        assert msg is not None
        assert msg.status == "failed"

        # Verify connection log
        assert WhatsAppConnectionLog.objects.filter(connection=conn, event_type="test_failed").exists()


# ---------------------------------------------------------------------------
# 12.4 — Reconnect Service
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReconnectService:
    """Test WhatsAppService.reconnect method."""

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_reconnect_already_connected(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=False)

        mock_manager = MockManager.return_value
        mock_manager.get_status.return_value = "connected"

        service = WhatsAppService()
        service._manager = mock_manager

        result = service.reconnect(user)

        assert result["success"] is True
        assert result["needs_qr"] is False
        assert result["status"] == "connected"

        # Connection should be marked active
        conn.refresh_from_db()
        assert conn.is_active is True

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_reconnect_session_success(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=False)

        mock_manager = MockManager.return_value
        call_count = [0]

        def get_status_side_effect(u):
            call_count[0] += 1
            if call_count[0] <= 1:
                return "disconnected"  # first check (before start)
            return "connected"  # after start

        mock_manager.get_status.side_effect = get_status_side_effect

        service = WhatsAppService()
        service._manager = mock_manager

        with patch("event.services.whatsapp.time.sleep"):
            result = service.reconnect(user)

        assert result["success"] is True
        assert result["needs_qr"] is False
        assert result["status"] == "connected"

        conn.refresh_from_db()
        assert conn.is_active is True

        # Verify reconnect_success log
        assert WhatsAppConnectionLog.objects.filter(connection=conn, event_type="reconnect_success").exists()

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_reconnect_needs_qr(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=False)

        mock_manager = MockManager.return_value
        call_count = [0]

        def get_status_side_effect(u):
            call_count[0] += 1
            if call_count[0] <= 1:
                return "disconnected"  # first check
            return "pending_qr"  # after start — session invalid

        mock_manager.get_status.side_effect = get_status_side_effect

        service = WhatsAppService()
        service._manager = mock_manager

        with patch("event.services.whatsapp.time.sleep"):
            result = service.reconnect(user)

        assert result["success"] is False
        assert result["needs_qr"] is True
        assert result["status"] == "pending_qr"

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_reconnect_timeout(self, MockManager, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=False)

        mock_manager = MockManager.return_value
        mock_manager.get_status.return_value = "disconnected"  # first: not connected
        # After starting, never connects and never shows QR
        call_count = [0]

        def get_status_side_effect(u):
            call_count[0] += 1
            if call_count[0] <= 1:
                return "disconnected"
            return "initializing"  # stays in initializing

        mock_manager.get_status.side_effect = get_status_side_effect

        service = WhatsAppService()
        service._manager = mock_manager

        with patch("event.services.whatsapp.time.sleep"):
            result = service.reconnect(user)

        assert result["success"] is False
        assert result["needs_qr"] is True
        assert "Timeout" in result["message"]

    @patch("event.services.whatsapp.WhatsAppClientManager")
    def test_reconnect_neonize_error(self, MockManager, auth_client):
        from event.services.whatsapp import NeonizeUnavailableError, WhatsAppService

        user = auth_client._user
        WhatsAppConnection.objects.create(user=user, is_active=False)

        mock_manager = MockManager.return_value
        mock_manager.get_status.return_value = "disconnected"
        mock_manager._cleanup_client.return_value = None
        mock_manager.start_client_in_thread.side_effect = NeonizeUnavailableError("not available")

        service = WhatsAppService()
        service._manager = mock_manager

        result = service.reconnect(user)

        assert result["success"] is False
        assert result["needs_qr"] is False
        assert result["status"] == "failed"


# ---------------------------------------------------------------------------
# 12.5 — API Endpoint Tests (Health Check, Test, Reconnect, Logs)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestConnectionManagementAPI:
    """Test the 4 new WhatsApp API endpoints."""

    # -- Auth checks --

    def test_health_check_unauthenticated(self, api_client):
        resp = api_client.post("/api/whatsapp/health-check/")
        assert resp.status_code == 403

    def test_test_message_unauthenticated(self, api_client):
        resp = api_client.post("/api/whatsapp/test/")
        assert resp.status_code == 403

    def test_reconnect_unauthenticated(self, api_client):
        resp = api_client.post("/api/whatsapp/reconnect/")
        assert resp.status_code == 403

    def test_logs_unauthenticated(self, api_client):
        resp = api_client.get("/api/whatsapp/logs/")
        assert resp.status_code == 403

    # -- Health check endpoint --

    @patch("event.api.whatsapp._wa_service")
    def test_health_check_endpoint(self, mock_service, auth_client):
        mock_service.health_check.return_value = {
            "is_healthy": True,
            "status": "connected",
            "checked_at": "2026-04-12T10:00:00+00:00",
            "message": "WhatsApp-Verbindung ist aktiv",
        }
        resp = auth_client.post("/api/whatsapp/health-check/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_healthy"] is True
        assert data["status"] == "connected"
        assert data["checked_at"] == "2026-04-12T10:00:00+00:00"
        assert data["message"] == "WhatsApp-Verbindung ist aktiv"
        mock_service.health_check.assert_called_once()

    @patch("event.api.whatsapp._wa_service")
    def test_health_check_unhealthy(self, mock_service, auth_client):
        mock_service.health_check.return_value = {
            "is_healthy": False,
            "status": "session_invalid",
            "checked_at": "2026-04-12T10:00:00+00:00",
            "message": "Session ungueltig",
        }
        resp = auth_client.post("/api/whatsapp/health-check/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_healthy"] is False
        assert data["status"] == "session_invalid"

    # -- Test message endpoint --

    @patch("event.api.whatsapp._wa_service")
    def test_test_message_endpoint(self, mock_service, auth_client):
        mock_service.send_test_message.return_value = {
            "success": True,
            "message": "Test-Nachricht erfolgreich gesendet",
        }
        resp = auth_client.post("/api/whatsapp/test/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["message"] == "Test-Nachricht erfolgreich gesendet"
        mock_service.send_test_message.assert_called_once()

    @patch("event.api.whatsapp._wa_service")
    def test_test_message_rate_limited(self, mock_service, auth_client):
        mock_service.send_test_message.return_value = {
            "success": False,
            "message": "Bitte warte eine Minute zwischen Test-Nachrichten.",
        }
        resp = auth_client.post("/api/whatsapp/test/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False

    # -- Reconnect endpoint --

    @patch("event.api.whatsapp._wa_service")
    def test_reconnect_endpoint_success(self, mock_service, auth_client):
        mock_service.reconnect.return_value = {
            "success": True,
            "needs_qr": False,
            "status": "connected",
            "message": "WhatsApp erfolgreich wiederverbunden",
        }
        resp = auth_client.post("/api/whatsapp/reconnect/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["needs_qr"] is False
        assert data["status"] == "connected"
        mock_service.reconnect.assert_called_once()

    @patch("event.api.whatsapp._wa_service")
    def test_reconnect_endpoint_needs_qr(self, mock_service, auth_client):
        mock_service.reconnect.return_value = {
            "success": False,
            "needs_qr": True,
            "status": "pending_qr",
            "message": "Bitte per QR-Code verbinden.",
        }
        resp = auth_client.post("/api/whatsapp/reconnect/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert data["needs_qr"] is True

    # -- Logs endpoint --

    @patch("event.api.whatsapp._wa_service")
    def test_logs_endpoint(self, mock_service, auth_client):
        mock_service.get_connection_logs.return_value = [
            {
                "event_type": "connected",
                "message": "Verbunden",
                "created_at": "2026-04-12T10:00:00+00:00",
            },
            {
                "event_type": "health_check_ok",
                "message": "OK",
                "created_at": "2026-04-12T10:05:00+00:00",
            },
        ]
        resp = auth_client.get("/api/whatsapp/logs/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["event_type"] == "connected"
        assert data[1]["event_type"] == "health_check_ok"
        mock_service.get_connection_logs.assert_called_once()

    @patch("event.api.whatsapp._wa_service")
    def test_logs_endpoint_empty(self, mock_service, auth_client):
        mock_service.get_connection_logs.return_value = []
        resp = auth_client.get("/api/whatsapp/logs/")
        assert resp.status_code == 200
        data = resp.json()
        assert data == []


# ---------------------------------------------------------------------------
# 12.6 — Connection Logs Service (get_connection_logs)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestConnectionLogsService:
    """Test WhatsAppService.get_connection_logs method."""

    def test_get_logs_no_connection(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        service = WhatsAppService()
        result = service.get_connection_logs(user)
        assert result == []

    def test_get_logs_returns_last_10(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)

        # Create 15 log entries
        for i in range(15):
            WhatsAppConnectionLog.objects.create(
                connection=conn,
                event_type="connected",
                message=f"entry {i}",
            )

        service = WhatsAppService()
        result = service.get_connection_logs(user)

        assert len(result) == 10

    def test_get_logs_format(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        WhatsAppConnectionLog.objects.create(
            connection=conn,
            event_type="test_sent",
            message="Test gesendet",
        )

        service = WhatsAppService()
        result = service.get_connection_logs(user)

        assert len(result) == 1
        log = result[0]
        assert log["event_type"] == "test_sent"
        assert log["message"] == "Test gesendet"
        assert "created_at" in log

    def test_get_logs_ordered_newest_first(self, auth_client):
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)

        WhatsAppConnectionLog.objects.create(connection=conn, event_type="connected", message="first")
        WhatsAppConnectionLog.objects.create(connection=conn, event_type="disconnected", message="second")

        service = WhatsAppService()
        result = service.get_connection_logs(user)

        assert result[0]["message"] == "second"
        assert result[1]["message"] == "first"

    def test_delete_data_cleans_logs(self, auth_client):
        """delete_data should also delete connection logs."""
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user)
        WhatsAppConnectionLog.objects.create(connection=conn, event_type="connected", message="test")

        service = WhatsAppService()
        with patch.object(service._manager, "delete_client"):
            service.delete_data(user)

        assert WhatsAppConnectionLog.objects.count() == 0

    def test_connect_logs_event(self, auth_client):
        """connect() should create a connection log entry."""
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=False)

        service = WhatsAppService()
        with patch.object(service._manager, "start_client_in_thread"):
            with patch.object(
                service._manager,
                "get_qr_code",
                return_value=("pending_qr", "abc123"),
            ):
                service.connect(user)

        assert WhatsAppConnectionLog.objects.filter(connection=conn, event_type="connected").exists()

    def test_disconnect_logs_event(self, auth_client):
        """disconnect() should create a connection log entry."""
        from event.services.whatsapp import WhatsAppService

        user = auth_client._user
        conn = WhatsAppConnection.objects.create(user=user, is_active=True)

        service = WhatsAppService()
        with patch.object(service._manager, "disconnect_client"):
            service.disconnect(user)

        assert WhatsAppConnectionLog.objects.filter(connection=conn, event_type="disconnected").exists()
