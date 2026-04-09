"""Pydantic schemas for TimelineEntry (Django Ninja)."""

from datetime import datetime

from ninja import Schema


class TimelineEntryOut(Schema):
    id: int
    event_id: int
    participant_id: int | None
    participant_name: str = ""
    user_id: int | None
    user_email: str = ""
    action_type: str
    action_type_display: str = ""
    description: str
    metadata: dict = {}
    created_at: datetime

    @staticmethod
    def resolve_participant_name(obj) -> str:
        if obj.participant:
            return f"{obj.participant.first_name} {obj.participant.last_name}"
        return ""

    @staticmethod
    def resolve_user_email(obj) -> str:
        if obj.user:
            return obj.user.email
        return ""

    @staticmethod
    def resolve_action_type_display(obj) -> str:
        return obj.get_action_type_display()
