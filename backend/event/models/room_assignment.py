from django.db import models
from django.utils.translation import gettext_lazy as _


class RoomAssignment(models.Model):
    """A room/tent assignment group for event participants."""

    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        related_name="room_assignments",
        verbose_name=_("Event"),
    )
    name = models.CharField(max_length=100, verbose_name=_("Name"))
    capacity = models.IntegerField(
        default=0,
        verbose_name=_("Kapazität"),
        help_text=_("0 = unbegrenzt"),
    )
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    sort_order = models.IntegerField(default=0, verbose_name=_("Sortierung"))
    participants = models.ManyToManyField(
        "event.Participant",
        blank=True,
        related_name="room_assignments",
        verbose_name=_("Teilnehmer"),
    )

    class Meta:
        verbose_name = _("Zimmereinteilung")
        verbose_name_plural = _("Zimmereinteilungen")
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return f"{self.event.name}: {self.name}"

    @property
    def current_occupancy(self) -> int:
        return self.participants.count()

    @property
    def is_full(self) -> bool:
        if self.capacity == 0:
            return False
        return self.current_occupancy >= self.capacity
