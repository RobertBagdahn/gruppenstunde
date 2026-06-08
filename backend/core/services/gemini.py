"""
Centralized Gemini API client with global rate limiting and auth enforcement.

All Gemini calls across the application MUST go through gemini_call() or
gemini_image_call(). Direct genai.Client usage is not permitted elsewhere.
"""

import logging
import time

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.core.cache import cache
from ninja.errors import HttpError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GLOBAL_LIMIT = 200
WINDOW_SECONDS = 300  # 5 minutes
CACHE_KEY = "gemini_global_calls"

EMBEDDING_LIMIT = 1000
EMBEDDING_WINDOW_SECONDS = 300  # 5 minutes
EMBEDDING_CACHE_KEY = "gemini_embedding_calls"

# ---------------------------------------------------------------------------
# Custom exceptions (re-exported for backward compat)
# ---------------------------------------------------------------------------


class GeminiRateLimitError(HttpError):
    """Global Gemini rate limit exceeded."""

    def __init__(self):
        super().__init__(429, "KI-Limit erreicht. Bitte versuche es in einigen Minuten erneut.")


class GeminiAuthError(HttpError):
    """User not authenticated for Gemini calls."""

    def __init__(self):
        super().__init__(403, "Anmeldung erforderlich")


class GeminiUnavailableError(HttpError):
    """Gemini API not reachable."""

    def __init__(self, detail: str = "KI nicht erreichbar. Bitte versuche es später erneut."):
        super().__init__(503, detail)


class GeminiInvalidResponseError(HttpError):
    """Gemini returned empty/invalid response."""

    def __init__(self, detail: str = "KI-Antwort ungültig. Bitte versuche es erneut."):
        super().__init__(502, detail)


class GeminiUpstreamRateLimitError(HttpError):
    """Google's own 429."""

    def __init__(self):
        super().__init__(429, "KI ist gerade überlastet. Bitte versuche es in einer Minute erneut.")


# ---------------------------------------------------------------------------
# Internal client management
# ---------------------------------------------------------------------------

_client = None
_image_client = None


def _get_client():
    """Lazy-init the text generation client."""
    global _client
    if _client is None:
        try:
            from google import genai

            project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")
            location = getattr(settings, "VERTEX_AI_LOCATION", "global")

            if project:
                _client = genai.Client(
                    vertexai=True,
                    project=project,
                    location=location,
                )
            else:
                logger.warning("GOOGLE_CLOUD_PROJECT not set - AI features disabled")
        except ImportError:
            logger.warning("google-genai not installed - AI features disabled")
    return _client


def _get_image_client():
    """Lazy-init the image generation client (uses 'global' location)."""
    global _image_client
    if _image_client is None:
        try:
            from google import genai

            project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")

            if project:
                _image_client = genai.Client(
                    vertexai=True,
                    project=project,
                    location="global",
                )
            else:
                logger.warning("GOOGLE_CLOUD_PROJECT not set - AI features disabled")
        except ImportError:
            logger.warning("google-genai not installed - AI features disabled")
    return _image_client


# ---------------------------------------------------------------------------
# Rate limit & auth checks
# ---------------------------------------------------------------------------


def _check_auth(user: AbstractBaseUser | None, *, bypass_limits: bool) -> None:
    """Raise 403 if user is not authenticated (unless bypassed)."""
    if bypass_limits:
        return
    if user is None or not user.is_authenticated:
        raise GeminiAuthError()


def _check_global_limit(*, bypass_limits: bool) -> None:
    """Enforce global rate limit (text/image calls). Fail-open if cache is unavailable."""
    if bypass_limits:
        return
    try:
        count = cache.get(CACHE_KEY, 0)
        if count >= GLOBAL_LIMIT:
            raise GeminiRateLimitError()
        cache.set(CACHE_KEY, count + 1, timeout=WINDOW_SECONDS)
    except GeminiRateLimitError:
        raise
    except Exception:
        logger.warning("Gemini rate limit cache unavailable, proceeding without limit")


def _check_embedding_limit(*, bypass_limits: bool) -> None:
    """Enforce embedding-specific rate limit (separate from text/image)."""
    if bypass_limits:
        return
    try:
        count = cache.get(EMBEDDING_CACHE_KEY, 0)
        if count >= EMBEDDING_LIMIT:
            raise GeminiRateLimitError()
        cache.set(EMBEDDING_CACHE_KEY, count + 1, timeout=EMBEDDING_WINDOW_SECONDS)
    except GeminiRateLimitError:
        raise
    except Exception:
        logger.warning("Gemini embedding rate limit cache unavailable, proceeding without limit")


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


