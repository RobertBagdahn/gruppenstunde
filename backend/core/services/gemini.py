"""
Centralized Gemini API client with global rate limiting and auth enforcement.

All Gemini calls across the application MUST go through gemini_call() or
gemini_image_call(). Direct genai.Client usage is not permitted elsewhere.
"""

import logging
import time
import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.core.cache import cache
from ninja.errors import HttpError

from content.models import AiInteraction

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
        super().__init__(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


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


def _atomic_incr_and_check(key: str, limit: int, timeout: int) -> None:
    """Atomically increment a counter and raise GeminiRateLimitError if over the limit.

    Uses cache.add() to initialise the key (if absent) then cache.incr() which is
    atomic in Redis/Memcache. This avoids the read-modify-write race in the previous
    cache.get() + cache.set() pattern where concurrent requests could both read 0
    and both proceed even when the limit was reached.
    """
    cache.add(key, 0, timeout=timeout)
    count = cache.incr(key)
    if count > limit:
        raise GeminiRateLimitError()


def _check_global_limit(*, bypass_limits: bool) -> None:
    """Enforce global rate limit (text/image calls). Fail-open if cache is unavailable."""
    if bypass_limits:
        return
    try:
        _atomic_incr_and_check(CACHE_KEY, GLOBAL_LIMIT, WINDOW_SECONDS)
    except GeminiRateLimitError:
        raise
    except Exception:
        logger.warning("Gemini rate limit cache unavailable, proceeding without limit")


def _check_embedding_limit(*, bypass_limits: bool) -> None:
    """Enforce embedding-specific rate limit (separate from text/image)."""
    if bypass_limits:
        return
    try:
        _atomic_incr_and_check(EMBEDDING_CACHE_KEY, EMBEDDING_LIMIT, EMBEDDING_WINDOW_SECONDS)
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
# Helpers — interaction logging
# ---------------------------------------------------------------------------


def _truncate_prompt(contents: str | list) -> str | list:
    """Strip base64 image data from prompts before DB storage.

    Image generation calls may contain large binary payloads that would
    blow up the AiInteraction.prompt JSONField. This replaces them with
    a placeholder while preserving text parts for the log viewer.
    """
    if isinstance(contents, str):
        return contents
    if isinstance(contents, list):
        result = []
        for part in contents:
            if isinstance(part, dict):
                if "inline_data" in part:
                    inline = part["inline_data"]
                    size_bytes = len(inline.get("data", ""))
                    result.append({**part, "inline_data": {**inline, "data": f"[Bilddaten: {size_bytes} Bytes]"}})
                else:
                    result.append(part)
            else:
                result.append(part)
        return result
    return contents


def _create_interaction(
    *,
    user: AbstractBaseUser | None = None,
    model: str,
    contents: str | list,
    context: str = "",
    is_background: bool = False,
) -> tuple[AiInteraction, uuid.UUID]:
    """Create an AiInteraction record and return (record, id)."""
    kwargs: dict = {"is_background": is_background}
    if user and user.is_authenticated:
        kwargs["user"] = user
    interaction = AiInteraction.objects.create(
        context=context,
        prompt=_truncate_prompt(contents),
        model=model,
        success=False,
        **kwargs,
    )
    return interaction, interaction.id


def _extract_usage_metadata(source) -> dict:
    """Extract token counts from a GenerateContentResponse or exception.

    Returns a dict with keys matching AiInteraction token fields,
    or empty dict if usage_metadata is unavailable.
    """
    try:
        um = source.usage_metadata if hasattr(source, "usage_metadata") else None
        if um is None:
            return {}
        return {
            "prompt_tokens": um.prompt_token_count,
            "completion_tokens": um.candidates_token_count,
            "total_tokens": um.total_token_count,
            "thoughts_tokens": getattr(um, "thoughts_token_count", None),
        }
    except Exception:
        return {}


def _calculate_cost_eur(model: str, usage_metadata) -> str | None:
    """Calculate cost in EUR from token usage and Gemini pricing table.

    Returns a Decimal string (for .update()) or None if pricing unknown.
    """
    from decimal import Decimal, ROUND_HALF_UP

    pricing = getattr(settings, "GEMINI_PRICING", {}).get(model)
    if not pricing or usage_metadata is None:
        return None

    input_tokens = usage_metadata.prompt_token_count or 0
    output_tokens = (usage_metadata.candidates_token_count or 0) + (getattr(usage_metadata, "thoughts_token_count", 0) or 0)

    input_cost = input_tokens / 1_000_000 * pricing["input_per_1m_usd"]
    output_cost = output_tokens / 1_000_000 * pricing.get("output_per_1m_usd", 0)

    usd_to_eur = Decimal(str(getattr(settings, "USD_TO_EUR", 0.92)))
    cost_usd = Decimal(str(input_cost + output_cost))
    cost_eur = (cost_usd * usd_to_eur).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    return str(cost_eur)


def _update_interaction(
    interaction: AiInteraction,
    *,
    success: bool = True,
    response_text: str = "",
    error_code: str = "",
    duration_ms: int | None = None,
    tokens: dict | None = None,
    cost_eur: str | None = None,
    pricing_model: str = "",
) -> None:
    """Update an existing AiInteraction record after completion."""
    update_kwargs: dict = {"success": success, "response": response_text}
    if error_code:
        update_kwargs["error_code"] = error_code
    if duration_ms is not None:
        update_kwargs["duration_ms"] = duration_ms
    if tokens:
        for field in ("prompt_tokens", "completion_tokens", "total_tokens", "thoughts_tokens"):
            if field in tokens:
                update_kwargs[field] = tokens[field]
    if cost_eur is not None:
        update_kwargs["cost_eur"] = cost_eur
    if pricing_model:
        update_kwargs["pricing_model"] = pricing_model
    AiInteraction.objects.filter(id=interaction.id).update(**update_kwargs)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def _execute_gemini_call(
    *,
    client,
    model: str,
    contents: str | list,
    config=None,
    interaction: AiInteraction,
    interaction_id: uuid.UUID,
    context: str = "",
) -> tuple:
    """Shared logic for gemini_call / gemini_image_call."""
    start = time.monotonic()
    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        duration = int((time.monotonic() - start) * 1000)
        response_text = (response.text or "") if response else ""
        tokens = _extract_usage_metadata(response)
        cost = _calculate_cost_eur(model, response.usage_metadata if hasattr(response, "usage_metadata") else None)
        _update_interaction(
            interaction,
            success=True,
            response_text=response_text,
            duration_ms=duration,
            tokens=tokens,
            cost_eur=cost,
            pricing_model=model,
        )
        return response, interaction_id
    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error_code = _map_exception_to_error_code(exc)
        tokens = _extract_usage_metadata(exc)
        cost = _calculate_cost_eur(model, getattr(exc, "usage_metadata", None))
        _update_interaction(
            interaction,
            success=False,
            error_code=error_code,
            duration_ms=duration,
            tokens=tokens,
            cost_eur=cost,
            pricing_model=model,
        )
        _handle_gemini_exception(exc, context)


def gemini_call(
    *,
    user: AbstractBaseUser | None = None,
    model: str,
    contents: str | list,
    config=None,
    bypass_limits: bool = False,
    is_background: bool = False,
    context: str = "",
):
    """
    Execute a Gemini text generation call with auth + global rate limiting.

    Args:
        user: The authenticated user. Required unless bypass_limits=True.
        model: Gemini model name (e.g. "gemini-3.1-flash-lite").
        contents: Prompt string or list of content parts.
        config: Optional GenerateContentConfig.
        bypass_limits: Skip auth and rate limit checks (for management commands).
        is_background: Mark as system/background call (excluded from user costs).
        context: Label for logging (e.g. "improve_text", "suggest_tags").

    Returns:
        Tuple of (GenerateContentResponse | None, UUID) where UUID is the
        AiInteraction record id for feedback.

    Raises:
        GeminiAuthError: If user is not authenticated.
        GeminiRateLimitError: If global limit exceeded.
        GeminiUpstreamRateLimitError: If Google returns 429.
        GeminiUnavailableError: If Gemini is unreachable.
    """
    _check_auth(user, bypass_limits=bypass_limits)
    _check_global_limit(bypass_limits=bypass_limits)

    interaction, interaction_id = _create_interaction(
        user=user, model=model, contents=contents, context=context, is_background=is_background
    )

    client = _get_client()
    if not client:
        _update_interaction(interaction, success=False, error_code="client_unavailable")
        return None, interaction_id

    return _execute_gemini_call(
        client=client,
        model=model,
        contents=contents,
        config=config,
        interaction=interaction,
        interaction_id=interaction_id,
        context=context,
    )


def _map_exception_to_error_code(exc: Exception) -> str:
    """Map a Gemini exception to an error code string."""
    from google.api_core.exceptions import DeadlineExceeded, ServiceUnavailable
    from google.genai.errors import APIError, ClientError, ServerError

    if isinstance(exc, ClientError) and exc.code == 429:
        return "upstream_rate_limit"
    if isinstance(exc, ServerError):
        if exc.code in (504, 408):
            return "timeout"
        return "server_error"
    if isinstance(exc, APIError):
        return "api_error"
    if isinstance(exc, DeadlineExceeded):
        return "timeout"
    if isinstance(exc, ServiceUnavailable):
        return "unavailable"
    return "internal_error"


def gemini_image_call(
    *,
    user: AbstractBaseUser | None = None,
    model: str,
    contents: str | list,
    config=None,
    bypass_limits: bool = False,
    is_background: bool = False,
    context: str = "image_generation",
):
    """
    Execute a Gemini image generation call with auth + global rate limiting.

    Same interface as gemini_call() but uses the image client (global location).

    Returns:
        Tuple of (GenerateContentResponse | None, UUID).
    """
    _check_auth(user, bypass_limits=bypass_limits)
    _check_global_limit(bypass_limits=bypass_limits)

    interaction, interaction_id = _create_interaction(
        user=user, model=model, contents=contents, context=context, is_background=is_background
    )

    client = _get_image_client()
    if not client:
        _update_interaction(interaction, success=False, error_code="client_unavailable")
        return None, interaction_id

    return _execute_gemini_call(
        client=client,
        model=model,
        contents=contents,
        config=config,
        interaction=interaction,
        interaction_id=interaction_id,
        context=context,
    )


def gemini_embed(
    *,
    user: AbstractBaseUser | None = None,
    model: str = "gemini-embedding-001",
    contents: str,
    output_dimensionality: int | None = None,
    bypass_limits: bool = False,
):
    """
    Create a text embedding via Vertex AI.

    Embedding calls are logged internally as is_background=True records.
    The function signature and return type (list[float] | None) remain
    unchanged to avoid breaking existing callers.

    Args:
        user: Optional user for analytics
        model: Model name (default: "gemini-embedding-001" for Vertex AI)
        contents: Text to embed
        output_dimensionality: Optional output dimension (supported: 768, 384, 256, 128, 64)
        bypass_limits: Whether to bypass rate limiting (for tests/scripts)

    Returns list of floats or None if unavailable.
    """
    _check_embedding_limit(bypass_limits=bypass_limits)

    interaction, _interaction_id = _create_interaction(
        user=user, model=model, contents=contents, is_background=True
    )

    client = _get_client()
    if not client:
        _update_interaction(interaction, success=False, error_code="client_unavailable")
        return None

    start = time.monotonic()
    try:
        from google import genai

        embed_config = None
        if output_dimensionality is not None:
            embed_config = genai.types.EmbedContentConfig(
                output_dimensionality=output_dimensionality
            )

        if embed_config:
            response = client.models.embed_content(
                model=model,
                contents=contents,
                config=embed_config,
            )
        else:
            response = client.models.embed_content(
                model=model,
                contents=contents,
            )

        if response.embeddings:
            duration = int((time.monotonic() - start) * 1000)
            tokens = _extract_usage_metadata(response)
            cost = _calculate_cost_eur(model, response.usage_metadata if hasattr(response, "usage_metadata") else None)
            _update_interaction(
                interaction,
                success=True,
                response_text=f"[embedding: {len(response.embeddings[0].values)} dims]",
                duration_ms=duration,
                tokens=tokens,
                cost_eur=cost,
                pricing_model=model,
            )
            return response.embeddings[0].values
        else:
            duration = int((time.monotonic() - start) * 1000)
            _update_interaction(interaction, success=False, error_code="empty_embedding", duration_ms=duration)
    except Exception:
        duration = int((time.monotonic() - start) * 1000)
        _update_interaction(interaction, success=False, error_code="embedding_error", duration_ms=duration)
        logger.warning("Embedding creation failed", exc_info=True)
    return None
