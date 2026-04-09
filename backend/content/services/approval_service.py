"""
Approval service — Content status transition logic and audit trail.

Manages the approval workflow:
  draft → submitted → approved/rejected
  approved → archived
  rejected → draft (re-edit) → submitted

Creates ApprovalLog entries for all transitions.
Triggers email notifications via email_service.
"""

import logging

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from content.choices import ApprovalAction as ApprovalActionChoices
from content.choices import ContentStatus
from content.models import ApprovalLog

logger = logging.getLogger(__name__)

User = get_user_model()

# Valid state transitions
VALID_TRANSITIONS: dict[str, list[str]] = {
    ContentStatus.DRAFT: [ContentStatus.SUBMITTED],
    ContentStatus.SUBMITTED: [ContentStatus.APPROVED, ContentStatus.REJECTED],
    ContentStatus.APPROVED: [ContentStatus.ARCHIVED],
    ContentStatus.REJECTED: [ContentStatus.DRAFT],
    ContentStatus.ARCHIVED: [ContentStatus.DRAFT],
}

# Fields required before submitting for approval
REQUIRED_FIELDS_FOR_SUBMISSION = ["title"]


class ApprovalError(Exception):
    """Raised when an approval action is invalid."""

    pass


def validate_for_submission(content_obj) -> list[str]:
    """
    Validate that a content object has all required fields for submission.

    Returns a list of validation error messages (empty if valid).
    """
    errors: list[str] = []
    for field in REQUIRED_FIELDS_FOR_SUBMISSION:
        value = getattr(content_obj, field, None)
        if not value or (isinstance(value, str) and not value.strip()):
            errors.append(f"Das Feld '{field}' ist erforderlich.")
    return errors


def can_transition(current_status: str, target_status: str) -> bool:
    """Check if a status transition is valid."""
    allowed = VALID_TRANSITIONS.get(current_status, [])
    return target_status in allowed


def submit_for_approval(content_obj, user=None) -> None:
    """
    Submit content for approval (draft → submitted).

    Validates required fields and creates an ApprovalLog entry.
    Sends notification email to admins.
    """
    if content_obj.status != ContentStatus.DRAFT:
        raise ApprovalError(f"Nur Entwürfe können eingereicht werden. Aktueller Status: {content_obj.status}")

    errors = validate_for_submission(content_obj)
    if errors:
        raise ApprovalError("; ".join(errors))

    content_obj.status = ContentStatus.SUBMITTED
    content_obj.save(update_fields=["status"])

    # Create audit log
    ct = ContentType.objects.get_for_model(content_obj)
    ApprovalLog.objects.create(
        content_type=ct,
        object_id=content_obj.pk,
        action=ApprovalActionChoices.SUBMITTED,
        reviewer=user,
    )

    # Send notification to admins
    try:
        from content.services.email_service import notify_submission

        notify_submission(content_obj)
    except Exception:
        logger.warning("Failed to send submission notification", exc_info=True)

    logger.info(
        "Content submitted for approval: %s #%d by user %s",
        type(content_obj).__name__,
        content_obj.pk,
        user,
    )


def approve_content(content_obj, reviewer, reason: str = "") -> None:
    """
    Approve submitted content (submitted → approved).

    Only staff users can approve.
    Creates an ApprovalLog entry and sends notification to author.
    """
    if content_obj.status != ContentStatus.SUBMITTED:
        raise ApprovalError(f"Nur eingereichte Inhalte können genehmigt werden. Aktueller Status: {content_obj.status}")

    if not reviewer.is_staff:
        raise ApprovalError("Nur Admins können Inhalte genehmigen.")

    content_obj.status = ContentStatus.APPROVED
    content_obj.save(update_fields=["status"])

    # Create audit log
    ct = ContentType.objects.get_for_model(content_obj)
    ApprovalLog.objects.create(
        content_type=ct,
        object_id=content_obj.pk,
        action=ApprovalActionChoices.APPROVED,
        reviewer=reviewer,
        reason=reason,
    )

    # Send notification to author
    try:
        from content.services.email_service import notify_approval

        notify_approval(content_obj)
    except Exception:
        logger.warning("Failed to send approval notification", exc_info=True)

    logger.info(
        "Content approved: %s #%d by reviewer %s",
        type(content_obj).__name__,
        content_obj.pk,
        reviewer,
    )


