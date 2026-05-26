"""Messaging API — unified send/preview endpoints (email + WhatsApp)."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.models import Event
from event.schemas.messaging import (
    MessagePreviewOut,
    SendMessageIn,
    SendMessageResultOut,
)
from event.services.messaging import MessagingService

from .events import event_router
from .helpers import require_auth, require_event_manager


@event_router.post("/{event_slug}/messages/preview/", response=MessagePreviewOut)
def message_preview(request, event_slug: str, payload: SendMessageIn):
    """Preview message recipients with availability status."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    if payload.channel not in ("email", "whatsapp"):
        raise HttpError(400, "channel muss 'email' oder 'whatsapp' sein.")

    if payload.recipient_type not in ("all", "filtered", "selected"):
        raise HttpError(400, "recipient_type muss 'all', 'filtered' oder 'selected' sein.")

    if payload.recipient_type == "selected" and not payload.participant_ids:
        raise HttpError(400, "participant_ids ist erforderlich bei recipient_type 'selected'.")

    if payload.recipient_type == "filtered" and not payload.filters:
        raise HttpError(400, "filters ist erforderlich bei recipient_type 'filtered'.")

    filters = None
    if payload.filters:
        filters = payload.filters.model_dump(exclude_none=True)

    result = MessagingService.preview(
        event=event,
        channel=payload.channel,
        body=payload.body,
        recipient_type=payload.recipient_type,
        user=request.user,
        filters=filters,
        participant_ids=payload.participant_ids,
    )

    return result


@event_router.post("/{event_slug}/messages/send/", response=SendMessageResultOut)
def message_send(request, event_slug: str, payload: SendMessageIn):
    """Send messages via email or WhatsApp."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    if payload.channel not in ("email", "whatsapp"):
        raise HttpError(400, "channel muss 'email' oder 'whatsapp' sein.")

    if payload.recipient_type not in ("all", "filtered", "selected"):
        raise HttpError(400, "recipient_type muss 'all', 'filtered' oder 'selected' sein.")

    if payload.recipient_type == "selected" and not payload.participant_ids:
        raise HttpError(400, "participant_ids ist erforderlich bei recipient_type 'selected'.")

    if payload.recipient_type == "filtered" and not payload.filters:
        raise HttpError(400, "filters ist erforderlich bei recipient_type 'filtered'.")

    if payload.channel == "email" and not payload.subject:
        raise HttpError(400, "subject ist erforderlich für E-Mail-Versand.")

    filters = None
    if payload.filters:
        filters = payload.filters.model_dump(exclude_none=True)

    result = MessagingService.send(
        event=event,
        channel=payload.channel,
        subject=payload.subject,
        body=payload.body,
        recipient_type=payload.recipient_type,
        user=request.user,
        filters=filters,
        participant_ids=payload.participant_ids,
    )

    return result
