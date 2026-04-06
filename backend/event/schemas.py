"""Pydantic schemas for the Event API (Django Ninja)."""

from datetime import date, datetime
from decimal import Decimal

from ninja import Schema

from idea.schemas import NutritionalTagOut


# ---------------------------------------------------------------------------
# Choices (for reference / output)
# ---------------------------------------------------------------------------


class ChoiceOut(Schema):
    value: str
    label: str


# ---------------------------------------------------------------------------
# Event Location Schemas
# ---------------------------------------------------------------------------


class EventLocationOut(Schema):
    id: int
    name: str
    street: str
    zip_code: str
    city: str
    state: str
    country: str
    description: str
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_full_address(obj) -> str:
        parts = []
        if obj.street:
            parts.append(obj.street)
        if obj.zip_code and obj.city:
            parts.append(f"{obj.zip_code} {obj.city}")
        elif obj.city:
            parts.append(obj.city)
        return ", ".join(parts)


class EventLocationCreateIn(Schema):
    name: str
    street: str = ""
    zip_code: str = ""
    city: str = ""
    state: str = ""
    country: str = "Deutschland"
    description: str = ""


class EventLocationUpdateIn(Schema):
    name: str | None = None
    street: str | None = None
    zip_code: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    description: str | None = None


# ---------------------------------------------------------------------------
# Person Schemas
# ---------------------------------------------------------------------------


class PersonOut(Schema):
    id: int
    scout_name: str
    first_name: str
    last_name: str
    address: str
    zip_code: str
    city: str
    email: str
    birthday: date | None
    gender: str
    nutritional_tags: list[NutritionalTagOut]
    is_owner: bool
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_nutritional_tags(obj) -> list:
        return obj.nutritional_tags.all()


class PersonCreateIn(Schema):
    scout_name: str = ""
    first_name: str
    last_name: str
    address: str = ""
    zip_code: str = ""
    city: str = ""
    email: str = ""
    birthday: date | None = None
    gender: str = "no_answer"
    nutritional_tag_ids: list[int] = []
    is_owner: bool = False


class PersonUpdateIn(Schema):
    scout_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    zip_code: str | None = None
    city: str | None = None
    email: str | None = None
    birthday: date | None = None
    gender: str | None = None
    nutritional_tag_ids: list[int] | None = None


# ---------------------------------------------------------------------------
# Booking Option Schemas
# ---------------------------------------------------------------------------


class BookingOptionOut(Schema):
    id: int
    name: str
    description: str
    price: Decimal
    max_participants: int
    current_participant_count: int
    is_full: bool
    created_at: datetime


class BookingOptionCreateIn(Schema):
    name: str
    description: str = ""
    price: Decimal = Decimal("0.00")
    max_participants: int = 0


class BookingOptionUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    max_participants: int | None = None


# ---------------------------------------------------------------------------
# Participant Schemas
# ---------------------------------------------------------------------------


class ParticipantOut(Schema):
    id: int
    person_id: int | None
    booking_option_id: int | None
    booking_option_name: str = ""
    scout_name: str
    first_name: str
    last_name: str
    address: str
    zip_code: str
    email: str
    birthday: date | None
    gender: str
    nutritional_tags: list[NutritionalTagOut]
    is_paid: bool
    created_at: datetime

    @staticmethod
    def resolve_booking_option_name(obj) -> str:
        if obj.booking_option:
            return obj.booking_option.name
        return ""

    @staticmethod
    def resolve_nutritional_tags(obj) -> list:
        return obj.nutritional_tags.all()


class ParticipantUpdateIn(Schema):
    booking_option_id: int | None = None
    is_paid: bool | None = None
    scout_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    zip_code: str | None = None
    email: str | None = None
    birthday: date | None = None
    gender: str | None = None
    nutritional_tag_ids: list[int] | None = None


# ---------------------------------------------------------------------------
# Registration Schemas
# ---------------------------------------------------------------------------


class RegistrationOut(Schema):
    id: int
    user_id: int
    user_email: str
    event_id: int
    participants: list[ParticipantOut]
    created_at: datetime

    @staticmethod
    def resolve_user_email(obj) -> str:
        return obj.user.email

    @staticmethod
    def resolve_participants(obj) -> list:
        return obj.participants.select_related("booking_option").all()


class RegisterPersonIn(Schema):
    person_id: int
    booking_option_id: int | None = None


class RegisterIn(Schema):
    """Register one or more persons for an event."""

    persons: list[RegisterPersonIn]


# ---------------------------------------------------------------------------
# Event Schemas
# ---------------------------------------------------------------------------


class EventListOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    location: str
    event_location: EventLocationOut | None = None
    start_date: datetime | None
    end_date: datetime | None
    registration_deadline: datetime | None
    is_public: bool
    booking_options: list[BookingOptionOut]
    packing_list_id: int | None = None
    registration_count: int = 0
    participant_count: int = 0
    created_at: datetime

    @staticmethod
    def resolve_event_location(obj):
        return obj.event_location

    @staticmethod
    def resolve_booking_options(obj) -> list:
        return obj.booking_options.all()

    @staticmethod
    def resolve_registration_count(obj) -> int:
        return obj.registrations.count()

    @staticmethod
    def resolve_participant_count(obj) -> int:
        from .models import Participant

        return Participant.objects.filter(registration__event=obj).count()


class EventDetailOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    location: str
    event_location: EventLocationOut | None = None
    invitation_text: str
    start_date: datetime | None
    end_date: datetime | None
    registration_deadline: datetime | None
    registration_start: datetime | None
    is_public: bool
    booking_options: list[BookingOptionOut]
    packing_list_id: int | None = None
    registration_count: int = 0
    participant_count: int = 0
    is_manager: bool = False
    is_registered: bool = False
    my_registration: RegistrationOut | None = None
    all_registrations: list[RegistrationOut] | None = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_event_location(obj):
        return obj.event_location

    @staticmethod
    def resolve_booking_options(obj) -> list:
        return obj.booking_options.all()

    @staticmethod
    def resolve_registration_count(obj) -> int:
        return obj.registrations.count()

    @staticmethod
    def resolve_participant_count(obj) -> int:
        from .models import Participant

        return Participant.objects.filter(registration__event=obj).count()


class EventCreateIn(Schema):
    name: str
    description: str = ""
    location: str = ""
    event_location_id: int | None = None
    invitation_text: str = ""
    start_date: datetime | None = None
    end_date: datetime | None = None
    registration_deadline: datetime | None = None
    registration_start: datetime | None = None
    is_public: bool = False
    packing_list_id: int | None = None
    booking_options: list[BookingOptionCreateIn] | None = None


class EventUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    event_location_id: int | None = None
    invitation_text: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    registration_deadline: datetime | None = None
    registration_start: datetime | None = None
    is_public: bool | None = None
    packing_list_id: int | None = None


class InviteGroupIn(Schema):
    group_slug: str


class GenerateInvitationIn(Schema):
    name: str
    description: str = ""
    start_date: str | None = None
    end_date: str | None = None
    location_name: str = ""
    location_address: str = ""
    booking_options: list[str] | None = None
    special_notes: str = ""


class GenerateInvitationOut(Schema):
    invitation_text: str
