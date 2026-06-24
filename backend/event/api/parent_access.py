"""Parent access token API endpoints."""

import math

from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Schema
from ninja.errors import HttpError

from event.api.events import event_router
from event.api.helpers import require_auth, require_event_manager
from event.models import Event, ParentAccessToken, Participant
from event.schemas import (
    BatchParentAccessTokenCreateIn,
    MeetingPointOut,
    PaginatedParentAccessTokenOut,
    ParentAccessTokenCreateIn,
    ParentAccessTokenOut,
)

# ==========================================================================
# Parent View (public, no auth required)
# ==========================================================================


class ParentViewOut(Schema):
    child_name: str
    event_name: str
    event_description: str
    start_date: str | None = None
    end_date: str | None = None
    meeting_point: MeetingPointOut | None = None
    packing_list_items: list[str] = []
    invitation_text: str = ""


@event_router.get("/{event_slug}/parent/{token}/", response=ParentViewOut)
def get_parent_view(request, event_slug: str, token: str):
    """Public parent access page — no authentication required."""
    from event.services.parent_access import ParentAccessService

    token_obj = ParentAccessService.verify_token(token)
    if not token_obj:
        raise HttpError(404, "Ungültiger oder abgelaufener Zugangslink.")

    participant = token_obj.participant
    event = participant.registration.event

    if event.slug != event_slug:
        raise HttpError(404, "Event nicht gefunden")

    # Build packing list items
    packing_items = []
    if event.packing_list:
        for category in event.packing_list.categories.prefetch_related("items").all():
            for item in category.items.all():
                packing_items.append(f"{category.name}: {item.name}")

    return {
        "child_name": f"{participant.first_name} {participant.last_name}".strip(),
        "event_name": event.name,
        "event_description": event.description,
        "start_date": event.start_date.isoformat() if event.start_date else None,
        "end_date": event.end_date.isoformat() if event.end_date else None,
        "meeting_point": event.meeting_point,
        "packing_list_items": packing_items,
        "invitation_text": event.invitation_text,
    }


@event_router.post("/{event_slug}/parent-access/", response={201: ParentAccessTokenOut})
def create_parent_token(request, event_slug: str, payload: ParentAccessTokenCreateIn):
    """Generate a parent access token for a participant."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participant = get_object_or_404(Participant, id=payload.participant_id, registration__event=event)

    from datetime import timedelta

    token = ParentAccessToken.objects.create(
        participant=participant,
        email=payload.email,
        expires_at=timezone.now() + timedelta(days=payload.expires_in_days),
    )
    return 201, token


@event_router.post("/{event_slug}/parent-access/batch/", response=list[ParentAccessTokenOut])
def batch_create_parent_tokens(request, event_slug: str, payload: BatchParentAccessTokenCreateIn):
    """Generate parent access tokens for all participants."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    from datetime import timedelta

    participants = Participant.objects.filter(registration__event=event)
    tokens = []
    expires_at = timezone.now() + timedelta(days=payload.expires_in_days)

    for participant in participants:
        # Skip if token already exists
        if ParentAccessToken.objects.filter(participant=participant, expires_at__gt=timezone.now()).exists():
            continue

        email = ""
        if payload.email_field == "email":
            email = participant.email or ""

        token = ParentAccessToken.objects.create(
            participant=participant,
            email=email,
            expires_at=expires_at,
        )
        tokens.append(token)

    return tokens


@event_router.get("/{event_slug}/parent-access/", response=PaginatedParentAccessTokenOut)
def list_parent_tokens(request, event_slug: str, page: int = 1, page_size: int = 20):
    """List parent access tokens for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    qs = ParentAccessToken.objects.filter(
        participant__registration__event=event,
    ).select_related("participant")

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


@event_router.delete("/{event_slug}/parent-access/{token_id}/")
def revoke_parent_token(request, event_slug: str, token_id: int):
    """Revoke a parent access token."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    token = get_object_or_404(
        ParentAccessToken,
        id=token_id,
        participant__registration__event=event,
    )
    token.delete()
    return {"success": True, "message": "Elternzugangs-Token widerrufen"}
