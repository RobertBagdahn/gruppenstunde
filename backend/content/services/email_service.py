"""
Email service — Notifications for the content approval workflow.

Sends emails for:
- submitted → all staff users ("Neuer Content zur Freigabe")
- approved → author ("Dein Beitrag wurde veröffentlicht")
- rejected → author with reason ("Dein Beitrag wurde abgelehnt")

Uses Django's built-in send_mail. Backend is configured in settings:
- Development: console.EmailBackend (prints to stdout)
- Test: locmem.EmailBackend (stored in django.core.mail.outbox)
- Production: SMTP backend (Gmail / SendGrid)
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

User = get_user_model()

DEFAULT_FROM_EMAIL = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@gruppenstunde.de")
SITE_NAME = "Inspi – gruppenstunde.de"


def _get_content_type_label(content_obj) -> str:
    """Return a human-readable German label for a content type."""
    labels = {
        "GroupSession": "Gruppenstunden-Idee",
        "Blog": "Blog-Beitrag",
        "Game": "Spiel",
        "Recipe": "Rezept",
    }
    return labels.get(type(content_obj).__name__, "Beitrag")


def _get_content_url(content_obj) -> str:
    """Return the frontend URL for a content object."""
    url_prefixes = {
        "GroupSession": "/sessions/",
        "Blog": "/blogs/",
        "Game": "/games/",
        "Recipe": "/recipes/",
    }
    prefix = url_prefixes.get(type(content_obj).__name__, "/")
    slug = getattr(content_obj, "slug", "")
    base_url = getattr(settings, "FRONTEND_URL", "https://gruppenstunde.de")
    return f"{base_url}{prefix}{slug}"


def _get_author_email(content_obj) -> str | None:
    """Get the email of the content author."""
    if content_obj.created_by and content_obj.created_by.email:
        return content_obj.created_by.email
    authors = content_obj.authors.all()[:1]
    if authors and authors[0].email:
        return authors[0].email
    return None


def _get_author_name(content_obj) -> str:
    """Get the display name of the content author."""
    if content_obj.created_by:
        return content_obj.created_by.get_full_name() or content_obj.created_by.email
    authors = content_obj.authors.all()[:1]
    if authors:
        return authors[0].get_full_name() or authors[0].email
    return "Unbekannt"


def notify_submission(content_obj) -> int:
    """
    Notify all staff users that new content has been submitted for approval.

    Returns the number of emails sent.
    """
    type_label = _get_content_type_label(content_obj)
    author_name = _get_author_name(content_obj)
    content_url = _get_content_url(content_obj)

    subject = f"[{SITE_NAME}] Neuer {type_label} zur Freigabe: {content_obj.title}"
    message = (
        f"Hallo,\n\n"
        f"{author_name} hat einen neuen {type_label} zur Freigabe eingereicht:\n\n"
        f"Titel: {content_obj.title}\n"
        f"Typ: {type_label}\n"
        f"Link: {content_url}\n\n"
        f"Bitte prüfe den Beitrag im Admin-Bereich und genehmige oder lehne ihn ab.\n\n"
        f"Viele Grüße,\n"
        f"{SITE_NAME}"
    )

    staff_emails = list(
        User.objects.filter(is_staff=True, is_active=True).exclude(email="").values_list("email", flat=True)
    )

    if not staff_emails:
        logger.warning("No staff users with email found for submission notification")
        return 0

    sent = send_mail(
        subject=subject,
        message=message,
        from_email=DEFAULT_FROM_EMAIL,
        recipient_list=staff_emails,
        fail_silently=True,
    )

    logger.info(
        "Submission notification sent to %d staff users for %s '%s'",
        sent,
        type_label,
        content_obj.title,
    )
    return sent


def notify_approval(content_obj) -> int:
    """
    Notify the content author that their content has been approved.

    Returns the number of emails sent.
    """
    author_email = _get_author_email(content_obj)
    if not author_email:
        logger.warning(
            "No author email found for approval notification: %s #%d",
            type(content_obj).__name__,
            content_obj.pk,
        )
        return 0

    type_label = _get_content_type_label(content_obj)
    author_name = _get_author_name(content_obj)
    content_url = _get_content_url(content_obj)

    subject = f"[{SITE_NAME}] Dein {type_label} wurde veröffentlicht!"
    message = (
        f"Hallo {author_name},\n\n"
        f'dein {type_label} "{content_obj.title}" wurde genehmigt und ist jetzt '
        f"für alle sichtbar.\n\n"
        f"Hier kannst du ihn ansehen: {content_url}\n\n"
        f"Vielen Dank für deinen Beitrag!\n\n"
        f"Viele Grüße,\n"
        f"{SITE_NAME}"
    )

    sent = send_mail(
        subject=subject,
        message=message,
        from_email=DEFAULT_FROM_EMAIL,
        recipient_list=[author_email],
        fail_silently=True,
    )

    logger.info(
        "Approval notification sent to %s for %s '%s'",
        author_email,
        type_label,
        content_obj.title,
    )
    return sent


def notify_rejection(content_obj, reason: str = "") -> int:
    """
    Notify the content author that their content has been rejected.

    Includes the rejection reason so the author can improve and resubmit.

    Returns the number of emails sent.
    """
    author_email = _get_author_email(content_obj)
    if not author_email:
        logger.warning(
            "No author email found for rejection notification: %s #%d",
            type(content_obj).__name__,
            content_obj.pk,
        )
        return 0

    type_label = _get_content_type_label(content_obj)
    author_name = _get_author_name(content_obj)
    content_url = _get_content_url(content_obj)

    reason_text = f"\nBegründung: {reason}\n" if reason else ""

    subject = f"[{SITE_NAME}] Dein {type_label} wurde abgelehnt"
    message = (
        f"Hallo {author_name},\n\n"
        f'dein {type_label} "{content_obj.title}" wurde leider abgelehnt.\n'
        f"{reason_text}\n"
        f"Du kannst den Beitrag überarbeiten und erneut einreichen: {content_url}\n\n"
        f"Bei Fragen wende dich gerne an das Team.\n\n"
        f"Viele Grüße,\n"
        f"{SITE_NAME}"
    )

    sent = send_mail(
        subject=subject,
        message=message,
        from_email=DEFAULT_FROM_EMAIL,
        recipient_list=[author_email],
        fail_silently=True,
    )

    logger.info(
        "Rejection notification sent to %s for %s '%s' (reason: %s)",
        author_email,
        type_label,
        content_obj.title,
        reason[:100] if reason else "none",
    )
    return sent
