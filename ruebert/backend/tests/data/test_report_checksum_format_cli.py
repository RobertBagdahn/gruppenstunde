"""Comparison report with v1, checksums, German formatting and the command line."""

from __future__ import annotations

import hashlib
from datetime import date, datetime, timedelta
from pathlib import Path

import duckdb
import pytest
from ruebert.data.__main__ import main
from ruebert.data.build import rebuild
from ruebert.data.checksum import combined_checksum, file_sha256, table_checksums
from ruebert.data.format import format_date, format_int, week_label
from ruebert.data.report import build_report, v1_colour, v1_coverage_weeks
from ruebert.data.schema import CONTENT_TABLES
from ruebert.settings import Settings

from ..v1_fixture import V1Builder


class TestV1Rules:
    @pytest.mark.parametrize(
        ("weeks", "colour"),
        [(1, "red"), (12, "red"), (13, "yellow"), (24, "yellow"), (25, "green"), (100, "green"), (101, "blue")],
    )
    def test_colour_thresholds_of_bestell_ampel(self, weeks: int, colour: str) -> None:
        assert v1_colour(weeks) == colour

    def test_coverage_is_the_week_in_which_fewer_than_30_units_remain(self) -> None:
        assert v1_coverage_weeks(100, [30.0, 30.0, 30.0, 30.0], horizon_weeks=104) == 3  # 100 - 90 = 10 < 30

    def test_exactly_30_units_remaining_is_not_yet_depleted(self) -> None:
        # After week 2 exactly 30 remain (not below 30); depletion happens in week 3 (-5), not in week 2.
        assert v1_coverage_weeks(100, [35.0, 35.0, 35.0], horizon_weeks=104) == 3
        # One unit more demand in week 2 leaves 29 and depletes in week 2.
        assert v1_coverage_weeks(100, [35.0, 36.0, 35.0], horizon_weeks=104) == 2

    def test_no_depletion_gives_the_whole_forecast_length(self) -> None:
        assert v1_coverage_weeks(10_000, [10.0] * 52, horizon_weeks=104) == 52

    def test_an_article_without_forecast_gets_the_whole_horizon_like_v1_and_is_blue(self) -> None:
        assert v1_coverage_weeks(50, [], horizon_weeks=104) == 104
        assert v1_colour(104) == "blue"


