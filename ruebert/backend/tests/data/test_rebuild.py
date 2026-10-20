"""Specs `demo-data-snapshot`: read-only source, disposable derived store, reference date, report."""

from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import duckdb
import pytest
from ruebert.data.build import BuildResult, SourceChangedError, nuke, rebuild, report_path_for
from ruebert.data.checksum import file_sha256
from ruebert.data.schema import CONTENT_TABLES
from ruebert.settings import ConfigurationError, Settings

from ..v1_fixture import V1Builder


def small_source(v1: V1Builder) -> Path:
    """Two articles, sales up to ISO week 20/2026 (shifted labels like the real v1), one forecast run."""
    v1.article("DGW001").article("DGW002")
    for sku in ("DGW001", "DGW002"):
        for week in range(1, 53):
            v1.sales(sku, 2025, week, 100 + week)
        for week in range(1, 21):
            v1.sales(sku, 2026, week, 120 + week, label_shift_days=7)
        for offset in range(10):  # forecast continues the shifted labels: first week 25.05.2026
            v1.forecast(sku, date(2026, 5, 25) + timedelta(weeks=offset), 130.0)
    v1.run()
    v1.booking("DGW001", datetime(2026, 5, 15, 10), -3, 250)
    v1.booking("DGW002", datetime(2026, 5, 15, 11), -2, 40)
    return v1.close()


@pytest.fixture
def source(v1: V1Builder) -> Path:
    return small_source(v1)


def query(path: Path, sql: str) -> list[tuple[Any, ...]]:
    with duckdb.connect(str(path), read_only=True) as con:
        return con.execute(sql).fetchall()


