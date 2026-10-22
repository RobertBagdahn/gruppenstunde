"""Signals for the shopping app."""

from django.db.models.signals import pre_delete
from django.dispatch import receiver

from event.models import Event

from .models import ShoppingList


@receiver(pre_delete, sender=Event)
def drop_planned_trips_of_deleted_event(sender, instance: Event, **kwargs) -> None:
    """Planned trips only exist inside the plan; created ones keep their history (event is set to NULL)."""
    ShoppingList.objects.filter(event=instance, materialized_at__isnull=True).delete()
