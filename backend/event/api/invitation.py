"""Invitation PDF endpoints — download and send branded invitation PDFs."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from ninja import Schema

from event.models import Event
from event.services.ci_helper import get_event_ci
from event.services.invitation_pdf import InvitationPdfService

from .events import event_router
from .helpers import require_auth, require_event_manager

logger = logging.getLogger(__name__)

DEFAULT_FROM_EMAIL = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@gruppenstunde.de")


class SendInvitationIn(Schema):
    recipient_type: str  # "groups" | "selected"
    user_ids: list[int] | None = None
    subject: str | None = None


class SendInvitationOut(Schema):
    sent_count: int
    failed_count: int


@event_router.get("/{event_slug}/invitation-pdf/")
def download_invitation_pdf(request, event_slug: str):
    """Download the invitation PDF for an event (manager only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    if not event.invitation_text:
        return HttpResponse("Kein Einladungstext vorhanden", status=400, content_type="text/plain")

    file_bytes, content_type, filename = InvitationPdfService.generate(event)

    response = HttpResponse(file_bytes, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@event_router.post("/{event_slug}/send-invitation/", response=SendInvitationOut)
def send_invitation(request, event_slug: str, payload: SendInvitationIn):
    """Send invitation PDF via email to groups or specific users (manager only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    if not event.invitation_text:
        return HttpResponse("Kein Einladungstext vorhanden", status=400, content_type="text/plain")

    # Generate the PDF
    file_bytes, _content_type, filename = InvitationPdfService.generate(event)

    # Collect recipient emails
    recipient_emails: list[str] = []

    if payload.recipient_type == "groups":
        from profiles.models import GroupMembership

        for group in event.invited_groups.filter(is_deleted=False):
            emails = list(
                GroupMembership.objects.filter(group=group, is_active=True)
                .select_related("user")
                .exclude(user__email="")
                .values_list("user__email", flat=True)
            )
            recipient_emails.extend(emails)
    elif payload.recipient_type == "selected" and payload.user_ids:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        recipient_emails = list(
            User.objects.filter(id__in=payload.user_ids).exclude(email="").values_list("email", flat=True)
        )

    # Deduplicate
    recipient_emails = list(set(recipient_emails))

    if not recipient_emails:
        return {"sent_count": 0, "failed_count": 0}

    # Build HTML email body
    ci = get_event_ci(event)
    subject = payload.subject or f"Einladung: {event.name}"

    # Build date/location info for the email
    date_info = ""
    if event.start_date:
        date_info = event.start_date.strftime("%d.%m.%Y %H:%M")
        if event.end_date:
            date_info += f" – {event.end_date.strftime('%d.%m.%Y %H:%M')}"

    location_info = ""
    if event.event_location:
        location_info = event.event_location.name
        if event.event_location.full_address:
            location_info += f" ({event.event_location.full_address})"
    elif event.location:
        location_info = event.location

    booking_options = [
        {"name": opt.name, "price": f"{opt.price:.2f} EUR", "description": opt.description}
        for opt in event.booking_options.filter(is_system=False).order_by("name")
    ]

    ci_ctx = {
        "ci_group_name": ci.group_name,
        "ci_primary_color": ci.primary_color,
        "ci_secondary_color": ci.secondary_color,
        "ci_logo_url": ci.logo_url,
        "ci_slogan": ci.slogan,
        "ci_greeting_text": ci.greeting_text,
        "ci_footer_text": ci.footer_text,
        "ci_payment_info": ci.payment_info,
        "ci_signature_text": ci.signature_text,
    }
    html_context = {
        **ci_ctx,
        "event_name": event.name,
        "invitation_text": event.invitation_text,
        "date_info": date_info,
        "location_info": location_info,
        "booking_options": booking_options,
    }
    html_body = render_to_string("event/email/invitation.html", html_context)
    plain_body = f"Einladung zu {event.name}\n\n{event.invitation_text}"

    # Determine reply-to
    reply_to = []
    responsible = event.responsible_persons.first()
    if responsible and responsible.email:
        reply_to = [responsible.email]

    sent_count = 0
    failed_count = 0

    for email in recipient_emails:
        try:
            msg = EmailMessage(
                subject=subject,
                body=plain_body,
                from_email=DEFAULT_FROM_EMAIL,
                to=[email],
                reply_to=reply_to,
            )
            msg.content_subtype = "plain"
            msg.attach(filename, file_bytes, "application/pdf")
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
            sent_count += 1
        except Exception as exc:
            logger.warning("Failed to send invitation to %s: %s", email, exc, exc_info=True)
            failed_count += 1

    return {"sent_count": sent_count, "failed_count": failed_count}
