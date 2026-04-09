"""Signals for the event app."""

from decimal import Decimal

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import BookingOption, Event


@receiver(post_save, sender=Event)
def create_system_booking_option(sender, instance: Event, created: bool, **kwargs) -> None:
    """Auto-create a system BookingOption (0 EUR) for every new event."""
    if not BookingOption.objects.filter(event=instance, is_system=True).exists():
        BookingOption.objects.create(
            event=instance,
            name="Kostenlos (Organisator)",
            price=Decimal("0.00"),
            max_participants=0,
            is_system=True,
        )
