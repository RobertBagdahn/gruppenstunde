"""Tests for HTML email rendering with CI data."""

import pytest
from django.template.loader import render_to_string

from event.services.ci_helper import DEFAULT_CI


@pytest.mark.django_db
class TestEmailTemplateRendering:
    def test_base_template_renders_with_defaults(self):
        html = render_to_string(
            "event/email/base.html",
            {
                "ci_primary_color": DEFAULT_CI.primary_color,
                "ci_secondary_color": DEFAULT_CI.secondary_color,
                "ci_group_name": DEFAULT_CI.group_name,
                "ci_logo_url": "",
                "ci_slogan": "",
                "ci_footer_text": "",
                "ci_signature_text": "",
            },
        )
        assert "gruppenstunde.de" in html
        assert DEFAULT_CI.primary_color in html

    def test_base_template_renders_with_custom_ci(self):
        html = render_to_string(
            "event/email/base.html",
            {
                "ci_primary_color": "#FF0000",
                "ci_secondary_color": "#FFEEEE",
                "ci_group_name": "Stamm Testgruppe",
                "ci_logo_url": "https://example.com/logo.png",
                "ci_slogan": "Immer bereit!",
                "ci_footer_text": "Mein Impressum",
                "ci_signature_text": "Gut Pfad!",
            },
        )
        assert "#FF0000" in html
        assert "Stamm Testgruppe" in html
        assert "Immer bereit!" in html
        assert "Mein Impressum" in html
        assert "Gut Pfad!" in html
        assert "logo.png" in html

    def test_event_mail_template_renders(self):
        html = render_to_string(
            "event/email/event_mail.html",
            {
                "ci_primary_color": "#4a3a6b",
                "ci_secondary_color": "#e8e4f0",
                "ci_group_name": "Test",
                "ci_logo_url": "",
                "ci_slogan": "",
                "ci_greeting_text": "Liebe Alle,",
                "ci_footer_text": "",
                "ci_signature_text": "",
                "subject": "Testbetreff",
                "body": "Testnachricht",
            },
        )
        assert "Liebe Alle," in html
        assert "Testnachricht" in html

    def test_registration_confirmation_template_renders(self):
        html = render_to_string(
            "event/email/registration_confirmation.html",
            {
                "ci_primary_color": "#4a3a6b",
                "ci_secondary_color": "#e8e4f0",
                "ci_group_name": "Test",
                "ci_logo_url": "",
                "ci_slogan": "",
                "ci_footer_text": "",
                "ci_payment_info": "IBAN: DE00 0000 0000 0000 0000 00",
                "ci_signature_text": "",
                "event_name": "Sommerlager",
                "participants": [
                    {"first_name": "Max", "last_name": "Muster", "booking_option": "Wochenende", "price": "45.00 EUR"},
                ],
                "date_info": "01.07.2026 10:00",
                "location_info": "Waldheim",
            },
        )
        assert "Sommerlager" in html
        assert "Max" in html
        assert "Zahlungsinformationen" in html
        assert "IBAN" in html

    def test_invitation_template_renders(self):
        html = render_to_string(
            "event/email/invitation.html",
            {
                "ci_primary_color": "#4a3a6b",
                "ci_secondary_color": "#e8e4f0",
                "ci_group_name": "Test",
                "ci_logo_url": "",
                "ci_slogan": "",
                "ci_greeting_text": "",
                "ci_footer_text": "",
                "ci_payment_info": "",
                "ci_signature_text": "",
                "event_name": "Pfingstlager",
                "invitation_text": "Kommt alle!",
                "date_info": "01.06.2026",
                "location_info": "Am See",
                "booking_options": [
                    {"name": "Standard", "price": "30.00 EUR", "description": ""},
                ],
            },
        )
        assert "Pfingstlager" in html
        assert "Kommt alle!" in html
        assert "Standard" in html
