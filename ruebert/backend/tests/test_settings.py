from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError
from ruebert.settings import BACKEND_ROOT, REPO_ROOT, ConfigurationError, Settings, get_settings


def test_defaults_point_into_the_repository() -> None:
    settings = Settings()
    assert settings.v1_duckdb_path == REPO_ROOT / "data" / "seed_demand.duckdb"
    assert settings.derived_db_path == BACKEND_ROOT / "var" / "ruebert.duckdb"
    assert settings.journal_dir == REPO_ROOT / "journal"
    assert settings.knowledge_dir == REPO_ROOT / "knowledge"


def test_default_reference_date_is_monday_after_the_last_booking() -> None:
    settings = Settings()
    assert settings.reference_date == date(2026, 5, 18)
    assert settings.reference_date.isoweekday() == 1
    assert settings.reference_date.isocalendar().week == 21


def test_default_github_target_and_no_token() -> None:
    settings = Settings()
    assert settings.github_repo == "RobertBagdahn/seed-demand"
    assert settings.github_assignee == "RobertBagdahn"
    assert settings.github_token is None


def test_environment_overrides(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("V1_DUCKDB_PATH", str(tmp_path / "v1.duckdb"))
    monkeypatch.setenv("JOURNAL_DIR", str(tmp_path / "journal"))
    monkeypatch.setenv("REFERENCE_DATE", "2026-06-01")
    monkeypatch.setenv("GITHUB_TOKEN", "github_pat_test")
    settings = Settings()
    assert settings.v1_duckdb_path == tmp_path / "v1.duckdb"
    assert settings.journal_dir == tmp_path / "journal"
    assert settings.reference_date == date(2026, 6, 1)
    assert settings.github_token is not None
    assert settings.github_token.get_secret_value() == "github_pat_test"


def test_relative_paths_resolve_against_the_repository_root(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JOURNAL_DIR", "journal-test")
    assert Settings().journal_dir == REPO_ROOT / "journal-test"


def test_empty_token_counts_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GITHUB_TOKEN", "")
    assert Settings().github_token is None


def test_token_is_not_revealed_in_repr(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GITHUB_TOKEN", "github_pat_secret")
    settings = Settings()
    assert "github_pat_secret" not in repr(settings)
    assert "github_pat_secret" not in str(settings.model_dump())


def test_invalid_reference_date_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REFERENCE_DATE", "18.05.2026")
    with pytest.raises(ValidationError):
        Settings()


def test_missing_source_names_path_and_variable(settings: Settings) -> None:
    with pytest.raises(ConfigurationError) as error:
        settings.require_v1_duckdb()
    message = str(error.value)
    assert str(settings.v1_duckdb_path) in message
    assert "V1_DUCKDB_PATH" in message
    assert message.startswith("Altdaten nicht gefunden")


def test_source_directory_is_not_a_database(settings: Settings) -> None:
    settings.v1_duckdb_path.mkdir(parents=True)
    with pytest.raises(ConfigurationError):
        settings.require_v1_duckdb()


def test_existing_source_is_returned(settings: Settings) -> None:
    settings.v1_duckdb_path.parent.mkdir(parents=True)
    settings.v1_duckdb_path.write_bytes(b"")
    assert settings.require_v1_duckdb() == settings.v1_duckdb_path


def test_get_settings_is_cached() -> None:
    assert get_settings() is get_settings()
