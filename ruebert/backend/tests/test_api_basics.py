"""App factory, health endpoint and uniform German error responses."""

from __future__ import annotations

from datetime import date
from typing import Annotated

import pytest
from fastapi import APIRouter, HTTPException, Query
from fastapi.testclient import TestClient
from ruebert.settings import Settings

from ruebert import __version__

from .conftest import make_client

helper = APIRouter(prefix="/test")


@helper.get("/boom")
def boom() -> dict[str, str]:
    raise RuntimeError("secret internal detail")


@helper.get("/german")
def german() -> dict[str, str]:
    raise HTTPException(status_code=409, detail="Fall wurde bereits entschieden.")


@helper.get("/forbidden")
def forbidden() -> dict[str, str]:
    raise HTTPException(status_code=403)


@helper.get("/validate")
def validate(
    week: Annotated[int, Query(ge=1, le=53)],
    day: Annotated[date | None, Query()] = None,
) -> dict[str, int]:
    return {"week": week}


@pytest.fixture
def helper_client(settings: Settings) -> TestClient:
    return make_client(settings, helper)


class TestHealth:
    def test_answers_ok_with_version_and_reference_date(self, client: TestClient) -> None:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "version": __version__, "reference_date": "2026-05-18"}

    def test_uses_the_configured_reference_date(self, settings: Settings) -> None:
        settings.reference_date = date(2026, 6, 1)
        response = make_client(settings).get("/api/health")
        assert response.json()["reference_date"] == "2026-06-01"

    def test_works_without_any_data_store(self, client: TestClient, settings: Settings) -> None:
        assert not settings.v1_duckdb_path.exists()
        assert client.get("/api/health").status_code == 200


class TestOpenApi:
    def test_schema_and_docs_live_under_api(self, client: TestClient) -> None:
        schema = client.get("/api/openapi.json")
        assert schema.status_code == 200
        assert schema.json()["info"]["title"] == "Rübert API"
        assert "/api/health" in schema.json()["paths"]
        assert client.get("/api/docs").status_code == 200


class TestErrors:
    def test_unknown_route_is_404_in_german(self, client: TestClient) -> None:
        response = client.get("/api/gibt-es-nicht")
        assert response.status_code == 404
        assert response.json() == {"detail": "Nicht gefunden."}

    def test_wrong_method_is_405_in_german(self, client: TestClient) -> None:
        response = client.post("/api/health")
        assert response.status_code == 405
        assert response.json() == {"detail": "Methode nicht erlaubt."}

    def test_own_german_message_is_kept(self, helper_client: TestClient) -> None:
        response = helper_client.get("/api/test/german")
        assert response.status_code == 409
        assert response.json() == {"detail": "Fall wurde bereits entschieden."}

    def test_default_reason_is_translated(self, helper_client: TestClient) -> None:
        response = helper_client.get("/api/test/forbidden")
        assert response.status_code == 403
        assert response.json() == {"detail": "Keine Berechtigung."}

    def test_unhandled_error_hides_internals(self, helper_client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
        response = helper_client.get("/api/test/boom")
        assert response.status_code == 500
        assert response.json() == {"detail": "Interner Fehler. Details stehen im Server-Log."}
        assert "secret internal detail" not in response.text
        assert "Unhandled error on GET /api/test/boom" in caplog.text

    def test_validation_errors_name_fields_in_german(self, helper_client: TestClient) -> None:
        response = helper_client.get("/api/test/validate", params={"week": 60, "day": "18.05.2026"})
        assert response.status_code == 422
        body = response.json()
        assert body["detail"] == "Eingabe ungültig."
        assert {"field": "week", "message": "Darf höchstens 53 sein."} in body["errors"]
        assert {"field": "day", "message": "Muss ein Datum im Format JJJJ-MM-TT sein."} in body["errors"]

    @pytest.mark.parametrize(
        ("params", "message"),
        [
            ({}, "Pflichtfeld fehlt."),
            ({"week": "zwei"}, "Muss eine ganze Zahl sein."),
            ({"week": 0}, "Muss mindestens 1 sein."),
        ],
    )
    def test_validation_messages(self, helper_client: TestClient, params: dict[str, object], message: str) -> None:
        response = helper_client.get("/api/test/validate", params=params)
        assert response.status_code == 422
        assert response.json()["errors"] == [{"field": "week", "message": message}]
