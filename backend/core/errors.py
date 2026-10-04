"""Unified API error contract: every error response carries `detail` and `code`."""

from __future__ import annotations

from typing import TYPE_CHECKING

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
_DEFAULT_CODES: dict[int, str] = {
    400: "bad_request",
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
) -> dict[str, object]:
    payload: dict[str, object] = {"detail": detail, "code": code}
    if retry_after_seconds is not None:
        payload["retry_after_seconds"] = retry_after_seconds
    if extra:
        payload.update({key: value for key, value in extra.items() if key not in payload})
    return payload


def register_error_handlers(api: NinjaAPI) -> None:
    """Attach the unified error handlers to a NinjaAPI instance."""

    # Handlers take `object` because ninja types the argument as `exc | type[exc]`.
    def handle_http_error(request: HttpRequest, exc: object) -> HttpResponse:
        if not isinstance(exc, HttpError):
            raise TypeError("handle_http_error received a non-HttpError")
        if isinstance(exc, ApiError):
            payload = error_payload(exc.detail, exc.code, exc.retry_after_seconds, exc.extra)
        else:
            code = getattr(exc, "code", None) or default_code_for_status(exc.status_code)
            payload = error_payload(str(exc), code)
        response = api.create_response(request, payload, status=exc.status_code)
        retry_after = payload.get("retry_after_seconds")
        if retry_after is not None:
            response["Retry-After"] = str(retry_after)
        return response

    def handle_404(request: HttpRequest, exc: object) -> HttpResponse:
        return api.create_response(request, error_payload("Nicht gefunden.", "not_found"), status=404)

    api.add_exception_handler(HttpError, handle_http_error)
    api.add_exception_handler(Http404, handle_404)