def reject_content(content_obj, reviewer, reason: str = "") -> None:
    """
    Reject submitted content (submitted → rejected).

    Only staff users can reject. Reason is required.
    Creates an ApprovalLog entry and sends notification to author.
    """
    if content_obj.status != ContentStatus.SUBMITTED:
        raise ApprovalError(f"Nur eingereichte Inhalte können abgelehnt werden. Aktueller Status: {content_obj.status}")

    if not reviewer.is_staff:
        raise ApprovalError("Nur Admins können Inhalte ablehnen.")

    content_obj.status = ContentStatus.REJECTED
    content_obj.save(update_fields=["status"])

    # Create audit log
    ct = ContentType.objects.get_for_model(content_obj)
    ApprovalLog.objects.create(
        content_type=ct,
        object_id=content_obj.pk,
        action=ApprovalActionChoices.REJECTED,
        reviewer=reviewer,
        reason=reason,
    )

    # Send notification to author
    try:
        from content.services.email_service import notify_rejection

        notify_rejection(content_obj, reason)
    except Exception:
        logger.warning("Failed to send rejection notification", exc_info=True)

    logger.info(
        "Content rejected: %s #%d by reviewer %s — reason: %s",
        type(content_obj).__name__,
        content_obj.pk,
        reviewer,
        reason,
    )


def get_approval_history(content_obj) -> list[dict]:
    """Get the approval history for a content object."""
    ct = ContentType.objects.get_for_model(content_obj)
    logs = ApprovalLog.objects.filter(
        content_type=ct,
        object_id=content_obj.pk,
    ).select_related("reviewer")

    return [
        {
            "id": log.id,
            "action": log.action,
            "reviewer_name": (log.reviewer.get_full_name() or log.reviewer.email if log.reviewer else None),
            "reason": log.reason,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


def get_pending_approvals(limit: int = 50) -> list[dict]:
    """
    Get all content items awaiting approval.

    Returns a list of dicts with content_type, object_id, title, author, submitted_at.
    """
    from blog.models import Blog
    from game.models import Game
    from recipe.models import Recipe
    from session.models import GroupSession

    results: list[dict] = []
    for model_class in [GroupSession, Blog, Game, Recipe]:
        ct = ContentType.objects.get_for_model(model_class)
        submitted = model_class.objects.filter(status=ContentStatus.SUBMITTED)
        for item in submitted[:limit]:
            # Get submission timestamp from ApprovalLog
            submission_log = (
                ApprovalLog.objects.filter(
                    content_type=ct,
                    object_id=item.pk,
                    action=ApprovalActionChoices.SUBMITTED,
                )
                .order_by("-created_at")
                .first()
            )
            results.append(
                {
                    "content_type": ct.model,
                    "object_id": item.pk,
                    "title": item.title,
                    "slug": item.slug,
                    "summary": item.summary[:200] if item.summary else "",
                    "submitted_at": (
                        submission_log.created_at.isoformat() if submission_log else item.created_at.isoformat()
                    ),
                    "author": _get_content_author(item),
                }
            )

    results.sort(key=lambda r: r["submitted_at"])
    return results[:limit]


def _get_content_author(content_obj) -> str | None:
    """Get the display name of the content author."""
    if content_obj.created_by:
        return content_obj.created_by.get_full_name() or content_obj.created_by.email
    authors = content_obj.authors.all()[:1]
    if authors:
        return authors[0].get_full_name() or authors[0].email
    return None
