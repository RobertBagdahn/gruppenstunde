from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AttendanceRecord(models.Model):
    """Tracks check-in/check-out for a participant at an event."""

    participant = models.OneToOneField(
        "event.Participant",
        on_delete=models.CASCADE,
        related_name="attendance",
        verbose_name=_("Teilnehmer"),
    )
    checked_in_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Eingecheckt am"),
    )
    checked_out_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Ausgecheckt am"),
    )
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_check_ins",
        verbose_name=_("Eingecheckt von"),
    )

    class Meta:
        verbose_name = _("Anwesenheit")
        verbose_name_plural = _("Anwesenheiten")

    def __str__(self) -> str:
        status = "eingecheckt" if self.checked_in_at else "nicht eingecheckt"
        return f"{self.participant}: {status}"

    @property
    def is_checked_in(self) -> bool:
        return self.checked_in_at is not None and self.checked_out_at is None
