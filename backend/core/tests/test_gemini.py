"""Tests for core.services.gemini — centralized Gemini client."""

from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache
from ninja.errors import HttpError

from core.services.gemini import (
    CACHE_KEY,
    DEFAULT_TEXT_MODEL,
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
    @pytest.mark.django_db
    def test_unauthenticated_user_rejected(self, anon_user):
        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=anon_user, model="test", contents="hello")
        assert exc_info.value.status_code == 403

    @pytest.mark.django_db
    def test_none_user_rejected(self):
        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=None, model="test", contents="hello")
        assert exc_info.value.status_code == 403

    @pytest.mark.django_db
    def test_bypass_limits_skips_auth(self):
        with patch("core.services.gemini._get_client") as mock:
            mock.return_value = None
            result, interaction_id = gemini_call(
                user=None, model="test", contents="hello", bypass_limits=True, is_background=True
            )
            assert result is None
            assert interaction_id is not None


class TestGlobalRateLimit:
    @pytest.mark.django_db
    def test_calls_within_limit_succeed(self, user):
        with patch("core.services.gemini._get_client") as mock:
            mock.return_value = None
            for _ in range(GLOBAL_LIMIT):
                gemini_call(user=user, model="test", contents="hello")

    @pytest.mark.django_db
    def test_call_exceeding_limit_raises_429(self, user):
        cache.set(CACHE_KEY, GLOBAL_LIMIT, timeout=WINDOW_SECONDS)
        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=user, model="test", contents="hello")
        assert exc_info.value.status_code == 429

    @pytest.mark.django_db
    def test_bypass_limits_skips_rate_limit(self):
        cache.set(CACHE_KEY, GLOBAL_LIMIT, timeout=WINDOW_SECONDS)
        with patch("core.services.gemini._get_client") as mock:
            mock.return_value = None
            result, interaction_id = gemini_call(
                user=None, model="test", contents="hello", bypass_limits=True, is_background=True
            )
            assert result is None
            assert interaction_id is not None


class TestErrorHandling:
    @patch("core.services.gemini._get_client")
    @pytest.mark.django_db
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
    @pytest.mark.django_db
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

    @patch("core.services.gemini._get_client")
    @pytest.mark.django_db
    def test_text_calls_use_global_flash_lite_with_flex(self, mock_get_client, user):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        response = MagicMock(text='{"ok": true}')
        response.usage_metadata = None
        mock_client.models.generate_content.return_value = response

        gemini_call(user=user, model="gemini-3.1-flash-lite", contents="hello")

        kwargs = mock_client.models.generate_content.call_args.kwargs
        assert kwargs["model"] == DEFAULT_TEXT_MODEL
        assert kwargs["config"].http_options.headers == {"X-Vertex-AI-LLM-Request-Type": "flex"}

    @patch("core.services.gemini._get_client")
    @pytest.mark.django_db
    def test_unexpected_provider_error_raises_503(self, mock_get_client, user):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.models.generate_content.side_effect = RuntimeError("invalid provider configuration")

        with pytest.raises(HttpError) as exc_info:
            gemini_call(user=user, model="test", contents="hello")
        assert exc_info.value.status_code == 503
        assert "invalid provider configuration" in str(exc_info.value)


class TestImageCall:
    def test_image_call_uses_image_client(self, user):
        with patch("core.services.gemini._get_image_client") as mock:
            mock.return_value = None
            result, interaction_id = gemini_image_call(user=user, model="test", contents="hello")
            assert result is None
            assert interaction_id is not None
            mock.assert_called_once()

    @pytest.mark.django_db
    def test_image_call_enforces_auth(self, anon_user):
        with pytest.raises(HttpError) as exc_info:
            gemini_image_call(user=anon_user, model="test", contents="hello")
        assert exc_info.value.status_code == 403


class TestCostCalculation:
    def test_unknown_model_logs_warning_and_returns_none(self, caplog):
        from types import SimpleNamespace

        from core.services.gemini import _calculate_cost_eur

        um = SimpleNamespace(prompt_token_count=100, candidates_token_count=50, thoughts_token_count=0)
        with caplog.at_level("WARNING"):
            result = _calculate_cost_eur("gemini-unknown-model", um)
        assert result is None
        assert any("gemini-unknown-model" in r.message for r in caplog.records)

    def test_thinking_tokens_are_not_double_counted(self):
        from types import SimpleNamespace

        from core.services.gemini import _calculate_cost_eur

        um = SimpleNamespace(
            prompt_token_count=1_000_000, candidates_token_count=1_000_000, thoughts_token_count=1_000_000
        )
        result = _calculate_cost_eur(DEFAULT_TEXT_MODEL, um)
        # input 1M -> 0.25 USD, output 1M -> 1.50 USD, total 1.75 USD * 0.92 = 1.61 EUR.
        # Double-counting thoughts would yield 3.25 USD * 0.92 = 2.99 EUR.
        assert result == "1.610000"

    def test_missing_usage_metadata_returns_none(self):
        from core.services.gemini import _calculate_cost_eur

        assert _calculate_cost_eur(DEFAULT_TEXT_MODEL, None) is None