class TestReport:
    def test_counts_colours_with_v1_rules_and_lists_articles_without_forecast(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        v1.article("DGW001").article("DGW002").article("DGW003").article("DGW158").run()
        for sku, stock in (("DGW001", 100), ("DGW002", 100_000), ("DGW003", 40), ("DGW158", 5)):
            v1.booking(sku, datetime(2026, 5, 15, 9), -1, stock)
        for week in range(104):
            monday = date(2026, 5, 18) + timedelta(weeks=week)
            v1.forecast("DGW001", monday, 10.0)  # 100 units / 10 per week: depleted after 8 weeks → red
            v1.forecast("DGW002", monday, 10.0)  # 100,000 units: never depleted → whole horizon → blue
        v1.close()
        result = rebuild(settings)
        assert result.report.v1_colour_counts == {"red": 1, "yellow": 0, "green": 0, "blue": 2}
        assert result.report.colour_counts == {"red": 1, "yellow": 0, "green": 0, "blue": 1}  # DGW003: no forecast
        assert result.report.articles_without_forecast == ["DGW003"]  # DGW158 is special and not listed

    def test_reports_stock_differences_to_the_v1_computation(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").article("DGW002").run()
        v1.booking("DGW001", datetime(2026, 5, 15, 9), -1, 100)
        v1.booking("DGW002", datetime(2026, 5, 15, 9), -1, 50)
        v1.close()
        rebuild(settings)
        with duckdb.connect(str(settings.derived_db_path)) as con:
            con.execute(f"ATTACH '{settings.v1_duckdb_path}' AS v1 (READ_ONLY)")
            con.execute("UPDATE stock SET stock = 77 WHERE sku = 'DGW001'")
            con.execute("DELETE FROM stock WHERE sku = 'DGW002'")
            report = build_report(con, settings.reference_date)
        assert [(d.sku, d.v1_stock, d.new_stock, d.reason) for d in report.stock_differences] == [
            ("DGW001", 100, 77, "anderer Wert"),
            ("DGW002", 50, None, "fehlt im neuen Stand"),
        ]

    def test_to_dict_is_json_ready(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run().close()
        document = rebuild(settings).report.to_dict()
        assert document["reference_date"] == "2026-05-18"
        assert document["stock_differences"] == []


class TestChecksums:
    def test_file_sha256_matches_hashlib(self, tmp_path: Path) -> None:
        path = tmp_path / "data.bin"
        path.write_bytes(b"flower" * 500_000)  # larger than one read chunk
        assert file_sha256(path) == hashlib.sha256(b"flower" * 500_000).hexdigest()

    def test_table_checksums_cover_every_table_and_react_to_a_single_changed_cell(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        v1.article("DGW001").run().close()
        rebuild(settings)
        with duckdb.connect(str(settings.derived_db_path)) as con:
            before = table_checksums(con)
            con.execute("UPDATE articles SET price = price + 0.01")
            after = table_checksums(con)
        assert set(before) == set(CONTENT_TABLES)
        assert [t for t in CONTENT_TABLES if before[t] != after[t]] == ["articles"]

    def test_row_order_does_not_matter(self) -> None:
        with duckdb.connect() as con:
            con.execute("CREATE TABLE t (a INTEGER, b VARCHAR)")
            con.execute("INSERT INTO t VALUES (2, 'b'), (1, 'a')")
            first = con.execute("SELECT * FROM t ORDER BY ALL").fetchall()
            con.execute("DELETE FROM t")
            con.execute("INSERT INTO t VALUES (1, 'a'), (2, 'b')")
            assert con.execute("SELECT * FROM t ORDER BY ALL").fetchall() == first

    def test_combined_checksum_depends_on_every_table(self) -> None:
        sums = {table: f"{index:064x}" for index, table in enumerate(CONTENT_TABLES)}
        base = combined_checksum(sums)
        for table in CONTENT_TABLES:
            assert combined_checksum({**sums, table: "f" * 64}) != base


class TestFormat:
    @pytest.mark.parametrize(
        ("value", "text"),
        [(0, "0"), (15000, "15.000"), (1234567, "1.234.567"), (2.5, "3"), (-2.5, "-3"), (-2950, "-2.950"), (0.4, "0")],
    )
    def test_format_int(self, value: float, text: str) -> None:
        assert format_int(value) == text

    def test_format_date(self) -> None:
        assert format_date(date(2026, 5, 18)) == "18.05.2026"

    @pytest.mark.parametrize(
        ("day", "label"),
        [(date(2026, 5, 18), "KW 21/2026"), (date(2026, 1, 1), "KW 1/2026"), (date(2027, 1, 1), "KW 53/2026")],
    )
    def test_week_label_uses_the_iso_week_and_iso_year(self, day: date, label: str) -> None:
        assert week_label(day) == label


class TestCommandLine:
    @pytest.fixture
    def env(self, settings: Settings, monkeypatch: pytest.MonkeyPatch) -> Settings:
        monkeypatch.setenv("V1_DUCKDB_PATH", str(settings.v1_duckdb_path))
        monkeypatch.setenv("DERIVED_DB_PATH", str(settings.derived_db_path))
        return settings

    def test_rebuild_prints_a_german_summary_and_exits_zero(
        self, env: Settings, v1: V1Builder, capsys: pytest.CaptureFixture[str]
    ) -> None:
        v1.article("DGW001").run().close()
        assert main(["rebuild"]) == 0
        out = capsys.readouterr().out
        assert "aufgebaut" in out
        assert "Prüfsumme:" in out
        assert "Stand 2026-05-18" in out
        assert env.derived_db_path.exists()

    def test_rebuild_without_source_exits_one_and_names_the_variable(
        self, env: Settings, capsys: pytest.CaptureFixture[str]
    ) -> None:
        assert main(["rebuild"]) == 1
        assert "V1_DUCKDB_PATH" in capsys.readouterr().err

    def test_nuke_reports_what_it_removed_and_is_idempotent(
        self, env: Settings, v1: V1Builder, capsys: pytest.CaptureFixture[str]
    ) -> None:
        v1.article("DGW001").run().close()
        main(["rebuild"])
        capsys.readouterr()
        assert main(["nuke"]) == 0
        assert "gelöscht" in capsys.readouterr().out
        assert main(["nuke"]) == 0
        assert "nichts zu löschen" in capsys.readouterr().out

    def test_unknown_command_is_rejected(self) -> None:
        with pytest.raises(SystemExit) as exit_info:
            main(["destroy"])
        assert exit_info.value.code == 2
