"""Configuration from environment variables and `backend/.env` (never from code or the repository)."""

from __future__ import annotations

from datetime import date
from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent


class ConfigurationError(RuntimeError):
    """A required file or setting is missing; the message is German and names the fix."""


class Settings(BaseSettings):
    """All settings of the backend. Relative paths are resolved against the repository root."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Source system: the v1 DuckDB, opened read-only (demo-data-snapshot spec).
    v1_duckdb_path: Path = REPO_ROOT / "data" / "seed_demand.duckdb"
    # Derived, disposable store; `make nuke` deletes it.
    derived_db_path: Path = BACKEND_ROOT / "var" / "ruebert.duckdb"
    # Decision journal; survives every rebuild.
    journal_dir: Path = REPO_ROOT / "journal"
    # Wiki rendered by the wiki view.
    knowledge_dir: Path = REPO_ROOT / "knowledge"
    # Built frontend served by the backend in the container (unset in development: Vite serves it).
    frontend_dist: Path | None = None
    # The date the app treats as "today": Monday after the last v1 booking (16.05.2026).
    reference_date: date = date(2026, 5, 18)
    # Author written into journal entries (the prototype has no login).
    journal_author: str = "Demo-Nutzer"
    # GitHub issues for the feedback button; the token stays on the server.
    github_token: SecretStr | None = None
    github_repo: str = "RobertBagdahn/seed-demand"
    github_assignee: str = "RobertBagdahn"

    @field_validator("v1_duckdb_path", "derived_db_path", "journal_dir", "knowledge_dir", "frontend_dist", mode="after")
    @classmethod
    def _resolve_against_repo(cls, value: Path | None) -> Path | None:
        if value is None:
            return None
        path = value.expanduser()
        return path if path.is_absolute() else (REPO_ROOT / path).resolve()

    @field_validator("github_token", mode="before")
    @classmethod
    def _empty_token_is_none(cls, value: object) -> object:
        return None if value == "" else value

    def require_v1_duckdb(self) -> Path:
        """Return the source path or raise a German error naming the path and the variable to set."""
        if not self.v1_duckdb_path.is_file():
            raise ConfigurationError(
                f"Altdaten nicht gefunden: {self.v1_duckdb_path}. "
                "Setze V1_DUCKDB_PATH (Umgebung oder backend/.env) auf die v1-DuckDB."
            )
        return self.v1_duckdb_path


@lru_cache
def get_settings() -> Settings:
    """Settings singleton for the running app; tests override it via FastAPI dependency overrides."""
    return Settings()
