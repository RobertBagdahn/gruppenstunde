"""Specs `data-cases`, `order-traffic-light` (monitor), `app-settings` (events) and `supplier-order-preview`."""

from __future__ import annotations

import duckdb
import pytest
from fastapi.testclient import TestClient
from ruebert.settings import Settings

from ruebert.journal import read_entries

from .conftest import make_client
from .v1_fixture import V1Builder
from .world import build_world


@pytest.fixture
def api(settings: Settings, v1: V1Builder) -> TestClient:
    build_world(settings, v1)
    return make_client(settings)


def add_stockout_phase(settings: Settings, phase_id: str = "DGW001:2026-02-02") -> None:
    with duckdb.connect(str(settings.derived_db_path)) as con:
        con.execute(
            "INSERT INTO stockout_phases VALUES (?, 'DGW001', DATE '2026-02-02', DATE '2026-02-09', 7, 3)",
            [phase_id],
        )


def add_case(settings: Settings, case_id: str = "bulk_shipping:DGW001:2026-02-02") -> None:
    with duckdb.connect(str(settings.derived_db_path)) as con:
        con.execute(
            "INSERT INTO cases VALUES (?, 'bulk_shipping', 'DGW001', DATE '2026-02-02', DATE '2026-02-02', DATE '2026-02-02', "
            "'Sammelbuchung KW 6/2026: 200 Tüten', 'Nachfrage oder technische Buchung?', 'Q-024', 200, NULL, 1, "
            "['Nachfrage', 'keine Nachfrage'])",
            [case_id],
        )


class TestCases:
    def test_open_cases_and_decision_is_journaled_not_deleted(self, api: TestClient, settings: Settings) -> None:
        add_case(settings)
        before = api.get("/api/cases", params={"status": "all"}).json()["total"]
        body = api.get("/api/cases").json()
        assert body["items"][0]["question_id"] == "Q-024"
        response = api.post("/api/cases/bulk_shipping:DGW001:2026-02-02/decision", json={"choice": "keine Nachfrage"})
        assert response.status_code == 200
        assert response.json()["decision"] == "keine Nachfrage"
        assert api.get("/api/cases").json()["total"] == body["total"] - 1
        assert api.get("/api/cases", params={"status": "all"}).json()["total"] == before  # nothing deleted
        assert [e.subject for e in read_entries(settings.journal_dir)] == ["case:bulk_shipping:DGW001:2026-02-02"]

    def test_detail_names_options_and_question(self, api: TestClient, settings: Settings) -> None:
        add_case(settings)
        body = api.get("/api/cases/bulk_shipping:DGW001:2026-02-02").json()
        assert body["options"] == ["Nachfrage", "keine Nachfrage"]
        assert body["actual_qty"] == 200

    def test_choice_outside_the_options_is_422_and_unknown_case_404(self, api: TestClient, settings: Settings) -> None:
        add_case(settings)
        assert (
            api.post("/api/cases/bulk_shipping:DGW001:2026-02-02/decision", json={"choice": "vielleicht"}).status_code
            == 422
        )
        assert api.post("/api/cases/nope/decision", json={"choice": "Nachfrage"}).status_code == 404


class TestStockouts:
    def test_phase_is_a_hypothesis_until_confirmed(self, api: TestClient, settings: Settings) -> None:
        add_stockout_phase(settings)
        assert [p["status"] for p in api.get("/api/stockouts").json()["items"]] == ["offen"]
        response = api.post("/api/stockouts/DGW001:2026-02-02/decision", json={"choice": "bestätigen"})
        assert response.json()["status"] == "bestätigt"
        assert api.get("/api/stockouts").json()["total"] == 0
        assert api.get("/api/stockouts", params={"status": "bestätigt"}).json()["total"] == 1

    def test_rejected_phase_is_shown_as_rejected(self, api: TestClient, settings: Settings) -> None:
        add_stockout_phase(settings)
        api.post("/api/stockouts/DGW001:2026-02-02/decision", json={"choice": "ablehnen", "reason": "Lieferstopp"})
        assert api.get("/api/stockouts", params={"status": "abgelehnt"}).json()["items"][0]["question_id"] == "Q-101"


class TestEvents:
    def test_sample_events_are_marked_and_calendar_markers_are_not(self, api: TestClient) -> None:
        events = api.get("/api/events", params={"start": "2026-01-01", "end": "2026-12-31"}).json()
        sample = [e for e in events if e["source"] == "beispiel"]
        assert sample and all(e["is_sample"] for e in sample)
        assert {e["title"] for e in events if e["source"] == "kalender"} >= {"Jahreswechsel", "Ostern", "20.03."}

    def test_added_event_is_journaled_and_listed(self, api: TestClient, settings: Settings) -> None:
        response = api.post(
            "/api/events", json={"date": "2026-06-10", "kind": "Aktion", "title": "Sommerangebot", "sku": "DGW002"}
        )
        assert response.status_code == 201
        listed = api.get("/api/events", params={"start": "2026-06-01", "end": "2026-06-30"}).json()
        assert [e["title"] for e in listed if e["source"] == "journal"] == ["Sommerangebot"]
        assert read_entries(settings.journal_dir)[0].type == "event"

    def test_event_fields_are_validated(self, api: TestClient) -> None:
        assert api.post("/api/events", json={"date": "kein Datum", "kind": "x", "title": "y"}).status_code == 422
        assert api.post("/api/events", json={"date": "2026-06-10", "kind": "", "title": "y"}).status_code == 422


class TestSupplierOrders:
    def test_banner_and_supplier_overview_with_minimum_status(self, api: TestClient) -> None:
        suppliers = api.get("/api/supplier-orders").json()
        assert suppliers
        assert all(s["is_sample"] for s in suppliers)
        for s in suppliers:
            assert s["status"] == ("bereit" if s["value_eur"] >= 100 else "wartet – bündeln")
        detail = api.get(f"/api/supplier-orders/{suppliers[0]['supplier_id']}").json()
        assert "Beispieldaten" in detail["banner"]

    def test_top_up_suggestion_closes_gap_when_below_minimum(self, api: TestClient) -> None:
        below = [s for s in api.get("/api/supplier-orders").json() if s["value_eur"] < 100]
        if not below:
            pytest.skip("no supplier below the minimum in this sample")
        detail = api.get(f"/api/supplier-orders/{below[0]['supplier_id']}").json()
        assert detail["gap_eur"] > 0
        assert detail["top_up"], "a gap needs at least one suggestion"
        assert sum(t["adds_eur"] for t in detail["top_up"]) >= detail["gap_eur"]

    def test_postpone_is_journaled_as_sample(self, api: TestClient, settings: Settings) -> None:
        supplier = api.get("/api/supplier-orders").json()[0]["supplier_id"]
        response = api.post(f"/api/supplier-orders/{supplier}/decision", json={"choice": "zurückstellen"})
        assert response.json()["decision"] == "zurückstellen"
        entry = read_entries(settings.journal_dir)[0]
        assert entry.subject == f"supplier:{supplier}"
        assert entry.is_sample is True

    def test_unknown_supplier_is_404(self, api: TestClient) -> None:
        assert api.get("/api/supplier-orders/NOPE").status_code == 404
