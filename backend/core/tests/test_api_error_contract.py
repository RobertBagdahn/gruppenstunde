"""Food API error responses must be safe and traceable."""

import logging

import pytest
from django.http import HttpRequest, HttpResponse
from django.test import RequestFactory
from ninja import NinjaAPI
from ninja.errors import HttpError
from ninja.testing import TestClient

from core.errors import register_error_handlers
from core.middleware import AiRequestContextMiddleware


def build_error_test_client() -> TestClient:
    api = NinjaAPI()
    register_error_handlers(api)

    @api.get("/unhandled")
    def unhandled(request: HttpRequest) -> None:
        raise RuntimeError("private database diagnostic")

    @api.get("/handled")
    def handled(request: HttpRequest) -> None:
        raise HttpError(500, "private database diagnostic")

    @api.get("/database-full")
    def database_full(request: HttpRequest) -> None:
        raise RuntimeError("remaining connection slots are reserved")

    @api.get("/client-error")
    def client_error(request: HttpRequest) -> None:
        raise HttpError(422, "Menge muss größer als 0 sein.")

    @api.get("/service-unavailable")
    def service_unavailable(request: HttpRequest) -> None:
        raise HttpError(503, "KI-Vorschläge konnten nicht generiert werden")

    @api.get("/unsafe-service-unavailable")
    def unsafe_service_unavailable(request: HttpRequest) -> None:
        raise HttpError(503, "SQL connection string must stay private")

    return TestClient(api)


def test_unhandled_error_returns_safe_message_and_correlates_server_log(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.ERROR, logger="core.errors")
    response = build_error_test_client().get("/unhandled")
    payload = response.json()

    assert response.status_code == 500
    assert payload["code"] == "internal_error"
    assert payload["detail"] == "Interner Serverfehler. Bitte versuche es später erneut."
    assert payload["request_id"]
    assert "private database diagnostic" not in response.content.decode()
    assert payload["request_id"] in caplog.text
    assert "private database diagnostic" in caplog.text


def test_validation_error_preserves_client_status_and_message() -> None:
    response = build_error_test_client().get("/client-error")
    payload = response.json()

    assert response.status_code == 422
    assert payload["code"] == "invalid_input"
    assert payload["detail"] == "Menge muss größer als 0 sein."


def test_service_unavailable_preserves_safe_retry_message() -> None:
    response = build_error_test_client().get("/service-unavailable")
    payload = response.json()

    assert response.status_code == 503
    assert payload["code"] == "service_unavailable"
    assert payload["detail"] == "KI-Vorschläge konnten nicht generiert werden"
    assert payload["request_id"]


def test_unapproved_service_unavailable_detail_stays_private() -> None:
    response = build_error_test_client().get("/unsafe-service-unavailable")
    payload = response.json()

    assert response.status_code == 503
    assert payload["detail"] == "Interner Serverfehler. Bitte versuche es später erneut."
    assert "SQL connection string" not in response.content.decode()


def test_database_connection_exhaustion_has_a_stable_error_code() -> None:
    response = build_error_test_client().get("/database-full")
    payload = response.json()

    assert response.status_code == 500
    assert payload["code"] == "database_connection_exhausted"
    assert payload["request_id"]
    assert "remaining connection slots" not in response.content.decode()


def test_request_id_middleware_returns_a_response_header() -> None:
    request = RequestFactory().get("/api/health/")
    middleware = AiRequestContextMiddleware(lambda _request: HttpResponse("ok"))

    response = middleware(request)

    assert response["X-Request-ID"]
    assert len(response["X-Request-ID"]) == 32


def test_handled_server_error_does_not_expose_internal_detail() -> None:
    response = build_error_test_client().get("/handled")
    payload = response.json()

    assert response.status_code == 500
    assert payload["detail"] == "Interner Serverfehler. Bitte versuche es später erneut."
    assert payload["request_id"]
    assert "private database diagnostic" not in response.content.decode()
