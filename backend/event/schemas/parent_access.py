"""Pydantic schemas for ParentAccessToken model."""

from datetime import datetime

from ninja import Schema


class ParentAccessTokenOut(Schema):
    id: int
    participant_id: int
    participant_name: str = ""
    token: str
    email: str
    created_at: datetime
    expires_at: datetime

    @staticmethod
    def resolve_participant_name(obj) -> str:
        p = obj.participant
        return f"{p.first_name} {p.last_name}".strip()

    @staticmethod
    def resolve_token(obj) -> str:
        return str(obj.token)


class ParentAccessTokenCreateIn(Schema):
    participant_id: int
    email: str = ""
    expires_in_days: int = 30


class BatchParentAccessTokenCreateIn(Schema):
    email_field: str = "email"
    expires_in_days: int = 30


class PaginatedParentAccessTokenOut(Schema):
    items: list[ParentAccessTokenOut]
    total: int
    page: int
    page_size: int
    total_pages: int
