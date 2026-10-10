"""Unified API error contract: every error response carries `detail` and `code`."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Protocol, cast
from uuid import uuid4

from django.http import Http404, HttpRequest, HttpResponse
from ninja.errors import HttpError

if TYPE_CHECKING:
    from ninja import NinjaAPI


class ApiError(HttpError):
    """HttpError with a stable machine-readable code for frontend branching."""

    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        *,
        retry_after_seconds: int | None = None,
        extra: dict[str, object] | None = None,
    ) -> None:
        super().__init__(status_code, detail)
        self.code = code
        self.detail = detail
        self.retry_after_seconds = retry_after_seconds
        # Additional machine-readable keys merged into the payload (e.g. ``fields``).
        self.extra = extra or {}


# Fallback codes for plain HttpErrors so the frontend can still branch on status.
logger = logging.getLogger(__name__)


class RequestWithId(Protocol):
    request_id: str


class HttpErrorLike(Protocol):
    status_code: int

    def __str__(self) -> str: ...


def _unhandled_error_code(exc: BaseException) -> str:
    message = str(exc).lower()
    if "remaining connection slots" in message or "too many connections" in message:
        return "database_connection_exhausted"
    return "internal_error"


_SAFE_SERVICE_UNAVAILABLE_DETAILS = {
    "KI-Vorschläge konnten nicht generiert werden",
    "KI nicht verfügbar",
}


_DEFAULT_CODES: dict[int, str] = {
    400: "bad_request",
    500: "internal_error",
    401: "auth_required",
    403: "permission_denied",
    404: "not_found",
    409: "conflict",
    422: "invalid_input",
    429: "rate_limited",
    502: "upstream_invalid",
    503: "service_unavailable",
}


def default_code_for_status(status_code: int) -> str:
    return _DEFAULT_CODES.get(status_code, "error")


def error_payload(
    detail: object,
    code: str,
    retry_after_seconds: int | None = None,
    extra: dict[str, object] | None = None,
    request_id: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {"detail": detail, "code": code}
    if retry_after_seconds is not None:
        payload["retry_after_seconds"] = retry_after_seconds
    if extra:
        payload.update({key: value for key, value in extra.items() if key not in payload})
    if request_id is not None:
        payload["request_id"] = request_id
    return payload


def register_error_handlers(api: NinjaAPI) -> None:
    """Attach the unified error handlers to a NinjaAPI instance."""

    # Handlers take `object` because ninja types the argument as `exc | type[exc]`.
    def request_id_for(request: HttpRequest) -> str:
        try:
            return cast(RequestWithId, request).request_id
        except AttributeError:
            return uuid4().hex

    def handle_http_error(request: HttpRequest, exc: object) -> HttpResponse:
        if not isinstance(exc, HttpError):
            raise TypeError("handle_http_error received a non-HttpError")
        error = cast(HttpErrorLike, exc)
        request_id = request_id_for(request)
        if error.status_code >= 500:
            logger.error(
                "Handled API server error request_id=%s status=%s",
                request_id,
                error.status_code,
                exc_info=True,
            )
            code = exc.code if isinstance(exc, ApiError) else default_code_for_status(error.status_code)
            # Only allowlisted 503 copy may reach users; unexpected server details stay private.
            candidate_detail = str(error)
            detail = (
                candidate_detail
                if error.status_code == 503 and candidate_detail in _SAFE_SERVICE_UNAVAILABLE_DETAILS
                else "Interner Serverfehler. Bitte versuche es später erneut."
            )
            payload = error_payload(
                detail,
                code,
                exc.retry_after_seconds if isinstance(exc, ApiError) else None,
                exc.extra if isinstance(exc, ApiError) else None,
                request_id,
            )
        elif isinstance(exc, ApiError):
            payload = error_payload(exc.detail, exc.code, exc.retry_after_seconds, exc.extra)
        else:
            payload = error_payload(str(error), default_code_for_status(error.status_code))
        response = api.create_response(request, payload, status=error.status_code)
        retry_after = payload.get("retry_after_seconds")
        if retry_after is not None:
            response["Retry-After"] = str(retry_after)
        return response

    def handle_404(request: HttpRequest, exc: object) -> HttpResponse:
        return api.create_response(
            request,
            error_payload("Nicht gefunden.", "not_found"),
            status=404,
        )

    def handle_unhandled_error(request: HttpRequest, exc: object) -> HttpResponse:
        request_id = request_id_for(request)
        error_code = _unhandled_error_code(exc) if isinstance(exc, BaseException) else "internal_error"
        if isinstance(exc, BaseException):
            logger.error(
                "Unhandled API exception error_code=%s request_id=%s",
                error_code,
                request_id,
                exc_info=(type(exc), exc, exc.__traceback__),
            )
        else:
            logger.error("Unhandled API exception error_code=%s request_id=%s", error_code, request_id)
        payload = error_payload(
            "Interner Serverfehler. Bitte versuche es später erneut.",
            error_code,
            request_id=request_id,
        )
        return api.create_response(request, payload, status=500)

    api.add_exception_handler(HttpError, handle_http_error)
    api.add_exception_handler(Http404, handle_404)
    api.add_exception_handler(Exception, handle_unhandled_error)
