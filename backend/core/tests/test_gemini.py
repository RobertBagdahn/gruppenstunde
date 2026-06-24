"""Tests for core.services.gemini — centralized Gemini client."""

from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from ninja.errors import HttpError

from core.services.gemini import (
    CACHE_KEY,
    GLOBAL_LIMIT,
    WINDOW_SECONDS,
    gemini_call,
    gemini_image_call,
)


@pytest.fixture(autouse=True)
def clear_cache():
    cache.delete(CACHE_KEY)
    yield
    cache.delete(CACHE_KEY)


@pytest.fixture()
def user(db):
    from django.contrib.auth import get_user_model

    return get_user_model().objects.create_user(username="testuser", password="pass")


@pytest.fixture()
def anon_user():
    """A mock anonymous user."""
    u = MagicMock()
    u.is_authenticated = False
    return u


class TestAuthEnforcement:
    def test_unauthenticated_user_rejected(self, anon_user):
        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=anon_user, model="test", contents="hello")
        assert exc_info.value.status_code == 403

    def test_none_user_rejected(self):
        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=None, model="test", contents="hello")
        assert exc_info.value.status_code == 403

    def test_bypass_limits_skips_auth(self):
        with patch("core.services.gemini._get_client") as mock:
            mock.return_value = None
            # Should not raise even with None user
            result = gemini_call(user=None, model="test", contents="hello", bypass_limits=True)
            assert result is None


class TestGlobalRateLimit:
    def test_calls_within_limit_succeed(self, user):
        with patch("core.services.gemini._get_client") as mock:
            mock.return_value = None
            for _ in range(GLOBAL_LIMIT):
                gemini_call(user=user, model="test", contents="hello")

    def test_call_exceeding_limit_raises_429(self, user):
        cache.set(CACHE_KEY, GLOBAL_LIMIT, timeout=WINDOW_SECONDS)
        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=user, model="test", contents="hello")
        assert exc_info.value.status_code == 429

    def test_bypass_limits_skips_rate_limit(self):
        cache.set(CACHE_KEY, GLOBAL_LIMIT, timeout=WINDOW_SECONDS)
        with patch("core.services.gemini._get_client") as mock:
            mock.return_value = None
            # Should not raise
            gemini_call(user=None, model="test", contents="hello", bypass_limits=True)


class TestErrorHandling:
    @patch("core.services.gemini._get_client")
    def test_google_429_raises_upstream_rate_limit(self, mock_get_client, user):
        from google.genai.errors import ClientError

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        exc = ClientError.__new__(ClientError)
        exc.code = 429
        exc.message = "quota exceeded"
        mock_client.models.generate_content.side_effect = exc

        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=user, model="test", contents="hello")
        assert exc_info.value.status_code == 429

    @patch("core.services.gemini._get_client")
    def test_server_error_raises_503(self, mock_get_client, user):
        from google.genai.errors import ServerError

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        exc = ServerError.__new__(ServerError)
        exc.code = 500
        exc.message = "internal"
        mock_client.models.generate_content.side_effect = exc

        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=user, model="test", contents="hello")
        assert exc_info.value.status_code == 503


class TestImageCall:
    def test_image_call_uses_image_client(self, user):
        with patch("core.services.gemini._get_image_client") as mock:
            mock.return_value = None
            result = gemini_image_call(user=user, model="test", contents="hello")
            assert result is None
            mock.assert_called_once()

    def test_image_call_enforces_auth(self, anon_user):
        with pytest.raises(HttpError) as exc_info:
            gemini_image_call(user=anon_user, model="test", contents="hello")
        assert exc_info.value.status_code == 403
