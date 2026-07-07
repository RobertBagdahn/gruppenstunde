"""Pydantic schemas for EventDaySlot (Django Ninja)."""

import logging
import datetime as _dt
from datetime import datetime, time

from ninja import Schema

logger = logging.getLogger(__name__)


class EventDaySlotOut(Schema):
    id: int
    event_id: int
    date: _dt.date
    start_time: time | None = None
    end_time: time | None = None
    title: str
    notes: str
    content_type: str | None = None
    object_id: int | None = None
    content_title: str | None = None
    content_slug: str | None = None
    sort_order: int
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_content_type(obj) -> str | None:
        if obj.content_type:
            return obj.content_type.model
        return None

    @staticmethod
    def resolve_content_title(obj) -> str | None:
        if obj.content_type and obj.object_id:
            try:
                content_obj = obj.content_type.get_object_for_this_type(pk=obj.object_id)
                return getattr(content_obj, "title", None)
            except Exception:
                logger.warning(
                    "Could not resolve content title for day_slot %d (type=%s, pk=%s)",
                    obj.id, obj.content_type, obj.object_id,
                )
        return None

    @staticmethod
    def resolve_content_slug(obj) -> str | None:
        if obj.content_type and obj.object_id:
            try:
                content_obj = obj.content_type.get_object_for_this_type(pk=obj.object_id)
                return getattr(content_obj, "slug", None)
            except Exception:
                logger.warning(
                    "Could not resolve content slug for day_slot %d (type=%s, pk=%s)",
                    obj.id, obj.content_type, obj.object_id,
                )
        return None


class EventDaySlotCreateIn(Schema):
    date: _dt.date
    start_time: time | None = None
    end_time: time | None = None
    title: str
    notes: str = ""
    content_type: str | None = None  # e.g. "groupsession", "game"
    object_id: int | None = None
    sort_order: int = 0


class EventDaySlotUpdateIn(Schema):
    date: _dt.date | None = None
    start_time: time | None = None
    end_time: time | None = None
    title: str | None = None
    notes: str | None = None
    content_type: str | None = None
    object_id: int | None = None
    sort_order: int | None = None
