"""Payment model — tracks payments for event participants."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import PaymentMethodChoices


class Payment(models.Model):
    """A payment record for a participant."""

    participant = models.ForeignKey(
        "event.Participant",
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name=_("Teilnehmer"),
    )
    amount = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        verbose_name=_("Betrag"),
    )
    method = models.CharField(
        max_length=20,
        choices=PaymentMethodChoices.choices,
        verbose_name=_("Zahlungsmethode"),
    )
    received_at = models.DateTimeField(
        verbose_name=_("Empfangen am"),
    )
    location = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name=_("Ort"),
        help_text=_("Wo wurde das Geld empfangen"),
    )
    note = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Notiz"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_payments",
        verbose_name=_("Erfasst von"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))

    class Meta:
        verbose_name = _("Zahlung")
        verbose_name_plural = _("Zahlungen")
        ordering = ["-received_at"]

    def __str__(self):
        return f"{self.participant} – {self.amount}€ ({self.get_method_display()})"
