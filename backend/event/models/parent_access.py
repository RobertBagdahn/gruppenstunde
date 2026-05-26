import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class ParentAccessToken(models.Model):
    """A token granting parents read-only access to their child's event info."""

    participant = models.ForeignKey(
        "event.Participant",
        on_delete=models.CASCADE,
        related_name="parent_tokens",
        verbose_name=_("Teilnehmer"),
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name=_("Token"),
    )
    email = models.CharField(
        max_length=254,
        blank=True,
        default="",
        verbose_name=_("E-Mail-Adresse"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))
    expires_at = models.DateTimeField(verbose_name=_("Gültig bis"))

    class Meta:
        verbose_name = _("Elternzugangs-Token")
        verbose_name_plural = _("Elternzugangs-Tokens")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Elternzugang: {self.participant} ({self.token})"
