"""MeetingPoint CRUD endpoints with private visibility (per user/group)."""

import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from profiles.models import GroupMembership, UserGroup

from event.models import MeetingPoint
from event.schemas import (
    MeetingPointCreateIn,
    MeetingPointOut,
    MeetingPointUpdateIn,
    PaginatedMeetingPointOut,
)

from .helpers import require_auth

meeting_point_router = Router(tags=["meeting-points"])


def _visible_meeting_points_qs(user):
    """Return a queryset of MeetingPoints visible to the given user."""
    user_group_ids = GroupMembership.objects.filter(user=user, is_active=True).values_list("group_id", flat=True)

    return MeetingPoint.objects.filter(
        Q(created_by=user, group__isnull=True) | Q(group_id__in=user_group_ids)
    ).distinct()


# ==========================================================================
# MeetingPoint CRUD
# ==========================================================================


@meeting_point_router.get("/", response=PaginatedMeetingPointOut)
def list_meeting_points(request, page: int = 1, page_size: int = 20):
    """List visible MeetingPoints (own personal + group)."""
    require_auth(request)
    qs = _visible_meeting_points_qs(request.user)

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@meeting_point_router.post("/", response=MeetingPointOut)
def create_meeting_point(request, payload: MeetingPointCreateIn):
    """Create a new MeetingPoint. Optionally assign to a group."""
    require_auth(request)
    data = payload.dict()
    group_id = data.pop("group_id", None)

    if group_id is not None:
        group = get_object_or_404(UserGroup, id=group_id)
        is_member = GroupMembership.objects.filter(user=request.user, group=group, is_active=True).exists()
        if not is_member:
            raise HttpError(403, "Du bist kein Mitglied dieser Gruppe")
        data["group"] = group

    return MeetingPoint.objects.create(created_by=request.user, **data)


@meeting_point_router.get("/{meeting_point_id}/", response=MeetingPointOut)
def get_meeting_point(request, meeting_point_id: int):
    """Get a single MeetingPoint (visibility check)."""
    require_auth(request)
    qs = _visible_meeting_points_qs(request.user)
    meeting_point = qs.filter(id=meeting_point_id).first()
    if not meeting_point:
        raise HttpError(404, "Treffpunkt nicht gefunden")
    return meeting_point


@meeting_point_router.patch("/{meeting_point_id}/", response=MeetingPointOut)
def update_meeting_point(request, meeting_point_id: int, payload: MeetingPointUpdateIn):
    """Update a MeetingPoint (creator or group member)."""
    require_auth(request)
    qs = _visible_meeting_points_qs(request.user)
    meeting_point = qs.filter(id=meeting_point_id).first()
    if not meeting_point:
        raise HttpError(404, "Treffpunkt nicht gefunden")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(meeting_point, field, value)
    meeting_point.save()
    return meeting_point


@meeting_point_router.delete("/{meeting_point_id}/")
def delete_meeting_point(request, meeting_point_id: int):
    """Delete a MeetingPoint (creator only)."""
    require_auth(request)
    meeting_point = get_object_or_404(MeetingPoint, id=meeting_point_id)

    if meeting_point.created_by_id != request.user.id:
        raise HttpError(403, "Nur der Ersteller kann diesen Treffpunkt löschen")

    meeting_point.delete()
    return {"success": True, "message": "Treffpunkt gelöscht"}
