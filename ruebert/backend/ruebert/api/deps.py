"""Shared request dependencies: the read-only derived store and the journal."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated

import duckdb
from fastapi import Depends, HTTPException

from ruebert.domain import parameters
from ruebert.journal import Entry, read_entries, setting_values
from ruebert.settings import Settings, get_settings

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_store(settings: SettingsDep) -> Iterator[duckdb.DuckDBPyConnection]:
    """Read-only connection to the derived store; 503 with the fix if it was never built."""
    if not settings.derived_db_path.is_file():
        raise HTTPException(503, "Der Datenstand fehlt. Bitte `make rebuild` ausführen.")
    con = duckdb.connect(str(settings.derived_db_path), read_only=True)
    try:
        yield con
    finally:
        con.close()


StoreDep = Annotated[duckdb.DuckDBPyConnection, Depends(get_store)]


def get_entries(settings: SettingsDep) -> list[Entry]:
    return read_entries(settings.journal_dir)


EntriesDep = Annotated[list[Entry], Depends(get_entries)]


def get_parameters(entries: EntriesDep) -> dict[str, parameters.Value]:
    """Business parameters: defaults overlaid with the journal."""
    return parameters.effective_values(setting_values(entries))


ParametersDep = Annotated[dict[str, parameters.Value], Depends(get_parameters)]
