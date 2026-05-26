from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class WaitlistEntry(models.Model):
    """A user waiting for a spot in a full booking option."""

    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        verbose_name=_("Event"),
    )
    booking_option = models.ForeignKey(
        "event.BookingOption",
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        verbose_name=_("Buchungsoption"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        verbose_name=_("Benutzer"),
    )
    person = models.ForeignKey(
        "event.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="waitlist_entries",
        verbose_name=_("Person"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))
    notified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Benachrichtigt am"),
    )
    expired_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Abgelaufen am"),
    )

    class Meta:
        verbose_name = _("Wartelisten-Eintrag")
        verbose_name_plural = _("Wartelisten-Einträge")
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.event.name}: {self.user} (Warteliste)"
