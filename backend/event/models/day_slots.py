from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _

from .core import Event


# ---------------------------------------------------------------------------
# Event Day Slot (Tagesplan)
# ---------------------------------------------------------------------------


class EventDaySlot(models.Model):
    """
    A time slot in an event's day plan.

    Can optionally link to a content item (GroupSession, Game, Blog, Recipe)
    via GenericForeignKey for structured event planning.
    """

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="day_slots",
        verbose_name=_("Event"),
    )
    date = models.DateField(verbose_name=_("Datum"))
    start_time = models.TimeField(null=True, blank=True, verbose_name=_("Startzeit"))
    end_time = models.TimeField(null=True, blank=True, verbose_name=_("Endzeit"))
    title = models.CharField(max_length=200, verbose_name=_("Titel"))
    notes = models.TextField(blank=True, default="", verbose_name=_("Notizen"))

    # Optional link to content (GroupSession, Game, etc.)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="event_day_slots",
        verbose_name=_("Inhaltstyp"),
    )
    object_id = models.PositiveIntegerField(null=True, blank=True, verbose_name=_("Objekt-ID"))
    content_object = GenericForeignKey("content_type", "object_id")

    sort_order = models.IntegerField(default=0, verbose_name=_("Sortierung"))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_day_slots",
        verbose_name=_("Erstellt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Tagesplan-Eintrag")
        verbose_name_plural = _("Tagesplan-Einträge")
        ordering = ["date", "sort_order", "start_time"]
        indexes = [
            models.Index(fields=["event", "date"], name="eventdayslot_event_date_idx"),
        ]

    def __str__(self):
        time_str = ""
        if self.start_time:
            time_str = f" {self.start_time.strftime('%H:%M')}"
            if self.end_time:
                time_str += f"-{self.end_time.strftime('%H:%M')}"
        return f"{self.date}{time_str}: {self.title}"
