"""Pydantic schemas for ParticipantLabel (Django Ninja)."""

from datetime import datetime

from ninja import Schema


class LabelOut(Schema):
    id: int
    event_id: int
    name: str
    color: str
    created_at: datetime


class LabelCreateIn(Schema):
    name: str
    color: str = "#4CAF50"


class LabelUpdateIn(Schema):
    name: str | None = None
    color: str | None = None


class LabelAssignIn(Schema):
    label_id: int
