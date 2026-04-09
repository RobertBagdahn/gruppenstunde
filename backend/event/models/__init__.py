"""Event models package — re-exports all models for backward compatibility."""

from .core import (
    BookingOption,
    Event,
    EventLocation,
    Participant,
    Person,
    Registration,
)
from .custom_fields import CustomField, CustomFieldValue
from .day_slots import EventDaySlot
from .labels import ParticipantLabel
from .payment import Payment
from .timeline import TimelineEntry

__all__ = [
    "BookingOption",
    "CustomField",
    "CustomFieldValue",
    "Event",
    "EventDaySlot",
    "EventLocation",
    "Participant",
    "ParticipantLabel",
    "Payment",
    "Person",
    "Registration",
    "TimelineEntry",
]
