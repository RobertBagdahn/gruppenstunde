"""Uniform error responses: always `{"detail": "<German message>"}`, plus field errors for 422."""

from __future__ import annotations

import logging
from collections.abc import Mapping, Sequence
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from ruebert.journal import JournalError

logger = logging.getLogger(__name__)

# Starlette's default English reasons, mapped to German. Messages raised by our own code are German already.
_DEFAULT_REASONS: dict[int, str] = {
    400: "Ungültige Anfrage.",
    401: "Anmeldung erforderlich.",
    403: "Keine Berechtigung.",
    404: "Nicht gefunden.",
    405: "Methode nicht erlaubt.",
    409: "Konflikt mit dem aktuellen Stand.",
    413: "Anfrage zu groß.",
    415: "Format nicht unterstützt.",
    429: "Zu viele Anfragen. Bitte kurz warten.",
    503: "Dienst vorübergehend nicht verfügbar.",
}


class FieldValidationError(Exception):
    """A business rule rejected one field; answered as 422 in the same shape as request validation."""

    def __init__(self, field: str, message: str) -> None:
        super().__init__(message)
        self.field = field
        self.message = message


INTERNAL_ERROR = "Interner Fehler. Details stehen im Server-Log."


def _german_detail(status_code: int, detail: object) -> str:
    if isinstance(detail, str) and detail and not _is_english_default(status_code, detail):
        return detail
    return _DEFAULT_REASONS.get(status_code, f"Anfrage fehlgeschlagen (HTTP {status_code}).")


def _is_english_default(status_code: int, detail: str) -> bool:
    try:
        return detail == HTTPStatus(status_code).phrase
    except ValueError:
        return False


def _field_message(error: Mapping[str, Any]) -> str:
    kind = str(error.get("type", ""))
    ctx: Mapping[str, Any] = error.get("ctx") or {}
    match kind:
        case "missing":
            return "Pflichtfeld fehlt."
        case "greater_than_equal":
            return f"Muss mindestens {ctx.get('ge')} sein."
        case "greater_than":
            return f"Muss größer als {ctx.get('gt')} sein."
        case "less_than_equal":
            return f"Darf höchstens {ctx.get('le')} sein."
        case "less_than":
            return f"Muss kleiner als {ctx.get('lt')} sein."
        case "int_parsing" | "int_type" | "int_from_float":
            return "Muss eine ganze Zahl sein."
        case "float_parsing" | "float_type":
            return "Muss eine Zahl sein."
        case "date_parsing" | "date_from_datetime_parsing" | "date_type":
            return "Muss ein Datum im Format JJJJ-MM-TT sein."
        case "bool_parsing" | "bool_type":
            return "Muss ja oder nein sein."
        case "string_too_short":
            return f"Muss mindestens {ctx.get('min_length')} Zeichen lang sein."
        case "string_too_long":
            return f"Darf höchstens {ctx.get('max_length')} Zeichen lang sein."
        case "enum" | "literal_error":
            return f"Erlaubt sind: {ctx.get('expected')}."
        case _:
            return "Ungültiger Wert."


def _field_name(location: Sequence[object]) -> str:
    # Drop the source ("query", "body", "path") so the frontend can map errors to its form fields.
    parts = [str(part) for part in location[1:]] if len(location) > 1 else [str(part) for part in location]
    return ".".join(parts)


async def _http_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": _german_detail(exc.status_code, exc.detail)},
        headers=getattr(exc, "headers", None),
    )


async def _validation_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    errors = [{"field": _field_name(error["loc"]), "message": _field_message(error)} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Eingabe ungültig.", "errors": errors})


async def _field_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, FieldValidationError)
    return JSONResponse(
        status_code=422,
        content={"detail": "Eingabe ungültig.", "errors": [{"field": exc.field, "message": exc.message}]},
    )


async def _journal_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Journal error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": INTERNAL_ERROR})


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(FieldValidationError, _field_error_handler)
    app.add_exception_handler(JournalError, _journal_error_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)
