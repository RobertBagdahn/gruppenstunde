from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from ruebert.main import create_app
from ruebert.settings import Settings, get_settings

from .v1_fixture import V1Builder

ENV_VARS = (
    "V1_DUCKDB_PATH",
    "DERIVED_DB_PATH",
    "JOURNAL_DIR",
    "KNOWLEDGE_DIR",
    "REFERENCE_DATE",
    "GITHUB_TOKEN",
    "GITHUB_REPO",
    "GITHUB_ASSIGNEE",
)


@pytest.fixture(autouse=True)
def _isolated_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tests never read the developer's environment or backend/.env."""
    for name in ENV_VARS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    get_settings.cache_clear()


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    """Settings pointing every path into a temporary directory."""
    return Settings(
        v1_duckdb_path=tmp_path / "source" / "seed_demand.duckdb",
        derived_db_path=tmp_path / "var" / "ruebert.duckdb",
        journal_dir=tmp_path / "journal",
        knowledge_dir=tmp_path / "knowledge",
    )


def make_client(settings: Settings, *routers: APIRouter) -> TestClient:
    app: FastAPI = create_app(*routers)
    app.dependency_overrides[get_settings] = lambda: settings
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with make_client(settings) as test_client:
        yield test_client


@pytest.fixture
def v1(settings: Settings) -> V1Builder:
    """Empty synthetic v1 database at `settings.v1_duckdb_path`; call `.close()` before rebuilding."""
    return V1Builder(settings.v1_duckdb_path)
