"""The container serves the built single-page app next to the API (no /api path ever falls through)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from ruebert.main import create_app, mount_frontend
from ruebert.settings import Settings

from .conftest import make_client


@pytest.fixture
def dist(tmp_path: Path) -> Path:
    root = tmp_path / "dist"
    (root / "assets").mkdir(parents=True)
    (root / "index.html").write_text("<!doctype html><title>Rübert</title>", encoding="utf-8")
    (root / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("nicht ausliefern", encoding="utf-8")
    return root


@pytest.fixture
def served(dist: Path, settings: Settings) -> TestClient:
    app = create_app()
    mount_frontend(app, dist)
    from ruebert.settings import get_settings

    app.dependency_overrides[get_settings] = lambda: settings
    return TestClient(app)


def test_the_root_and_client_routes_return_the_app(served: TestClient) -> None:
    assert "Rübert" in served.get("/").text
    assert "Rübert" in served.get("/products/DGW001").text
    assert "Rübert" in served.get("/wiki/plan/frontend.md").text


def test_assets_are_served_as_files(served: TestClient) -> None:
    response = served.get("/assets/app.js")
    assert response.status_code == 200
    assert "console.log" in response.text


def test_files_outside_the_dist_folder_are_not_served(served: TestClient) -> None:
    body = served.get("/../secret.txt").text
    assert "nicht ausliefern" not in body
    assert "Rübert" in body  # answered with the app shell instead


def test_api_paths_never_fall_through_to_the_app(served: TestClient) -> None:
    assert served.get("/api/gibt-es-nicht").status_code == 404
    assert served.get("/api").status_code == 404
    assert served.get("/api/health").status_code == 200


def test_without_a_dist_folder_only_the_api_exists(settings: Settings) -> None:
    client = make_client(settings)
    assert client.get("/").status_code == 404
