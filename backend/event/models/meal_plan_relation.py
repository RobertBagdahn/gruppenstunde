"""Canonical relation between events and meal plans."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class EventMealPlanRelation(models.Model):
    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        related_name="meal_plan_relations",
        verbose_name=_("Veranstaltung"),
    )
    meal_plan = models.OneToOneField(
        "planner.MealPlan",
        on_delete=models.CASCADE,
        related_name="event_relation",
        verbose_name=_("Essensplan"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Event-Essensplan-Verknüpfung")
        verbose_name_plural = _("Event-Essensplan-Verknüpfungen")
        indexes = [models.Index(fields=["event", "meal_plan"])]
