"""Tests for content approval workflow and email notifications."""

import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core import mail

from content.choices import ContentStatus
from content.models import ApprovalLog
from content.services.approval_service import (
    ApprovalError,
    approve_content,
    can_transition,
    get_approval_history,
    get_pending_approvals,
    reject_content,
    submit_for_approval,
    validate_for_submission,
)
from session.models import GroupSession

User = get_user_model()


@pytest.fixture
def author(db):
    return User.objects.create_user(
        username="author",
        email="author@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def reviewer(db):
    return User.objects.create_user(
        username="reviewer",
        email="reviewer@inspi.dev",
        password="testpass123",
        is_staff=True,
    )


@pytest.fixture
def non_staff_user(db):
    return User.objects.create_user(
        username="normaluser",
        email="normal@inspi.dev",
        password="testpass123",
        is_staff=False,
    )


@pytest.fixture
def draft_session(db, author):
    return GroupSession.objects.create(
        title="Test Session",
        summary="A test session",
        description="Full description here",
        session_type="scout_skills",
        status=ContentStatus.DRAFT,
        created_by=author,
    )


@pytest.fixture
def submitted_session(db, author):
    session = GroupSession.objects.create(
        title="Submitted Session",
        summary="Ready for review",
        session_type="crafts",
        status=ContentStatus.SUBMITTED,
        created_by=author,
    )
    # Create a submission log entry so get_pending_approvals can find it
    ct = ContentType.objects.get_for_model(session)
    ApprovalLog.objects.create(
        content_type=ct,
        object_id=session.pk,
        action="submitted",
    )
    return session


# ---------------------------------------------------------------------------
# State Transition Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCanTransition:
    def test_draft_to_submitted(self):
        assert can_transition(ContentStatus.DRAFT, ContentStatus.SUBMITTED) is True

    def test_submitted_to_approved(self):
        assert can_transition(ContentStatus.SUBMITTED, ContentStatus.APPROVED) is True

    def test_submitted_to_rejected(self):
        assert can_transition(ContentStatus.SUBMITTED, ContentStatus.REJECTED) is True

    def test_approved_to_archived(self):
        assert can_transition(ContentStatus.APPROVED, ContentStatus.ARCHIVED) is True

    def test_rejected_to_draft(self):
        assert can_transition(ContentStatus.REJECTED, ContentStatus.DRAFT) is True

    def test_archived_to_draft(self):
        assert can_transition(ContentStatus.ARCHIVED, ContentStatus.DRAFT) is True

    def test_invalid_draft_to_approved(self):
        assert can_transition(ContentStatus.DRAFT, ContentStatus.APPROVED) is False

    def test_invalid_approved_to_submitted(self):
        assert can_transition(ContentStatus.APPROVED, ContentStatus.SUBMITTED) is False


# ---------------------------------------------------------------------------
# Validation Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestValidateForSubmission:
    def test_valid_content(self, draft_session):
        errors = validate_for_submission(draft_session)
        assert errors == []

    def test_missing_title(self, draft_session):
        draft_session.title = ""
        errors = validate_for_submission(draft_session)
        assert len(errors) == 1
        assert "title" in errors[0]

    def test_whitespace_title(self, draft_session):
        draft_session.title = "   "
        errors = validate_for_submission(draft_session)
        assert len(errors) == 1


# ---------------------------------------------------------------------------
# Submit for Approval Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSubmitForApproval:
    def test_submit_changes_status(self, draft_session, author):
        submit_for_approval(draft_session, user=author)
        draft_session.refresh_from_db()
        assert draft_session.status == ContentStatus.SUBMITTED

    def test_submit_creates_approval_log(self, draft_session, author):
        submit_for_approval(draft_session, user=author)
        ct = ContentType.objects.get_for_model(draft_session)
        log = ApprovalLog.objects.filter(
            content_type=ct,
            object_id=draft_session.pk,
        ).first()
        assert log is not None
        assert log.action == "submitted"
        assert log.reviewer == author

    def test_submit_sends_email_to_staff(self, draft_session, author, reviewer):
        mail.outbox.clear()
        submit_for_approval(draft_session, user=author)
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        assert "Freigabe" in email.subject
        assert draft_session.title in email.subject
        assert reviewer.email in email.to

    def test_submit_non_draft_raises_error(self, submitted_session, author):
        with pytest.raises(ApprovalError, match="Entwürfe"):
            submit_for_approval(submitted_session, user=author)

    def test_submit_without_title_raises_error(self, draft_session, author):
        draft_session.title = ""
        draft_session.save()
        with pytest.raises(ApprovalError, match="title"):
            submit_for_approval(draft_session, user=author)


# ---------------------------------------------------------------------------
# Approve Content Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestApproveContent:
    def test_approve_changes_status(self, submitted_session, reviewer):
        approve_content(submitted_session, reviewer=reviewer)
        submitted_session.refresh_from_db()
        assert submitted_session.status == ContentStatus.APPROVED

    def test_approve_creates_approval_log(self, submitted_session, reviewer):
        approve_content(submitted_session, reviewer=reviewer, reason="Sieht gut aus")
        ct = ContentType.objects.get_for_model(submitted_session)
        log = ApprovalLog.objects.filter(
            content_type=ct,
            object_id=submitted_session.pk,
            action="approved",
        ).first()
        assert log is not None
        assert log.reviewer == reviewer
        assert log.reason == "Sieht gut aus"

    def test_approve_sends_email_to_author(self, submitted_session, reviewer):
        mail.outbox.clear()
        approve_content(submitted_session, reviewer=reviewer)
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        assert "veröffentlicht" in email.subject
        assert submitted_session.created_by.email in email.to

    def test_approve_non_submitted_raises_error(self, draft_session, reviewer):
        with pytest.raises(ApprovalError, match="eingereichte"):
            approve_content(draft_session, reviewer=reviewer)

    def test_non_staff_cannot_approve(self, submitted_session, non_staff_user):
        with pytest.raises(ApprovalError, match="Admins"):
            approve_content(submitted_session, reviewer=non_staff_user)


# ---------------------------------------------------------------------------
# Reject Content Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRejectContent:
    def test_reject_changes_status(self, submitted_session, reviewer):
        reject_content(submitted_session, reviewer=reviewer, reason="Needs work")
        submitted_session.refresh_from_db()
        assert submitted_session.status == ContentStatus.REJECTED

    def test_reject_creates_approval_log(self, submitted_session, reviewer):
        reject_content(submitted_session, reviewer=reviewer, reason="Zu kurz")
        ct = ContentType.objects.get_for_model(submitted_session)
        log = ApprovalLog.objects.filter(
            content_type=ct,
            object_id=submitted_session.pk,
            action="rejected",
        ).first()
        assert log is not None
        assert log.reviewer == reviewer
        assert log.reason == "Zu kurz"

    def test_reject_sends_email_to_author(self, submitted_session, reviewer):
        mail.outbox.clear()
        reject_content(submitted_session, reviewer=reviewer, reason="Bitte ueberarbeiten")
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        assert "abgelehnt" in email.subject
        assert submitted_session.created_by.email in email.to
        assert "Bitte ueberarbeiten" in email.body

    def test_reject_non_submitted_raises_error(self, draft_session, reviewer):
        with pytest.raises(ApprovalError, match="eingereichte"):
            reject_content(draft_session, reviewer=reviewer, reason="No")

    def test_non_staff_cannot_reject(self, submitted_session, non_staff_user):
        with pytest.raises(ApprovalError, match="Admins"):
            reject_content(submitted_session, reviewer=non_staff_user, reason="Nope")


# ---------------------------------------------------------------------------
# Approval History Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestApprovalHistory:
    def test_history_returns_all_entries(self, draft_session, author, reviewer):
        submit_for_approval(draft_session, user=author)
        approve_content(draft_session, reviewer=reviewer)
        history = get_approval_history(draft_session)
        assert len(history) == 2
        assert history[0]["action"] == "approved"  # newest first
        assert history[1]["action"] == "submitted"


# ---------------------------------------------------------------------------
# Pending Approvals Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPendingApprovals:
    def test_returns_submitted_content(self, submitted_session):
        pending = get_pending_approvals()
        assert len(pending) == 1
        assert pending[0]["title"] == "Submitted Session"
        assert pending[0]["content_type"] == "groupsession"

    def test_excludes_non_submitted(self, draft_session):
        pending = get_pending_approvals()
        assert len(pending) == 0

    def test_respects_limit(self, author):
        for i in range(5):
            session = GroupSession.objects.create(
                title=f"Session {i}",
                session_type="crafts",
                status=ContentStatus.SUBMITTED,
                created_by=author,
            )
            ct = ContentType.objects.get_for_model(session)
            ApprovalLog.objects.create(
                content_type=ct,
                object_id=session.pk,
                action="submitted",
            )
        pending = get_pending_approvals(limit=3)
        assert len(pending) == 3


# ---------------------------------------------------------------------------
# Full Workflow Integration Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFullWorkflow:
    def test_submit_approve_workflow(self, draft_session, author, reviewer):
        mail.outbox.clear()

        # Submit
        submit_for_approval(draft_session, user=author)
        assert draft_session.status == ContentStatus.SUBMITTED
        assert len(mail.outbox) == 1  # notification to staff

        # Approve
        approve_content(draft_session, reviewer=reviewer)
        assert draft_session.status == ContentStatus.APPROVED
        assert len(mail.outbox) == 2  # notification to author

        # Check audit trail
        history = get_approval_history(draft_session)
        assert len(history) == 2

    def test_submit_reject_resubmit_workflow(self, draft_session, author, reviewer):
        mail.outbox.clear()

        # Submit
        submit_for_approval(draft_session, user=author)
        assert draft_session.status == ContentStatus.SUBMITTED

        # Reject
        reject_content(draft_session, reviewer=reviewer, reason="Zu kurz")
        assert draft_session.status == ContentStatus.REJECTED

        # Re-edit (back to draft)
        draft_session.status = ContentStatus.DRAFT
        draft_session.save()

        # Re-submit
        submit_for_approval(draft_session, user=author)
        assert draft_session.status == ContentStatus.SUBMITTED

        # Approve this time
        approve_content(draft_session, reviewer=reviewer)
        assert draft_session.status == ContentStatus.APPROVED

        # Full trail
        history = get_approval_history(draft_session)
        assert len(history) == 4  # submitted, rejected, submitted, approved
