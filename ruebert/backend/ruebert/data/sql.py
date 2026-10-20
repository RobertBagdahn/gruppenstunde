"""Small DuckDB helpers shared by the rebuild steps."""

from __future__ import annotations

from collections.abc import Sequence

import duckdb


def insert_rows(con: duckdb.DuckDBPyConnection, sql: str, rows: Sequence[Sequence[object]]) -> None:
    """`executemany` that accepts an empty list (DuckDB raises on it), e.g. a source without any cases."""
    if rows:
        con.executemany(sql, [list(row) for row in rows])
