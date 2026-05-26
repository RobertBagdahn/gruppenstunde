"""Tests for invitation PDF generation and API endpoints."""

import json

import pytest

from event.services.invitation_pdf import InvitationPdfService
from event.tests import make_booking_option, make_event
from profiles.choices import MembershipRoleChoices
from profiles.tests import make_corporate_identity, make_group_membership, make_user_group


@pytest.mark.django_db
class TestInvitationPdfGeneration:
    def test_generate_pdf_with_ci(self):
        event = make_event(invitation_text="Kommt zum Lager!")
        group = make_user_group(name="PDF-Stamm")
        make_corporate_identity(group=group, primary_color="#FF0000")
        event.invited_groups.add(group)
        make_booking_option(event=event, name="Standard", is_system=False)

        file_bytes, content_type, filename = InvitationPdfService.generate(event)
        assert len(file_bytes) > 0
        assert content_type == "application/pdf"
        assert filename == f"einladung-{event.slug}.pdf"
        # PDF header magic bytes
        assert file_bytes[:5] == b"%PDF-"

    def test_generate_pdf_without_ci(self):
        event = make_event(invitation_text="Einladungstext")
        file_bytes, content_type, filename = InvitationPdfService.generate(event)
        assert len(file_bytes) > 0
        assert file_bytes[:5] == b"%PDF-"


@pytest.mark.django_db
class TestInvitationPdfApi:
    def test_download_as_manager(self, auth_client):
        event = make_event(invitation_text="Kommt!", created_by=auth_client._user)
        event.responsible_persons.add(auth_client._user)
        resp = auth_client.get(f"/api/events/{event.slug}/invitation-pdf/")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"

    def test_download_forbidden_for_non_manager(self, auth_client):
        event = make_event(invitation_text="Kommt!")
        resp = auth_client.get(f"/api/events/{event.slug}/invitation-pdf/")
        assert resp.status_code == 403

    def test_download_without_invitation_text(self, auth_client):
        event = make_event(invitation_text="")
        event.responsible_persons.add(auth_client._user)
        resp = auth_client.get(f"/api/events/{event.slug}/invitation-pdf/")
        assert resp.status_code == 400

    def test_send_invitation_as_manager(self, auth_client):
        event = make_event(invitation_text="Einladung!")
        event.responsible_persons.add(auth_client._user)
        group = make_user_group(name="Einladungs-Gruppe")
        make_group_membership(user=auth_client._user, group=group, role=MembershipRoleChoices.ADMIN)
        event.invited_groups.add(group)

        payload = {"recipient_type": "groups"}
        resp = auth_client.post(
            f"/api/events/{event.slug}/send-invitation/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "sent_count" in data

    def test_send_invitation_forbidden(self, auth_client):
        event = make_event(invitation_text="Einladung!")
        payload = {"recipient_type": "groups"}
        resp = auth_client.post(
            f"/api/events/{event.slug}/send-invitation/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 403
