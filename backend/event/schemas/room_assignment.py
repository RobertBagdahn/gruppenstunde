"""Pydantic schemas for RoomAssignment model."""

from ninja import Schema


class RoomParticipantOut(Schema):
    id: int
    first_name: str
    last_name: str
    scout_name: str = ""


class RoomAssignmentOut(Schema):
    id: int
    event_id: int
    name: str
    capacity: int
    description: str
    sort_order: int
    participants: list[RoomParticipantOut] = []
    current_occupancy: int = 0
    is_full: bool = False

    @staticmethod
    def resolve_participants(obj) -> list:
        return obj.participants.all()

    @staticmethod
    def resolve_current_occupancy(obj) -> int:
        return obj.current_occupancy

    @staticmethod
    def resolve_is_full(obj) -> bool:
        return obj.is_full


class RoomAssignmentCreateIn(Schema):
    name: str
    capacity: int = 0
    description: str = ""
    sort_order: int = 0


class RoomAssignmentUpdateIn(Schema):
    name: str | None = None
    capacity: int | None = None
    description: str | None = None
    sort_order: int | None = None


class RoomAssignParticipantIn(Schema):
    participant_id: int
