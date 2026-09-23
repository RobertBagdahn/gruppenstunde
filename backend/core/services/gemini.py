"""
Centralized Gemini API client with global rate limiting and auth enforcement.

All Gemini calls across the application MUST go through gemini_call() or
gemini_image_call(). Direct genai.Client usage is not permitted elsewhere.
"""

import json
import logging
import time
import uuid
from types import SimpleNamespace
from typing import NoReturn

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.core.cache import cache
from ninja.errors import HttpError

from content.models import AiInteraction

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GLOBAL_LIMIT = 500
WINDOW_SECONDS = 900  # 15 minutes
CACHE_KEY = "gemini_global_calls"
DEFAULT_TEXT_MODEL = "gemini-3.5-flash-lite"
FLEX_SERVICE_TIER = "flex"
STRUCTURED_MAX_ATTEMPTS = 2

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


def _provider_error_detail(exc: Exception, fallback: str) -> str:
    """Return a useful provider error without exposing a traceback."""
    message = str(exc).strip()
    if not message:
        return fallback
    return f"{fallback} Details: {message[:500]}"


def _handle_gemini_exception(exc: Exception, context: str = "") -> NoReturn:
    """Map Gemini SDK exceptions to HTTP errors. Always raises."""
    from google.api_core.exceptions import DeadlineExceeded, GoogleAPIError, ServiceUnavailable
    from google.genai.errors import APIError, ClientError, ServerError

    if isinstance(exc, ClientError) and exc.code == 429:
        logger.warning("Gemini %s upstream rate limit: %s", context, exc)
        raise GeminiUpstreamRateLimitError() from exc
    if isinstance(exc, ServerError):
        if exc.code in (504, 408):
            logger.warning("Gemini %s timeout (code %d): %s", context, exc.code, exc)
            raise GeminiUnavailableError(_provider_error_detail(exc, "KI-Verarbeitung hat zu lange gedauert.")) from exc
        logger.warning("Gemini %s server error (code %d): %s", context, exc.code, exc)
        raise GeminiUnavailableError(_provider_error_detail(exc, "KI nicht erreichbar.")) from exc
    if isinstance(exc, APIError):
        logger.warning("Gemini %s API error (code %d): %s", context, getattr(exc, "code", 0), exc)
        raise GeminiUnavailableError(_provider_error_detail(exc, "KI nicht erreichbar.")) from exc
    if isinstance(exc, DeadlineExceeded):
        logger.warning("Gemini %s timeout: %s", context, exc)
        raise GeminiUnavailableError(_provider_error_detail(exc, "KI-Verarbeitung hat zu lange gedauert.")) from exc
    if isinstance(exc, ServiceUnavailable):
        logger.warning("Gemini %s unavailable: %s", context, exc)
        raise GeminiUnavailableError(_provider_error_detail(exc, "KI nicht erreichbar.")) from exc
    if isinstance(exc, GoogleAPIError):
        logger.warning("Gemini %s Google API error: %s", context, exc)
        raise GeminiUnavailableError(_provider_error_detail(exc, "KI nicht erreichbar.")) from exc
    # Provider SDKs can also raise plain ValueError/RuntimeError instances
    # (for example when a model or response schema is rejected locally). Do
    # not expose those as Django 500 responses to callers of an AI feature.
    logger.exception("Gemini %s unexpected error", context)
    raise GeminiUnavailableError(_provider_error_detail(exc, "KI nicht erreichbar.")) from exc


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


def _image_output_tokens(usage_metadata) -> int:
    """Sum IMAGE-modality output tokens from candidates_tokens_details."""
    details = getattr(usage_metadata, "candidates_tokens_details", None) or []
    total = 0
    for detail in details:
        modality = getattr(detail, "modality", None)
        if getattr(modality, "value", modality) == "IMAGE":
            total += getattr(detail, "token_count", 0) or 0
    return total


