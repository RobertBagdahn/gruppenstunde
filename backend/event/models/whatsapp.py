from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import WhatsAppMessageStatusChoices


# ---------------------------------------------------------------------------
# WhatsApp Connection (one per user)
# ---------------------------------------------------------------------------


class WhatsAppConnection(models.Model):
    """Tracks a user's WhatsApp connection via neonize."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="whatsapp_connection",
        verbose_name=_("Benutzer"),
    )
    phone_number = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Telefonnummer"),
    )
    session_db_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Session DB Name"),
        help_text=_("Name der neonize-Session in PostgreSQL"),
    )
    connected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Verbunden seit"),
    )
    is_active = models.BooleanField(
        default=False,
        verbose_name=_("Aktiv"),
    )
    total_messages_sent = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Gesendete Nachrichten gesamt"),
    )
    privacy_consent_given_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Datenschutz-Einwilligung"),
    )
    last_health_check_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Letzter Health Check"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("WhatsApp-Verbindung")
        verbose_name_plural = _("WhatsApp-Verbindungen")

    def __str__(self):
        status = "aktiv" if self.is_active else "inaktiv"
        return f"WhatsApp {self.user} ({status})"


# ---------------------------------------------------------------------------
# WhatsApp Message (log entry, no content stored for privacy)
# ---------------------------------------------------------------------------


class WhatsAppMessage(models.Model):
    """Log entry for a sent WhatsApp message. Content is NOT stored (GDPR)."""

    connection = models.ForeignKey(
        WhatsAppConnection,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name=_("Verbindung"),
    )
    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        verbose_name=_("Event"),
    )
    participant = models.ForeignKey(
        "event.Participant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="whatsapp_messages",
        verbose_name=_("Teilnehmer"),
    )
    status = models.CharField(
        max_length=20,
        choices=WhatsAppMessageStatusChoices.choices,
        default=WhatsAppMessageStatusChoices.PENDING,
        verbose_name=_("Status"),
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Gesendet am"),
    )
    error_message = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Fehlermeldung"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("WhatsApp-Nachricht")
        verbose_name_plural = _("WhatsApp-Nachrichten")
        ordering = ["-created_at"]

    def __str__(self):
        return f"WhatsApp an {self.participant} ({self.status})"


# ---------------------------------------------------------------------------
# Message Template (channel-agnostic, for email and WhatsApp)
# ---------------------------------------------------------------------------


class MessageTemplate(models.Model):
    """Reusable message template. System templates have user=None."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="message_templates",
        verbose_name=_("Benutzer"),
    )
    title = models.CharField(
        max_length=200,
        verbose_name=_("Titel"),
    )
    subject = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name=_("Betreff"),
        help_text=_("Nur für E-Mail relevant"),
    )
    body = models.TextField(
        verbose_name=_("Inhalt"),
    )
    is_system = models.BooleanField(
        default=False,
        verbose_name=_("System-Vorlage"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Nachrichtenvorlage")
        verbose_name_plural = _("Nachrichtenvorlagen")
        ordering = ["-is_system", "title"]

    def __str__(self):
        prefix = "[System] " if self.is_system else ""
        return f"{prefix}{self.title}"


# ---------------------------------------------------------------------------
# WhatsApp Connection Log (diagnostic events)
# ---------------------------------------------------------------------------


class WhatsAppConnectionLog(models.Model):
    """Log entry for WhatsApp connection events (connect, disconnect, health checks, etc.)."""

    EVENT_TYPE_CHOICES = [
        ("connected", "Verbunden"),
        ("disconnected", "Getrennt"),
        ("health_check_ok", "Health Check OK"),
        ("health_check_failed", "Health Check fehlgeschlagen"),
        ("reconnect_success", "Reconnect erfolgreich"),
        ("reconnect_failed", "Reconnect fehlgeschlagen"),
        ("test_sent", "Test gesendet"),
        ("test_failed", "Test fehlgeschlagen"),
    ]

    connection = models.ForeignKey(
        WhatsAppConnection,
        on_delete=models.CASCADE,
        related_name="logs",
        verbose_name=_("Verbindung"),
    )
    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPE_CHOICES,
        verbose_name=_("Ereignistyp"),
    )
    message = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Nachricht"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("WhatsApp-Verbindungslog")
        verbose_name_plural = _("WhatsApp-Verbindungslogs")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.event_type}: {self.message[:50]}"
