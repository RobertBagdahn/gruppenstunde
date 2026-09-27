"""Buffet role tags (``group="buffet"``) may only be changed by staff."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from ninja.errors import HttpError

BUFFET_TAG_GROUP = "buffet"


def _is_staff(user: Any) -> bool:
    return bool(getattr(user, "is_authenticated", False) and getattr(user, "is_staff", False))


def _buffet_tag_ids() -> set[str]:
    from content.models import Tag

    return {str(tag_id) for tag_id in Tag.objects.filter(group=BUFFET_TAG_GROUP).values_list("id", flat=True)}


def require_unchanged_buffet_tags(user: Any, current_tag_ids: Iterable[Any], new_tag_ids: Iterable[Any]) -> None:
    """403 when a non-staff user adds or removes a buffet role tag."""
    if _is_staff(user):
        return
    buffet_ids = _buffet_tag_ids()
    before = {str(tag_id) for tag_id in current_tag_ids} & buffet_ids
    after = {str(tag_id) for tag_id in new_tag_ids} & buffet_ids
    if before != after:
        raise HttpError(403, "Buffet-Rollen dürfen nur von Staff geändert werden.")


def without_buffet_tags_for_non_staff(user: Any, tag_ids: Iterable[Any]) -> list[Any]:
    """Drop buffet role tags from a new resource of a non-staff user."""
    tag_ids = list(tag_ids)
    if _is_staff(user):
        return tag_ids
    buffet_ids = _buffet_tag_ids()
    return [tag_id for tag_id in tag_ids if str(tag_id) not in buffet_ids]
