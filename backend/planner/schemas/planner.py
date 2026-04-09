"""Planner-related schemas (Planner, PlannerEntry, Collaborator)."""

import datetime as dt

from ninja import Schema


class PlannerOut(Schema):
    id: int
    title: str
    group_id: int | None = None
    group_name: str = ""
    weekday: int
    time: dt.time
    created_at: dt.datetime
    updated_at: dt.datetime

    @staticmethod
    def resolve_group_name(obj) -> str:
        if obj.group:
            return obj.group.name
        return ""


class PlannerCreateIn(Schema):
    title: str
    group_id: int | None = None
    weekday: int = 4  # Friday
    time: dt.time = dt.time(18, 0)


class PlannerUpdateIn(Schema):
    title: str | None = None
    group_id: int | None = None
    weekday: int | None = None
    time: dt.time | None = None


class PlannerEntryOut(Schema):
    id: int
    session_id: int | None
    session_title: str | None
    session_slug: str | None
    date: dt.date
    notes: str
    status: str
    sort_order: int

    @staticmethod
    def resolve_session_title(obj) -> str | None:
        if obj.session:
            return obj.session.title
        return None

    @staticmethod
    def resolve_session_slug(obj) -> str | None:
        if obj.session:
            return obj.session.slug
        return None


class PlannerEntryIn(Schema):
    session_id: int | None = None
    date: dt.date
    notes: str = ""
    status: str = "planned"
    sort_order: int = 0


class PlannerEntryUpdateIn(Schema):
    session_id: int | None = None
    date: dt.date | None = None
    notes: str | None = None
    status: str | None = None
    sort_order: int | None = None


class PlannerDetailOut(Schema):
    id: int
    title: str
    group_id: int | None = None
    group_name: str = ""
    weekday: int
    time: dt.time
    entries: list[PlannerEntryOut]
    collaborators: list["CollaboratorOut"]
    can_edit: bool = False
    created_at: dt.datetime

    @staticmethod
    def resolve_group_name(obj) -> str:
        if obj.group:
            return obj.group.name
        return ""


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
