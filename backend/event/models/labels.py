"""ParticipantLabel model — colored labels for event participants."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class ParticipantLabel(models.Model):
    """A colored label that can be assigned to participants of an event."""

    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        related_name="participant_labels",
        verbose_name=_("Event"),
    )
    name = models.CharField(
        max_length=50,
        verbose_name=_("Name"),
    )
    color = models.CharField(
        max_length=7,
        default="#4CAF50",
        verbose_name=_("Farbe"),
        help_text=_("Hex-Farbcode, z.B. #FF5733"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))

    class Meta:
        verbose_name = _("Teilnehmer-Label")
        verbose_name_plural = _("Teilnehmer-Labels")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.event.name})"