def _calculate_cost_eur(model: str, usage_metadata) -> str | None:
    """Calculate cost in EUR from token usage and Gemini pricing table.

    Returns a Decimal string (for .update()) or None if pricing unknown.
    """
    from decimal import ROUND_HALF_UP, Decimal

    pricing = getattr(settings, "GEMINI_PRICING", {}).get(model)
    if usage_metadata is None:
        return None
    if not pricing:
        logger.warning("Gemini model '%s' has no entry in GEMINI_PRICING; cost will be NULL", model)
        return None

    input_tokens = usage_metadata.prompt_token_count or 0
    output_tokens = usage_metadata.candidates_token_count or 0

    try:
        image_rate = pricing.get("image_output_per_1m_usd")
        image_tokens = _image_output_tokens(usage_metadata) if image_rate is not None else 0
        text_output_tokens = max(output_tokens - image_tokens, 0)
        input_cost = input_tokens / 1_000_000 * pricing["input_per_1m_usd"]
        output_cost = text_output_tokens / 1_000_000 * pricing.get("output_per_1m_usd", 0)
        if image_tokens:
            output_cost += image_tokens / 1_000_000 * image_rate
        usd_to_eur = Decimal(str(getattr(settings, "USD_TO_EUR", 0.92)))
        cost_usd = Decimal(str(input_cost + output_cost))
        cost_eur = (cost_usd * usd_to_eur).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    except (TypeError, ValueError, ArithmeticError):
        return None
    return str(cost_eur)


def _update_interaction(
    interaction: AiInteraction | None,
    *,
    success: bool = True,
    response_text: str = "",
    error_code: str = "",
    duration_ms: int | None = None,
    tokens: dict | None = None,
    cost_eur: str | None = None,
    pricing_model: str = "",
    structured_attempts: int | None = None,
    structured_validation_error: str | None = None,
) -> None:
    """Update an existing AiInteraction record after completion."""
    if interaction is None:
        return
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
    if structured_attempts is not None:
        update_kwargs["structured_attempts"] = structured_attempts
    if structured_validation_error is not None:
        update_kwargs["structured_validation_error"] = structured_validation_error[:2000]
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


def _structured_schema(config):
    """Return the schema configured for a structured response, if any."""
    if config is None:
        return None
    return getattr(config, "response_schema", None) or getattr(config, "response_json_schema", None)


def _add_property_ordering(schema):
    """Add Gemini's supported property ordering to every object schema."""
    if isinstance(schema, list):
        return [_add_property_ordering(value) for value in schema]
    if not isinstance(schema, dict):
        return schema

    normalized = {key: _add_property_ordering(value) for key, value in schema.items()}
    properties = normalized.get("properties")
    if isinstance(properties, dict):
        normalized["propertyOrdering"] = list(properties)
    return normalized


def _apply_structured_output_rules(config):
    """Apply Gemini's documented JSON-schema rules to a Pydantic response."""
    schema = getattr(config, "response_schema", None)
    if schema is None or not hasattr(schema, "model_json_schema"):
        return config

    json_schema = _add_property_ordering(schema.model_json_schema())
    return config.model_copy(update={"response_schema": None, "response_json_schema": json_schema})


def _validate_structured_response(response, schema) -> None:
    """Reject empty or schema-invalid structured responses before returning them."""
    if schema is None:
        return
    text = (response.text or "").strip() if response is not None else ""
    if not text:
        raise ValueError("structured response was empty")
    if hasattr(schema, "model_validate_json"):
        schema.model_validate_json(text)
    else:
        json.loads(text)


