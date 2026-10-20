"""Spec `app-settings`: defaults, validation, journal entry, status and question links."""

from __future__ import annotations

from fastapi.testclient import TestClient
from ruebert.settings import Settings

from ruebert.journal import read_entries

from .conftest import make_client


def by_key(client: TestClient) -> dict[str, dict[str, object]]:
    return {row["key"]: row for row in client.get("/api/settings").json()}


def test_defaults_without_journal_entries(settings: Settings) -> None:
    rows = by_key(make_client(settings))
    assert rows["lead_time_weeks"]["value"] == 12
    assert rows["planning_window_weeks"]["value"] == 8
    assert rows["overstock_weeks"]["value"] == 130
    assert rows["rounding_threshold_percent"]["value"] == 80
    assert rows["min_stock"]["value"] == 30
    assert rows["order_step"]["value"] == 5000
    assert rows["tranche_size"]["value"] == 60000
    assert (rows["target_year"]["value"], rows["target_week"]["value"]) == (2027, 39)


def test_status_and_question_links(settings: Settings) -> None:
    rows = by_key(make_client(settings))
    assert rows["planning_window_weeks"]["status"] == "offen Q-080"
    assert rows["planning_window_weeks"]["question_id"] == "Q-080"
    assert rows["min_stock"]["status"] == "bestätigt"


def test_valid_change_is_journaled_and_used(settings: Settings) -> None:
    client = make_client(settings)
    response = client.put("/api/settings/planning_window_weeks", json={"value": 6})
    assert response.status_code == 200
    assert response.json()["value"] == 6
    entries = read_entries(settings.journal_dir)
    assert [(e.subject, e.value, e.author) for e in entries] == [("setting:planning_window_weeks", 6, "Demo-Nutzer")]
    assert by_key(client)["planning_window_weeks"]["value"] == 6


def test_second_change_supersedes_the_first(settings: Settings) -> None:
    client = make_client(settings)
    client.put("/api/settings/lead_time_weeks", json={"value": 10})
    client.put("/api/settings/lead_time_weeks", json={"value": 14})
    first, second = read_entries(settings.journal_dir)
    assert second.supersedes == first.id
    assert by_key(client)["lead_time_weeks"]["value"] == 14


def test_invalid_threshold_is_rejected_and_nothing_is_written(settings: Settings) -> None:
    response = make_client(settings).put("/api/settings/rounding_threshold_percent", json={"value": 120})
    assert response.status_code == 422
    body = response.json()
    assert body["errors"][0]["field"] == "value"
    assert "Rundungsschwelle" in body["errors"][0]["message"]
    assert read_entries(settings.journal_dir) == []


def test_non_multiple_and_unknown_key_are_rejected(settings: Settings) -> None:
    client = make_client(settings)
    assert client.put("/api/settings/tranche_size", json={"value": 62000}).status_code == 422
    assert client.put("/api/settings/gibt_es_nicht", json={"value": 1}).status_code == 422


def test_reset_restores_the_default(settings: Settings) -> None:
    client = make_client(settings)
    client.put("/api/settings/lead_time_weeks", json={"value": 10})
    response = client.delete("/api/settings/lead_time_weeks")
    assert response.json()["value"] == 12
    assert response.json()["changed_by"] is None
    assert len(read_entries(settings.journal_dir)) == 2
