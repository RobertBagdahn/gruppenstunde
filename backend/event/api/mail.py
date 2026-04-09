"""Mail API endpoint for sending emails to event participants."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.models import Event
from event.schemas import MailCreateIn, MailResultOut
from event.services.mail import MailService

from .events import event_router
from .helpers import require_auth, require_event_manager


@event_router.post("/{event_slug}/send-mail/", response=MailResultOut)
def send_mail(request, event_slug: str, payload: MailCreateIn):
    """Send manual email to event participants."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    # Validate recipient_type
    if payload.recipient_type not in ("all", "filtered", "selected"):
        raise HttpError(400, "recipient_type muss 'all', 'filtered' oder 'selected' sein.")

    if payload.recipient_type == "selected" and not payload.participant_ids:
        raise HttpError(400, "participant_ids ist erforderlich bei recipient_type 'selected'.")

    if payload.recipient_type == "filtered" and not payload.filters:
        raise HttpError(400, "filters ist erforderlich bei recipient_type 'filtered'.")

    filters = None
    if payload.filters:
        filters = payload.filters.model_dump(exclude_none=True)

    result = MailService.send_mail(
        event=event,
        subject=payload.subject,
        body=payload.body,
        recipient_type=payload.recipient_type,
        user=request.user,
        filters=filters,
        participant_ids=payload.participant_ids,
    )

    return result
