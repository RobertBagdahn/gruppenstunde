"""CustomField and CustomFieldValue models — per-event custom fields for participants."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import CustomFieldTypeChoices


class CustomField(models.Model):
    """A custom field definition for an event."""

    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        related_name="custom_fields",
        verbose_name=_("Event"),
    )
    label = models.CharField(
        max_length=255,
        verbose_name=_("Label"),
        help_text=_("Die Frage oder das Feldlabel"),
    )
    field_type = models.CharField(
        max_length=20,
        choices=CustomFieldTypeChoices.choices,
        verbose_name=_("Feldtyp"),
    )
    options = models.JSONField(
        null=True,
        blank=True,
        verbose_name=_("Optionen"),
        help_text=_("Liste von Strings für Auswahl-Felder"),
    )
    is_required = models.BooleanField(
        default=False,
        verbose_name=_("Pflichtfeld"),
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Reihenfolge"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))

    class Meta:
        verbose_name = _("Benutzerdefiniertes Feld")
        verbose_name_plural = _("Benutzerdefinierte Felder")
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.label} ({self.get_field_type_display()})"


class CustomFieldValue(models.Model):
    """A participant's answer to a custom field."""

    custom_field = models.ForeignKey(
        CustomField,
        on_delete=models.CASCADE,
        related_name="values",
        verbose_name=_("Feld"),
    )
    participant = models.ForeignKey(
        "event.Participant",
        on_delete=models.CASCADE,
        related_name="custom_field_values",
        verbose_name=_("Teilnehmer"),
    )
    value = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Wert"),
    )

    class Meta:
        verbose_name = _("Feldwert")
        verbose_name_plural = _("Feldwerte")
        unique_together = ["custom_field", "participant"]

    def __str__(self):
        return f"{self.custom_field.label}: {self.value[:50]}"
