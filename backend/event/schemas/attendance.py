"""Pydantic schemas for AttendanceRecord model."""

from datetime import datetime

from ninja import Schema


class AttendanceRecordOut(Schema):
    id: int
    participant_id: int
    participant_name: str = ""
    checked_in_at: datetime | None = None
    checked_out_at: datetime | None = None
    checked_in_by_id: int | None = None
    is_checked_in: bool = False

    @staticmethod
    def resolve_participant_name(obj) -> str:
        p = obj.participant
        return f"{p.first_name} {p.last_name}".strip()

    @staticmethod
    def resolve_is_checked_in(obj) -> bool:
        return obj.is_checked_in


class AttendanceRecordCreateIn(Schema):
    participant_id: int


class BatchCheckInIn(Schema):
    participant_ids: list[int]


class PaginatedAttendanceRecordOut(Schema):
    items: list[AttendanceRecordOut]
    total: int
    page: int
    page_size: int
    total_pages: int
