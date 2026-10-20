"""Spec `article-views` at the API: list filters, search, deep link, detail content."""

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


def skus(body: dict[str, object]) -> list[str]:
    return [i["sku"] for i in body["items"]]  # type: ignore[index, union-attr]


def test_list_has_all_regular_articles_without_sets(api: TestClient) -> None:
    body = api.get("/api/products").json()
    assert skus(body) == ["DGW001", "DGW002", "DGW003", "DGW004", "DGW158"]
    assert (body["total"], body["page"], body["total_pages"]) == (5, 1, 1)


def test_filter_by_colour(api: TestClient) -> None:
    assert skus(api.get("/api/products", params={"colour": "red"}).json()) == [
        "DGW001",
        "DGW158",
    ]  # special has a colour too
    assert skus(api.get("/api/products", params={"colour": "blue"}).json()) == ["DGW003"]


def test_search_by_sku_and_by_name(api: TestClient) -> None:
    assert skus(api.get("/api/products", params={"search": "dgw00"}).json()) == ["DGW001", "DGW002", "DGW003", "DGW004"]
    assert skus(api.get("/api/products", params={"search": "Artikel DGW158"}).json()) == ["DGW158"]
    assert api.get("/api/products", params={"search": "Basilikum"}).json()["items"] == []


def test_sort_and_pagination(api: TestClient) -> None:
    body = api.get("/api/products", params={"sort": "stock", "descending": True, "page_size": 2}).json()
    assert skus(body) == ["DGW003", "DGW004"]
    assert body["total_pages"] == 3
    by_colour = api.get("/api/products", params={"sort": "colour"}).json()
    assert skus(by_colour)[:3] == ["DGW001", "DGW158", "DGW002"]


def test_filters_endpoint(api: TestClient) -> None:
    body = api.get("/api/products/filters").json()
    assert "Deine Gartenwelt" in body["brands"]
    assert "Kräutersamen" in body["categories"]


def test_unknown_article_and_set_are_404(api: TestClient) -> None:
    assert api.get("/api/products/NOPE").status_code == 404
    assert api.get("/api/products/SET001").status_code == 404


def test_detail_identity_light_and_chart_data(api: TestClient) -> None:
    body = api.get("/api/products/DGW001").json()
    assert (body["sku"], body["colour"]) == ("DGW001", "red")
    assert body["recommendation"].startswith("Bis KW")
    assert len(body["history"]) == 72  # 52 + 20 weeks
    assert body["forecast"][0]["week_start"] == "2026-05-18"  # label shift of 2026 corrected
    assert body["forecast"][0]["lower_80"] < body["forecast"][0]["quantity"] < body["forecast"][0]["upper_80"]
    keys = {m["key"] for m in body["markers"]}
    assert {"today", "year_change", "easter", "march_20"} <= keys


def test_detail_derivation_ends_at_the_planner_quantity(api: TestClient) -> None:
    body = api.get("/api/products/DGW002").json()
    assert body["derivation"]["result"] == body["quantity"]
    assert body["sentence"].startswith("Rübert schlägt")
    assert api.get("/api/products/DGW158").json()["derivation"] is None  # special article: not in the tranche


def test_detail_demand_origin_with_set_contribution_and_sample_channels(api: TestClient) -> None:
    body = api.get("/api/products/DGW001").json()
    origin = body["demand_origin"]
    assert origin["direct_units"] > 0
    assert [s["set_sku"] for s in origin["sets"]] == ["SET001"]
    assert origin["sets"][0]["units_per_set"] == 2
    assert origin["channels_are_sample"] is True
    assert all(c["is_sample"] for c in origin["channels"])
    assert abs(sum(c["share"] for c in origin["channels"]) - 1) < 1e-6


def test_detail_models_mark_unevaluated_models(api: TestClient) -> None:
    models = api.get("/api/products/DGW001").json()["models"]
    assert isinstance(models, list)
    for m in models:
        if not m["evaluated"]:
            assert m["wape"] is None and m["bias"] is None and m["coverage"] is None


def test_journal_history_and_excluded_weeks(api: TestClient) -> None:
    api.post("/api/traffic-light/DGW001/decision", json={"choice": "annehmen"})
    api.put("/api/order-plans/quantities/DGW001", json={"quantity": 10_000})
    body = api.get("/api/products/DGW001").json()
    assert [j["type"] for j in body["journal"]] == ["quantity", "order"] or {j["type"] for j in body["journal"]} == {
        "quantity",
        "order",
    }
    assert all(j["author"] == "Demo-Nutzer" for j in body["journal"])
    assert body["derivation"]["steps"][-1]["key"] == "manual"


def test_detail_names_the_stockout_week_for_the_chart(api: TestClient) -> None:
    body = api.get("/api/products/DGW001").json()
    assert body["stockout_week"] == "2026-06-01"  # 220 available, 100 per week: exceeded in the third week
    assert api.get("/api/products/DGW003").json()["stockout_week"] is None
