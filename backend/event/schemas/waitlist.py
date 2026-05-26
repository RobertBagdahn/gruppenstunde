"""Pydantic schemas for WaitlistEntry model."""

from datetime import datetime

from ninja import Schema


class WaitlistEntryOut(Schema):
    id: int
    event_id: int
    booking_option_id: int
    booking_option_name: str = ""
    user_id: int
    user_display_name: str = ""
    person_id: int | None = None
    person_display_name: str = ""
    created_at: datetime
    notified_at: datetime | None = None
    expired_at: datetime | None = None

    @staticmethod
    def resolve_booking_option_name(obj) -> str:
        if hasattr(obj, "booking_option") and obj.booking_option:
            return obj.booking_option.name
        return ""

    @staticmethod
    def resolve_user_display_name(obj) -> str:
        if hasattr(obj, "user") and obj.user:
            full = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full or obj.user.username
        return ""

    @staticmethod
    def resolve_person_display_name(obj) -> str:
        if hasattr(obj, "person") and obj.person:
            name = f"{obj.person.first_name} {obj.person.last_name}".strip()
            if obj.person.scout_name:
                return f"{obj.person.scout_name} ({name})" if name else obj.person.scout_name
            return name
        return ""


class WaitlistEntryCreateIn(Schema):
    booking_option_id: int
    person_id: int | None = None


class PaginatedWaitlistEntryOut(Schema):
    items: list[WaitlistEntryOut]
    total: int
    page: int
    page_size: int
    total_pages: int