class TestSourceIsReadOnly:
    def test_rebuild_leaves_checksum_and_mtime_of_the_source_unchanged(self, settings: Settings, source: Path) -> None:
        before = (file_sha256(source), source.stat().st_mtime_ns, source.stat().st_size)
        rebuild(settings)
        assert (file_sha256(source), source.stat().st_mtime_ns, source.stat().st_size) == before

    def test_no_wal_or_sidecar_file_appears_next_to_the_source(self, settings: Settings, source: Path) -> None:
        before = sorted(p.name for p in source.parent.iterdir())
        rebuild(settings)
        assert sorted(p.name for p in source.parent.iterdir()) == before

    def test_the_source_is_attached_read_only(self, settings: Settings, source: Path) -> None:
        with duckdb.connect() as con:
            con.execute(f"ATTACH '{source}' AS v1 (READ_ONLY)")
            with pytest.raises(duckdb.Error):
                con.execute("DELETE FROM v1.products")

    def test_missing_source_stops_with_a_german_message_naming_path_and_variable(self, settings: Settings) -> None:
        with pytest.raises(ConfigurationError) as error:
            rebuild(settings)
        assert str(settings.v1_duckdb_path) in str(error.value)
        assert "V1_DUCKDB_PATH" in str(error.value)
        assert not settings.derived_db_path.exists()

    def test_source_changed_during_the_build_keeps_the_previous_store(
        self, settings: Settings, source: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        rebuild(settings)
        previous = file_sha256(settings.derived_db_path)

        calls = iter(["before", "after"])
        monkeypatch.setattr("ruebert.data.build.file_sha256", lambda _path: next(calls))
        with pytest.raises(SourceChangedError):
            rebuild(settings)
        assert file_sha256(settings.derived_db_path) == previous
        assert not settings.derived_db_path.with_name(settings.derived_db_path.name + ".building").exists()


class TestDerivedStoreIsDisposable:
    def test_two_rebuilds_have_identical_checksums(self, settings: Settings, source: Path) -> None:
        first = rebuild(settings)
        second = rebuild(settings)
        assert first.checksum == second.checksum
        assert first.table_checksums == second.table_checksums

    def test_nuke_then_rebuild_has_the_same_checksum(self, settings: Settings, source: Path) -> None:
        first = rebuild(settings)
        removed = nuke(settings)
        assert settings.derived_db_path in removed
        assert not settings.derived_db_path.exists()
        assert rebuild(settings).checksum == first.checksum

    def test_nuke_removes_only_the_derived_store_and_its_report(self, settings: Settings, source: Path) -> None:
        settings.journal_dir.mkdir(parents=True)
        entry = settings.journal_dir / "case-decision.yaml"
        entry.write_text("choice: ausschließen\n", encoding="utf-8")
        rebuild(settings)

        nuke(settings)

        assert source.exists()
        assert entry.read_text(encoding="utf-8") == "choice: ausschließen\n"
        assert not report_path_for(settings.derived_db_path).exists()

    def test_nuke_without_a_store_is_harmless(self, settings: Settings) -> None:
        assert nuke(settings) == []

    def test_checksum_changes_when_the_source_changes(self, settings: Settings, source: Path) -> None:
        first = rebuild(settings)
        with duckdb.connect(str(source)) as con:
            con.execute(
                "UPDATE weekly_sales_effective SET quantity_total = quantity_total + 1 WHERE sku = 'DGW001' AND year = 2025 AND week = 5"
            )
        second = rebuild(settings)
        assert second.checksum != first.checksum
        assert second.table_checksums["weekly_sales"] != first.table_checksums["weekly_sales"]
        assert second.table_checksums["articles"] == first.table_checksums["articles"]

    def test_content_tables_are_complete_and_exist(self, settings: Settings, source: Path) -> None:
        result = rebuild(settings)
        assert set(result.table_checksums) == set(CONTENT_TABLES)
        assert set(result.row_counts) == set(CONTENT_TABLES)
        tables = {row[0] for row in query(settings.derived_db_path, "SELECT table_name FROM information_schema.tables")}
        assert set(CONTENT_TABLES) | {"build_info"} <= tables

    def test_a_failed_rebuild_keeps_the_previous_store(self, settings: Settings, source: Path) -> None:
        rebuild(settings)
        previous = file_sha256(settings.derived_db_path)
        with duckdb.connect(str(source)) as con:
            con.execute("DROP TABLE set_components")  # makes the copy step fail
        with pytest.raises(duckdb.Error):
            rebuild(settings)
        assert file_sha256(settings.derived_db_path) == previous
        assert not settings.derived_db_path.with_name(settings.derived_db_path.name + ".building").exists()


class TestReferenceDate:
    def test_build_info_records_the_default_reference_date_and_its_iso_week(
        self, settings: Settings, source: Path
    ) -> None:
        rebuild(settings)
        info = dict(query(settings.derived_db_path, "SELECT key, value FROM build_info"))
        assert info["reference_date"] == "2026-05-18"
        assert date.fromisoformat(str(info["reference_date"])).isocalendar().week == 21

    def test_weeks_from_the_reference_week_on_are_not_part_of_the_sales_history(
        self, settings: Settings, source: Path
    ) -> None:
        result = rebuild(settings)
        (latest,) = query(settings.derived_db_path, "SELECT max(week_start) FROM weekly_sales")[0]
        assert latest == date(2026, 5, 11)  # ISO week 20: the last week before the reference Monday
        assert result.left_out["weekly_sales_from_reference_week"] == 0

    def test_an_earlier_reference_date_cuts_the_history(self, settings: Settings, source: Path) -> None:
        settings.reference_date = date(2026, 3, 2)
        rebuild(settings)
        (latest,) = query(settings.derived_db_path, "SELECT max(week_start) FROM weekly_sales")[0]
        assert latest == date(2026, 2, 23)

    def test_bookings_on_or_after_the_reference_date_are_ignored_for_stock(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2026, 5, 15, 10), -3, 250)
        v1.booking("DGW001", datetime(2026, 5, 18, 9), -1000, 0)  # on the reference date: "future"
        v1.close()
        rebuild(settings)
        assert query(settings.derived_db_path, "SELECT stock FROM stock") == [(250,)]


class TestReport:
    def test_report_file_is_written_with_checksums_counts_and_the_source_hash(
        self, settings: Settings, source: Path
    ) -> None:
        result = rebuild(settings)
        document = json.loads(report_path_for(settings.derived_db_path).read_text(encoding="utf-8"))
        assert document["content_checksum"] == result.checksum
        assert document["source"]["sha256"] == file_sha256(source)
        assert document["row_counts"]["articles"] == 2
        assert document["comparison"]["articles_compared"] == 2
        assert document["comparison"]["stock_differences"] == []

    def test_build_info_does_not_influence_the_content_checksum(self, settings: Settings, source: Path) -> None:
        first = rebuild(settings)
        info_1 = dict(query(settings.derived_db_path, "SELECT key, value FROM build_info"))
        os.utime(source, None)
        second = rebuild(settings)
        assert first.checksum == second.checksum
        assert (
            dict(query(settings.derived_db_path, "SELECT key, value FROM build_info"))["content_checksum"]
            == second.checksum
        )
        assert info_1["content_checksum"] == first.checksum

    def test_result_exposes_the_duration(self, settings: Settings, source: Path) -> None:
        result: BuildResult = rebuild(settings)
        assert result.duration_seconds >= 0
