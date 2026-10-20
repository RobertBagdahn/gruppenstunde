"""Spec `own-brand-order-planning` at the API: recompute, quantities, tranche, warnings, approval."""

from __future__ import annotations

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


def rows(body: dict[str, object]) -> dict[str, dict[str, object]]:
    return {r["sku"]: r for r in body["rows"]}  # type: ignore[index, union-attr]


def test_plan_contains_regular_articles_only_and_sums_to_a_tranche(api: TestClient) -> None:
    body = api.get("/api/order-plans").json()
    assert set(rows(body)) == {"DGW001", "DGW002", "DGW003", "DGW004"}  # no set, no DGW158
    assert [s["sku"] for s in body["special"]] == ["DGW158"]
    assert body["total"] == body["tranche"]
    assert body["total"] % 60_000 == 0
    assert (body["target_year"], body["target_week"]) == (2027, 39)
    assert all(r["quantity"] % 5_000 == 0 for r in body["rows"])


def test_target_week_recomputes_demand(api: TestClient) -> None:
    near = api.get("/api/order-plans", params={"target_year": 2026, "target_week": 40}).json()
    far = api.get("/api/order-plans", params={"target_year": 2027, "target_week": 52}).json()
    assert far["suggested_total"] >= near["suggested_total"]
    assert (far["target_year"], far["target_week"]) == (2027, 52)


def test_target_before_reference_date_is_rejected(api: TestClient) -> None:
    response = api.get("/api/order-plans", params={"target_year": 2026, "target_week": 21})
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "target_week"


def test_tranche_switch_and_invalid_tranche(api: TestClient) -> None:
    base = api.get("/api/order-plans").json()
    assert (
        base["tranche_options"][0] < base["tranche"] < base["tranche_options"][-1] or len(base["tranche_options"]) >= 2
    )
    bigger = api.get("/api/order-plans", params={"tranche": base["tranche"] + 60_000}).json()
    assert bigger["tranche"] == base["tranche"] + 60_000
    assert bigger["total"] == bigger["tranche"]
    assert api.get("/api/order-plans", params={"tranche": 100_000}).status_code == 422


def test_rows_explain_themselves_and_end_at_the_quantity(api: TestClient) -> None:
    body = api.get("/api/order-plans", params={"tranche": 120_000}).json()
    for row in body["rows"]:
        assert row["derivation"]["result"] == row["quantity"]
        assert [s["key"] for s in row["derivation"]["steps"]][:4] == ["demand", "min_stock", "stock", "net"]


def test_manual_change_shows_deviation_and_updates_total(api: TestClient, settings: Settings) -> None:
    before = rows(api.get("/api/order-plans").json())["DGW001"]
    new_quantity = int(before["quantity"]) + 5_000  # type: ignore[call-overload]
    response = api.put("/api/order-plans/quantities/DGW001", json={"quantity": new_quantity})
    assert response.status_code == 200
    changed = response.json()
    assert changed["quantity"] == new_quantity
    assert changed["deviation"] == 5_000
    assert changed["derivation"]["result"] == new_quantity
    assert changed["derivation"]["steps"][-1]["key"] == "manual"
    body = api.get("/api/order-plans").json()
    assert body["total"] == body["tranche"] + 5_000
    assert [e.subject for e in read_entries(settings.journal_dir)] == ["quantity:DGW001"]


def test_disallowed_quantities_are_rejected_and_nothing_is_written(api: TestClient, settings: Settings) -> None:
    for bad in (6_000, 18_000, 2_500, -5_000):
        response = api.put("/api/order-plans/quantities/DGW001", json={"quantity": bad})
        assert response.status_code == 422, bad
        assert response.json()["errors"][0]["field"] == "quantity"
    assert read_entries(settings.journal_dir) == []


def test_quantity_for_set_or_special_article_is_404(api: TestClient) -> None:
    assert api.put("/api/order-plans/quantities/SET001", json={"quantity": 5_000}).status_code == 404
    assert api.put("/api/order-plans/quantities/DGW158", json={"quantity": 5_000}).status_code == 404


def test_overstock_warning_and_lead_time_warning(api: TestClient) -> None:
    body = rows(api.get("/api/order-plans").json())
    assert any("BEM-06" in w for w in body["DGW001"]["warnings"])  # type: ignore[union-attr]
    assert body["DGW003"]["warnings"] == []  # stock far beyond demand, nothing ordered


def test_approval_writes_journal_with_all_quantities_and_shows_status(api: TestClient, settings: Settings) -> None:
    assert api.get("/api/order-plans").json()["approval"] is None
    api.put("/api/order-plans/quantities/DGW001", json={"quantity": 50_000})
    body = api.post("/api/order-plans/approve", json={}).json()
    assert body["approval"]["author"] == "Demo-Nutzer"
    assert body["approval"]["tranche"] == body["tranche"]
    entry = next(e for e in read_entries(settings.journal_dir) if e.subject.startswith("plan:"))
    assert entry.subject == "plan:2027-W39"
    assert entry.details is not None
    assert entry.details["quantities"]["DGW001"] == 50_000
    assert "DGW001" in entry.details["deviations"]
    assert entry.details["tranche"] == body["tranche"]