def _handle_gemini_exception(exc: Exception, context: str = "") -> None:
    """Map Gemini SDK exceptions to HTTP errors. Always raises."""
    from google.api_core.exceptions import DeadlineExceeded, GoogleAPIError, ServiceUnavailable
    from google.genai.errors import APIError, ClientError, ServerError

    if isinstance(exc, ClientError) and exc.code == 429:
        logger.warning("Gemini %s upstream rate limit: %s", context, exc)
        raise GeminiUpstreamRateLimitError() from exc
    if isinstance(exc, ServerError):
        if exc.code in (504, 408):
            logger.warning("Gemini %s timeout (code %d): %s", context, exc.code, exc)
            raise GeminiUnavailableError("KI-Verarbeitung hat zu lange gedauert.") from exc
        logger.warning("Gemini %s server error (code %d): %s", context, exc.code, exc)
        raise GeminiUnavailableError() from exc
    if isinstance(exc, APIError):
        logger.warning("Gemini %s API error (code %d): %s", context, getattr(exc, "code", 0), exc)
        raise GeminiUnavailableError() from exc
    if isinstance(exc, DeadlineExceeded):
        logger.warning("Gemini %s timeout: %s", context, exc)
        raise GeminiUnavailableError("KI-Verarbeitung hat zu lange gedauert.") from exc
    if isinstance(exc, ServiceUnavailable):
        logger.warning("Gemini %s unavailable: %s", context, exc)
        raise GeminiUnavailableError() from exc
    if isinstance(exc, GoogleAPIError):
        logger.warning("Gemini %s Google API error: %s", context, exc)
        raise GeminiUnavailableError() from exc
    logger.exception("Gemini %s unexpected error", context)
    raise


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def gemini_call(
    *,
    user: AbstractBaseUser | None = None,
    model: str,
    contents: str | list,
    config=None,
    bypass_limits: bool = False,
    context: str = "",
):
    """
    Execute a Gemini text generation call with auth + global rate limiting.

    Args:
        user: The authenticated user. Required unless bypass_limits=True.
        model: Gemini model name (e.g. "gemini-3.1-flash-lite-preview").
        contents: Prompt string or list of content parts.
        config: Optional GenerateContentConfig.
        bypass_limits: Skip auth and rate limit checks (for management commands).
        context: Label for logging (e.g. "improve_text", "suggest_tags").

    Returns:
        GenerateContentResponse from the Gemini API.

    Raises:
        GeminiAuthError: If user is not authenticated.
        GeminiRateLimitError: If global limit exceeded.
        GeminiUpstreamRateLimitError: If Google returns 429.
        GeminiUnavailableError: If Gemini is unreachable.
    """
    _check_auth(user, bypass_limits=bypass_limits)
    _check_global_limit(bypass_limits=bypass_limits)

    client = _get_client()
    if not client:
        return None

    try:
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        _handle_gemini_exception(exc, context)


def gemini_image_call(
    *,
    user: AbstractBaseUser | None = None,
    model: str,
    contents: str | list,
    config=None,
    bypass_limits: bool = False,
    context: str = "image_generation",
):
    """
    Execute a Gemini image generation call with auth + global rate limiting.

    Same interface as gemini_call() but uses the image client (global location).
    """
    _check_auth(user, bypass_limits=bypass_limits)
    _check_global_limit(bypass_limits=bypass_limits)

    client = _get_image_client()
    if not client:
        return None

    try:
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        _handle_gemini_exception(exc, context)


def gemini_embed(
    *,
    user: AbstractBaseUser | None = None,
    model: str = "text-embedding-004",
    contents: str,
    bypass_limits: bool = False,
):
    """
    Create a text embedding. Separate rate limit from text/image.

    Returns list of floats or None if unavailable.
    """
    _check_embedding_limit(bypass_limits=bypass_limits)

    client = _get_client()
    if not client:
        return None

    try:
        response = client.models.embed_content(
            model=model,
            contents=contents,
        )
        if response.embeddings:
            return response.embeddings[0].values
    except Exception:
        logger.warning("Embedding creation failed", exc_info=True)
    return None
