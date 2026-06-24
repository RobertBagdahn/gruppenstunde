"""Event models package — re-exports all models for backward compatibility."""

from .attendance import AttendanceRecord
from .budget import BudgetItem
from .core import (
    BookingOption,
    Event,
    EventLocation,
    MeetingPoint,
    Participant,
    Person,
    Registration,
)
from .custom_fields import CustomField, CustomFieldValue
from .day_slots import EventDaySlot
from .labels import ParticipantLabel
from .parent_access import ParentAccessToken
from .payment import Payment
from .room_assignment import RoomAssignment
from .timeline import TimelineEntry
from .waitlist import WaitlistEntry
from .whatsapp import MessageTemplate, WhatsAppConnection, WhatsAppConnectionLog, WhatsAppMessage

__all__ = [
    "AttendanceRecord",
    "BookingOption",
    "BudgetItem",
    "CustomField",
    "CustomFieldValue",
    "Event",
    "EventDaySlot",
    "EventLocation",
    "MeetingPoint",
    "MessageTemplate",
    "ParentAccessToken",
    "Participant",
    "ParticipantLabel",
    "Payment",
    "Person",
    "Registration",
    "RoomAssignment",
    "TimelineEntry",
    "WaitlistEntry",
    "WhatsAppConnection",
    "WhatsAppConnectionLog",
    "WhatsAppMessage",
]
