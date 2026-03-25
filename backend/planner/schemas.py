"""Pydantic schemas for the Planner API."""

from datetime import date, datetime

from ninja import Schema


class PlannerOut(Schema):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class PlannerCreateIn(Schema):
    title: str


class PlannerEntryOut(Schema):
    id: int
    idea_id: int | None
    idea_title: str | None
    date: date
    notes: str
    sort_order: int

    @staticmethod
    def resolve_idea_title(obj) -> str | None:
        if obj.idea:
            return obj.idea.title
        return None


class PlannerEntryIn(Schema):
    idea_id: int | None = None
    date: date
    notes: str = ""
    sort_order: int = 0


class PlannerDetailOut(Schema):
    id: int
    title: str
    entries: list[PlannerEntryOut]
    collaborators: list["CollaboratorOut"]
    created_at: datetime


class CollaboratorOut(Schema):
    id: int
    user_id: int
    username: str
    role: str

    @staticmethod
    def resolve_username(obj) -> str:
        return obj.user.get_username()


class InviteIn(Schema):
    user_id: int
    role: str = "viewer"
