"""Specs `analysis-views`: forecast quality, sets and bundles, data and runs."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from ruebert.settings import Settings

from .conftest import make_client
from .v1_fixture import V1Builder
from .world import build_world


@pytest.fixture
def api(settings: Settings, v1: V1Builder) -> TestClient:
    build_world(settings, v1)
    return make_client(settings)


def test_quality_per_model_marks_unevaluated_models(api: TestClient) -> None:
    body = api.get("/api/forecast-quality").json()
    names = {m["model"] for m in body["models"]}
    assert "MSTL" in names
    for m in body["models"]:
        assert m["articles_evaluated"] + m["articles_not_evaluated"] >= 0
        if m["articles_evaluated"] == 0:
            assert m["wape_mean"] is None  # excluded from averages, never zero


def test_worst_articles_link_to_detail_pages(api: TestClient) -> None:
    worst = api.get("/api/forecast-quality").json()["worst"]
    wapes = [w["wape"] for w in worst]
    assert wapes == sorted(wapes, reverse=True)
    for w in worst:
        assert api.get(f"/api/products/{w['sku']}").status_code == 200


def test_sets_list_and_detail_with_component_shares(api: TestClient) -> None:
    listed = api.get("/api/sets").json()
    assert [s["set_sku"] for s in listed["items"]] == ["SET001"]
    assert listed["items"][0]["components"] == 1
    detail = api.get("/api/sets/SET001").json()
    assert detail["components_detail"][0]["sku"] == "DGW001"
    assert 0.0 <= detail["components_detail"][0]["share_from_set"] <= 1.0
    assert detail["units_bound_52_weeks"] > 0
    assert api.get("/api/sets/DGW001").status_code == 404


def test_runs_show_source_rebuild_and_forecast_run(api: TestClient) -> None:
    body = api.get("/api/runs").json()
    assert body["reference_date"] == "2026-05-18"
    assert body["checksum"]
    assert body["runs"][0]["run_id"] == 25
    assert body["runs"][0]["is_current"] is True
    assert body["comparison"] is not None
    assert body["orphans"] == []


def test_orphaned_journal_entry_is_listed(api: TestClient, settings: Settings) -> None:
    from ruebert.journal import write_entry

    write_entry(settings.journal_dir, type="case", subject="case:gibt_es_nicht", choice="verwenden", author="R")
    orphans = api.get("/api/runs").json()["orphans"]
    assert [o["subject"] for o in orphans] == ["case:gibt_es_nicht"]
    assert "nicht mehr" in orphans[0]["reason"]


def test_time_machine_notice_when_reference_differs_from_today(api: TestClient) -> None:
    body = api.get("/api/runs").json()
    assert body["time_machine"] is True
