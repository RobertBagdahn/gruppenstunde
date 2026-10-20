"""Rebuild and nuke of the derived store (demo-data-snapshot spec).

`rebuild` reads the v1 DuckDB read-only and writes a new derived store next to the old one, then swaps
it in atomically, so a failed rebuild never leaves a half-built store behind. `nuke` deletes only the
derived store and its report – never the source and never the journal.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import duckdb

from ruebert import __version__
from ruebert.data.cases import detect_cases
from ruebert.data.checksum import combined_checksum, file_sha256, table_checksums
from ruebert.data.master import FORECAST_RUN_ID, CalendarCorrection, copy_master_data
from ruebert.data.report import ComparisonReport, build_report
from ruebert.data.samples import build_samples
from ruebert.data.schema import CONTENT_TABLES, DDL
from ruebert.data.sql import insert_rows
from ruebert.data.stock import compute_stock
from ruebert.data.stockouts import detect_stockouts
from ruebert.settings import Settings

logger = logging.getLogger(__name__)


class SourceChangedError(RuntimeError):
    """The source file changed while it was being read; the derived store was not replaced."""


@dataclass(frozen=True)
class BuildResult:
    derived_db_path: Path
    report_path: Path
    checksum: str
    table_checksums: dict[str, str]
    row_counts: dict[str, int]
    source_sha256: str
    left_out: dict[str, int]
    calendar_correction: CalendarCorrection
    report: ComparisonReport
    duration_seconds: float


def report_path_for(derived_db_path: Path) -> Path:
    return derived_db_path.with_suffix(".report.json")


def rebuild(settings: Settings) -> BuildResult:
    """Build the derived store from the source and replace the previous one."""
    started = time.monotonic()
    source = settings.require_v1_duckdb()
    target = settings.derived_db_path
    target.parent.mkdir(parents=True, exist_ok=True)
    building = target.with_name(target.name + ".building")
    _remove_db_files(building)

    source_hash_before = file_sha256(source)
    con = duckdb.connect(str(building))
    try:
        con.execute(f"ATTACH '{_sql_path(source)}' AS v1 (READ_ONLY)")
        con.execute(DDL)
        left_out, correction = copy_master_data(con, settings.reference_date)
        compute_stock(con, settings.reference_date)
        detect_cases(con, settings.reference_date)
        detect_stockouts(con, settings.reference_date)
        build_samples(con, settings.reference_date)

        report = build_report(con, settings.reference_date)
        sums = table_checksums(con)
        counts = {table: _count(con, table) for table in CONTENT_TABLES}
        checksum = combined_checksum(sums)
        source_hash_after = file_sha256(source)
        if source_hash_after != source_hash_before:
            raise SourceChangedError(
                f"Die Altdaten {source} haben sich während des Neuaufbaus geändert; "
                "der bisherige Stand bleibt erhalten. Bitte erneut starten."
            )
        _write_build_info(con, settings, source_hash_before, checksum)
        con.execute("DETACH v1")
    except BaseException:
        con.close()
        _remove_db_files(building)
        raise
    con.close()

    _remove_db_files(target)
    os.replace(building, target)
    _remove_wal(building)

    report_path = report_path_for(target)
    duration = round(time.monotonic() - started, 2)
    result = BuildResult(
        derived_db_path=target,
        report_path=report_path,
        checksum=checksum,
        table_checksums=sums,
        row_counts=counts,
        source_sha256=source_hash_before,
        left_out=left_out,
        calendar_correction=correction,
        report=report,
        duration_seconds=duration,
    )
    report_path.write_text(json.dumps(_report_document(settings, result), ensure_ascii=False, indent=2) + "\n", "utf-8")
    logger.info("Derived store rebuilt in %.1f s, checksum %s", duration, checksum[:12])
    return result


def nuke(settings: Settings) -> list[Path]:
    """Delete the derived store and its report. Returns the files that were removed."""
    target = settings.derived_db_path
    removed: list[Path] = []
    for path in (target, target.with_name(target.name + ".wal"), report_path_for(target)):
        if path.exists():
            path.unlink()
            removed.append(path)
    building = target.with_name(target.name + ".building")
    removed.extend(path for path in _db_files(building) if path.exists() and not path.unlink())
    return removed


def _count(con: duckdb.DuckDBPyConnection, table: str) -> int:
    row = con.execute(f"SELECT count(*) FROM {table}").fetchone()
    return int(row[0]) if row else 0


def _write_build_info(con: duckdb.DuckDBPyConnection, settings: Settings, source_sha256: str, checksum: str) -> None:
    info = {
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "reference_date": settings.reference_date.isoformat(),
        "forecast_run_id": str(FORECAST_RUN_ID),
        "source_path": str(settings.v1_duckdb_path),
        "source_sha256": source_sha256,
        "content_checksum": checksum,
        "app_version": __version__,
    }
    insert_rows(con, "INSERT INTO build_info VALUES (?, ?)", list(info.items()))


def _report_document(settings: Settings, result: BuildResult) -> dict[str, object]:
    cc = result.calendar_correction
    return {
        "reference_date": settings.reference_date.isoformat(),
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "duration_seconds": result.duration_seconds,
        "source": {"path": str(settings.v1_duckdb_path), "sha256": result.source_sha256},
        "content_checksum": result.checksum,
        "table_checksums": result.table_checksums,
        "row_counts": result.row_counts,
        "left_out": result.left_out,
        "calendar_correction": {
            "shift_from": cc.shift_from.isoformat() if cc.shift_from else None,
            "days": cc.days,
            "sales_rows": cc.sales_rows,
            "forecast_rows": cc.forecast_rows,
            "note": "v1 beschriftet alle Wochen ab 2026 eine Woche zu spät; week_start ist korrigiert, "
            "v1_week_start enthält die ursprüngliche Beschriftung (siehe Befund Kalenderwochen 2026).",
        },
        "comparison": result.report.to_dict(),
    }


def _sql_path(path: Path) -> str:
    return str(path).replace("'", "''")


def _db_files(path: Path) -> list[Path]:
    return [path, path.with_name(path.name + ".wal")]


def _remove_wal(path: Path) -> None:
    path.with_name(path.name + ".wal").unlink(missing_ok=True)


def _remove_db_files(path: Path) -> None:
    for file in _db_files(path):
        file.unlink(missing_ok=True)