def _structured_retry_contents(contents: str | list, error: Exception) -> str:
    """Ask Gemini to repair only the structured output, not to invent new context."""
    detail = str(error).strip()[:1000]
    return (
        f"{contents}\n\n"
        "KORREKTUR: Deine vorherige Antwort war leer oder entsprach nicht dem vorgegebenen JSON-Schema. "
        "Antworte jetzt ausschließlich mit einem vollständigen gültigen JSON-Objekt oder JSON-Array, "
        "ohne Markdown, Kommentare oder zusätzliche Erklärungen. "
        f"Validierungsfehler: {detail}"
    )


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
        model: Gemini model name. Text calls use the global Flash-Lite model.
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
    # Keep callers backwards-compatible while routing every text request to
    # the single globally deployed Flash-Lite model.
    model = DEFAULT_TEXT_MODEL
    _check_auth(user, bypass_limits=bypass_limits)
    _check_global_limit(bypass_limits=bypass_limits)

    interaction, interaction_id = _create_interaction(
        user=user, model=model, contents=contents, context=context, is_background=is_background
    )

    client = _get_client()
    if not client:
        _update_interaction(interaction, success=False, error_code="client_unavailable")
        return None, interaction_id

    from google.genai import types

    # Flex PayGo is selected through the Vertex request header, not through a
    # service_tier field in the GenerateContent request body.
    http_options = types.HttpOptions(
        headers={"X-Vertex-AI-LLM-Request-Type": FLEX_SERVICE_TIER},
    )
    if config is not None:
        config = config.model_copy(update={"http_options": http_options})
    else:
        config = types.GenerateContentConfig(http_options=http_options)

    structured_schema = _structured_schema(config)
    config = _apply_structured_output_rules(config)
    current_contents = contents
    last_error: Exception | None = None
    max_attempts = STRUCTURED_MAX_ATTEMPTS if structured_schema is not None else 1
    for attempt in range(max_attempts):
        response, returned_interaction_id = _execute_gemini_call(
            client=client,
            model=model,
            contents=current_contents,
            config=config,
            interaction=interaction,
            interaction_id=interaction_id,
            context=context,
        )
        if structured_schema is None:
            return response, returned_interaction_id
        try:
            _validate_structured_response(response, structured_schema)
            if structured_schema is not None:
                _update_interaction(interaction, structured_attempts=attempt + 1)
            return response, returned_interaction_id
        except Exception as exc:
            last_error = exc
            _update_interaction(
                interaction,
                success=False,
                error_code="structured_response_invalid",
                response_text=(response.text or "") if response is not None else "",
                structured_attempts=attempt + 1,
                structured_validation_error=str(exc),
            )
            if attempt + 1 < STRUCTURED_MAX_ATTEMPTS:
                current_contents = _structured_retry_contents(contents, exc)
    raise GeminiInvalidResponseError("Die KI konnte keine gültige strukturierte Antwort liefern.") from last_error


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


def _embedding_usage(response) -> SimpleNamespace | None:
    """Build usage metadata for an EmbedContentResponse.

    Vertex AI embedding responses carry no usage_metadata; the input token
    count is reported per embedding in ``statistics.token_count``.
    """
    try:
        counts = [e.statistics.token_count for e in response.embeddings if e.statistics]
    except AttributeError:
        return None
    if not counts or not all(isinstance(c, int | float) for c in counts):
        return None
    prompt_tokens = int(sum(counts))
    return SimpleNamespace(
        usage_metadata=SimpleNamespace(
            prompt_token_count=prompt_tokens,
            candidates_token_count=0,
            total_token_count=prompt_tokens,
            thoughts_token_count=None,
        )
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

    # Embeddings are also used by database-free utility code. Analytics must
    # not make an otherwise successful embedding call require database access.
    try:
        interaction, _interaction_id = _create_interaction(
            user=user, model=model, contents=contents, is_background=True
        )
    except Exception:
        interaction = None
        logger.warning("Could not create Gemini embedding interaction log", exc_info=True)

    client = _get_client()
    if not client:
        _update_interaction(interaction, success=False, error_code="client_unavailable")
        return None

    start = time.monotonic()
    try:
        from google import genai

        embed_config = None
        if output_dimensionality is not None:
            embed_config = genai.types.EmbedContentConfig(output_dimensionality=output_dimensionality)

        if embed_config:
            try:
                response = client.models.embed_content(
                    model=model,
                    contents=contents,
                    output_dimensionality=output_dimensionality,
                )
            except TypeError:
                # Older google-genai versions expose this only on the config.
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
            usage = _embedding_usage(response)
            tokens = _extract_usage_metadata(usage)
            cost = _calculate_cost_eur(model, usage.usage_metadata if usage else None)
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
