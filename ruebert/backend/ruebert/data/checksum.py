"""Content checksums: prove that two builds are identical and that the source was not touched."""

from __future__ import annotations

import hashlib
from pathlib import Path

import duckdb

from ruebert.data.schema import CONTENT_TABLES

_CHUNK = 1024 * 1024


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(_CHUNK):
            digest.update(chunk)
    return digest.hexdigest()


def table_checksums(con: duckdb.DuckDBPyConnection) -> dict[str, str]:
    """SHA-256 per content table over all rows in a total order (`ORDER BY ALL`).

    Build metadata (timestamps, durations) lives outside the content tables on purpose, so two
    rebuilds of the same source and journal give the same checksums.
    """
    sums: dict[str, str] = {}
    for table in CONTENT_TABLES:
        digest = hashlib.sha256()
        cursor = con.execute(f"SELECT * FROM {table} ORDER BY ALL")
        while rows := cursor.fetchmany(10_000):
            for row in rows:
                digest.update(repr(row).encode())
        sums[table] = digest.hexdigest()
    return sums


def combined_checksum(sums: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for table in CONTENT_TABLES:
        digest.update(f"{table}:{sums[table]}\n".encode())
    return digest.hexdigest()
