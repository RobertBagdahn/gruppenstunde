"""Specs `order-traffic-light` and `analysis-views` (top bar pipeline): colours, queue, decisions, status."""

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


def test_without_derived_store_the_api_names_the_fix(settings: Settings) -> None:
    response = make_client(settings).get("/api/traffic-light")
    assert response.status_code == 503
    assert "make rebuild" in response.json()["detail"]


def test_counts_per_colour_exclude_special_articles(api: TestClient) -> None:
    body = api.get("/api/traffic-light").json()
    assert body["counts"] == {"red": 1, "yellow": 1, "green": 1, "blue": 1}
    assert [s["sku"] for s in body["special"]] == ["DGW158"]


def test_queue_is_sorted_by_urgency_and_has_recommendation(api: TestClient) -> None:
    queue = api.get("/api/traffic-light").json()["queue"]
    assert [(q["sku"], q["colour"]) for q in queue] == [("DGW001", "red"), ("DGW002", "yellow")]
    assert queue[0]["recommendation"].startswith("Bis KW ")
    assert "Tüten" in queue[0]["recommendation"]
    assert "DGW158" not in [q["sku"] for q in queue]  # special articles are not in the regular queue


def test_explanation_lists_rules_with_current_thresholds(api: TestClient) -> None:
    api.put("/api/settings/lead_time_weeks", json={"value": 6})
    rules = {r["colour"]: r for r in api.get("/api/traffic-light").json()["explanation"]}
    assert "6 Wochen" in rules["red"]["text"]
    assert rules["red"]["question_id"] == "Q-080"


def test_threshold_change_changes_colours_after_reload(api: TestClient) -> None:
    api.put("/api/settings/planning_window_weeks", json={"value": 1})
    body = api.get("/api/traffic-light").json()
    assert body["counts"]["yellow"] == 0
    assert body["counts"]["green"] == 2


def test_accept_writes_journal_and_removes_item_from_queue(api: TestClient, settings: Settings) -> None:
    response = api.post("/api/traffic-light/DGW001/decision", json={"choice": "annehmen"})
    assert response.status_code == 200
    assert response.json()["decision"] == "annehmen"
    entries = read_entries(settings.journal_dir)
    assert [(e.type, e.subject, e.choice) for e in entries] == [("order", "order:DGW001", "annehmen")]
    queue = api.get("/api/traffic-light").json()
    assert [q["sku"] for q in queue["queue"]] == ["DGW002"]
    assert queue["decided"] == 1


def test_postpone_and_changed_mind_supersede(api: TestClient, settings: Settings) -> None:
    api.post("/api/traffic-light/DGW001/decision", json={"choice": "zurückstellen", "reason": "warten auf Daniel"})
    api.post("/api/traffic-light/DGW001/decision", json={"choice": "annehmen"})
    first, second = read_entries(settings.journal_dir)
    assert second.supersedes == first.id
    assert first.reason == "warten auf Daniel"


def test_decision_for_unknown_article_is_404_and_bad_choice_is_422(api: TestClient) -> None:
    assert api.post("/api/traffic-light/NOPE/decision", json={"choice": "annehmen"}).status_code == 404
    assert api.post("/api/traffic-light/DGW001/decision", json={"choice": "vielleicht"}).status_code == 422


def test_status_has_pipeline_stages_and_badges(api: TestClient) -> None:
    body = api.get("/api/status").json()
    assert body["reference_date"] == "2026-05-18"
    assert body["iso_week"] == 21
    stages = {s["key"]: s for s in body["stages"]}
    assert set(stages) == {"source", "import", "forecast", "traffic_light"}
    assert stages["forecast"]["label"] == "Forecast #25"
    assert stages["forecast"]["finished_at"].startswith("2026-05-21T07:44")
    assert stages["source"]["status"] == "ok"  # last booking 15.05., reference date 18.05.
    assert body["badges"]["openDecisions"] == 2
    assert body["badges"]["activeProducts"] == 5  # sets are not counted
    assert body["badges"]["openSupplierProposals"] >= 0


def test_status_warns_when_the_last_booking_is_stale(settings: Settings, v1: V1Builder) -> None:
    build_world(settings, v1)
    settings.reference_date = type(settings.reference_date)(2026, 6, 1)
    body = make_client(settings).get("/api/status").json()
    assert {s["key"]: s["status"] for s in body["stages"]}["source"] == "warn"


def test_status_opens_decisions_badge_drops_after_decision(api: TestClient) -> None:
    api.post("/api/traffic-light/DGW001/decision", json={"choice": "annehmen"})
    assert api.get("/api/status").json()["badges"]["openDecisions"] == 1
