"""TimelineEntry model — audit log for event participant actions."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import TimelineActionChoices


class TimelineEntry(models.Model):
    """Audit log entry for significant actions on an event's participants."""

    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        related_name="timeline_entries",
        verbose_name=_("Event"),
    )
    participant = models.ForeignKey(
        "event.Participant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_entries",
        verbose_name=_("Teilnehmer"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="event_timeline_entries",
        verbose_name=_("Akteur"),
        help_text=_("Der Benutzer, der die Aktion ausgeführt hat"),
    )
    action_type = models.CharField(
        max_length=30,
        choices=TimelineActionChoices.choices,
        verbose_name=_("Aktionstyp"),
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Beschreibung"),
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Metadaten"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))

    class Meta:
        verbose_name = _("Timeline-Eintrag")
        verbose_name_plural = _("Timeline-Einträge")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event", "-created_at"], name="timeline_event_created_idx"),
            models.Index(fields=["event", "action_type"], name="timeline_event_action_idx"),
        ]

    def __str__(self):
        return f"{self.get_action_type_display()} – {self.description[:50]}"
