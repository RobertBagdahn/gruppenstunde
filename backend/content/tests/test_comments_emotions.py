"""Tests for ContentComment and ContentEmotion models and base_api helpers."""

import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import RequestFactory

from content.base_api import (
    create_comment,
    get_comments,
    get_emotion_counts,
    get_user_emotion,
    toggle_emotion,
)
from content.choices import CommentStatus
from content.models import ContentComment, ContentEmotion
from session.models import GroupSession

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="testuser",
        email="test@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def user2(db):
    return User.objects.create_user(
        username="testuser2",
        email="test2@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def session(db):
    return GroupSession.objects.create(
        title="Test Session",
        session_type="scout_skills",
        status="approved",
    )


@pytest.fixture
def request_factory():
    return RequestFactory()


def _make_auth_request(factory, user):
    """Create a request with an authenticated user and session."""
    request = factory.get("/")
    request.user = user
    # Simulate session
    from django.contrib.sessions.backends.db import SessionStore

    request.session = SessionStore()
    request.session.create()
    return request


def _make_anon_request(factory):
    """Create an anonymous request with session."""
    from django.contrib.auth.models import AnonymousUser
    from django.contrib.sessions.backends.db import SessionStore

    request = factory.get("/")
    request.user = AnonymousUser()
    request.session = SessionStore()
    request.session.create()
    return request


# ---------------------------------------------------------------------------
# ContentComment Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContentCommentModel:
    def test_anonymous_comment_defaults_to_pending(self, session, request_factory):
        request = _make_anon_request(request_factory)
        comment = create_comment(
            GroupSession,
            session.id,
            text="Anonymous comment",
            request=request,
            author_name="Anon",
        )
        assert comment.status == CommentStatus.PENDING
        assert comment.user is None
        assert comment.author_name == "Anon"

    def test_authenticated_comment_auto_approved(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        comment = create_comment(
            GroupSession,
            session.id,
            text="Authenticated comment",
            request=request,
        )
        assert comment.status == CommentStatus.APPROVED
        assert comment.user == user

    def test_nested_comment(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        parent = create_comment(GroupSession, session.id, text="Parent", request=request)
        child = create_comment(GroupSession, session.id, text="Reply", request=request, parent_id=parent.id)
        assert child.parent == parent
        assert child.parent_id == parent.id

    def test_get_comments_only_approved(self, session, user, request_factory):
        ct = ContentType.objects.get_for_model(GroupSession)
        # Create an approved comment
        ContentComment.objects.create(
            content_type=ct,
            object_id=session.id,
            text="Approved",
            status=CommentStatus.APPROVED,
        )
        # Create a pending comment
        ContentComment.objects.create(
            content_type=ct,
            object_id=session.id,
            text="Pending",
            status=CommentStatus.PENDING,
        )
        comments = get_comments(GroupSession, session.id)
        assert len(comments) == 1
        assert comments[0].text == "Approved"

    def test_get_comments_include_pending(self, session):
        ct = ContentType.objects.get_for_model(GroupSession)
        ContentComment.objects.create(
            content_type=ct,
            object_id=session.id,
            text="Approved",
            status=CommentStatus.APPROVED,
        )
        ContentComment.objects.create(
            content_type=ct,
            object_id=session.id,
            text="Pending",
            status=CommentStatus.PENDING,
        )
        comments = get_comments(GroupSession, session.id, include_pending=True)
        assert len(comments) == 2

    def test_get_comments_only_top_level(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        parent = create_comment(GroupSession, session.id, text="Parent", request=request)
        create_comment(GroupSession, session.id, text="Reply", request=request, parent_id=parent.id)
        # get_comments should only return top-level
        comments = get_comments(GroupSession, session.id)
        assert len(comments) == 1
        assert comments[0].text == "Parent"

    def test_comment_str(self, session):
        ct = ContentType.objects.get_for_model(GroupSession)
        comment = ContentComment.objects.create(
            content_type=ct,
            object_id=session.id,
            text="Test",
            author_name="Scout",
        )
        assert "Scout" in str(comment)


# ---------------------------------------------------------------------------
# ContentEmotion Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContentEmotionModel:
    def test_create_emotion_authenticated(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        counts = toggle_emotion(GroupSession, session.id, "in_love", request)
        assert counts.get("in_love") == 1

    def test_toggle_same_emotion_removes_it(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        toggle_emotion(GroupSession, session.id, "in_love", request)
        counts = toggle_emotion(GroupSession, session.id, "in_love", request)
        assert counts.get("in_love", 0) == 0

    def test_toggle_different_emotion_replaces(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        toggle_emotion(GroupSession, session.id, "in_love", request)
        counts = toggle_emotion(GroupSession, session.id, "happy", request)
        assert counts.get("in_love", 0) == 0
        assert counts.get("happy") == 1

    def test_anonymous_emotion(self, session, request_factory):
        request = _make_anon_request(request_factory)
        counts = toggle_emotion(GroupSession, session.id, "in_love", request)
        assert counts.get("in_love") == 1
        # Emotion recorded by session key
        ct = ContentType.objects.get_for_model(GroupSession)
        emotion = ContentEmotion.objects.filter(content_type=ct, object_id=session.id).first()
        assert emotion.user is None
        assert emotion.session_key != ""

    def test_multiple_users_emotions(self, session, user, user2, request_factory):
        req1 = _make_auth_request(request_factory, user)
        req2 = _make_auth_request(request_factory, user2)
        toggle_emotion(GroupSession, session.id, "in_love", req1)
        counts = toggle_emotion(GroupSession, session.id, "happy", req2)
        assert counts.get("in_love") == 1
        assert counts.get("happy") == 1

    def test_get_emotion_counts(self, session, user, user2, request_factory):
        req1 = _make_auth_request(request_factory, user)
        req2 = _make_auth_request(request_factory, user2)
        toggle_emotion(GroupSession, session.id, "in_love", req1)
        toggle_emotion(GroupSession, session.id, "in_love", req2)
        counts = get_emotion_counts(GroupSession, session.id)
        assert counts["in_love"] == 2

    def test_get_user_emotion_authenticated(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        toggle_emotion(GroupSession, session.id, "happy", request)
        emotion = get_user_emotion(GroupSession, session.id, request)
        assert emotion == "happy"

    def test_get_user_emotion_none_when_no_emotion(self, session, user, request_factory):
        request = _make_auth_request(request_factory, user)
        emotion = get_user_emotion(GroupSession, session.id, request)
        assert emotion is None

    def test_emotion_str(self, session):
        ct = ContentType.objects.get_for_model(GroupSession)
        emotion = ContentEmotion.objects.create(
            content_type=ct,
            object_id=session.id,
            emotion_type="in_love",
            session_key="test-session",
        )
        assert "in_love" in str(emotion)
