"""Stock as of the reference date (v1 logic, Q-101 open) and stock-out phases from stock = 0."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

import duckdb
from ruebert.data.build import rebuild
from ruebert.data.stockouts import Phase, find_phases
from ruebert.settings import Settings

from ..v1_fixture import V1Builder

REFERENCE = date(2026, 5, 18)


def d(day: int, month: int = 5, year: int = 2026) -> date:
    return date(year, month, day)


def rows(settings: Settings, sql: str) -> list[tuple[Any, ...]]:
    with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
        return con.execute(sql).fetchall()


class TestStock:
    def test_takes_stock_after_of_the_last_booking(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2026, 5, 10, 9), -5, 100)
        v1.booking("DGW001", datetime(2026, 5, 14, 9), -10, 90)
        v1.booking("DGW001", datetime(2026, 5, 12, 9), -4, 96)  # earlier time, inserted later
        v1.close()
        rebuild(settings)
        assert rows(settings, "SELECT sku, stock, stock_raw, last_booked_at FROM stock") == [
            ("DGW001", 90, 90, datetime(2026, 5, 14, 9))
        ]

    def test_negative_stock_is_clipped_to_zero_and_the_raw_value_is_kept(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2026, 5, 14, 9), -5, -30)
        v1.close()
        rebuild(settings)
        assert rows(settings, "SELECT stock, stock_raw FROM stock") == [(0, -30)]

    def test_equal_timestamps_are_resolved_by_booking_id_so_the_rebuild_is_deterministic(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        when = datetime(2026, 5, 14, 9)
        v1.article("DGW001").run()
        v1.booking("DGW001", when, -1, 80, booking_id=7)
        v1.booking("DGW001", when, -1, 79, booking_id=9)
        v1.close()
        first = rebuild(settings)
        assert rows(settings, "SELECT stock, last_booking_id, tied_bookings FROM stock") == [(79, 9, 2)]
        assert rebuild(settings).checksum == first.checksum

    def test_articles_without_bookings_have_no_stock_row(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").article("DGW002").run()
        v1.booking("DGW001", datetime(2026, 5, 14, 9), -1, 5)
        v1.close()
        rebuild(settings)
        assert rows(settings, "SELECT sku FROM stock") == [("DGW001",)]

    def test_bookings_of_unknown_articles_are_left_out_and_counted(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2026, 5, 14, 9), -1, 5)
        v1.booking("XYZ999", datetime(2026, 5, 14, 9), -1, 5)
        v1.close()
        result = rebuild(settings)
        assert rows(settings, "SELECT sku FROM stock") == [("DGW001",)]
        assert result.left_out["movements_unknown_article_skus"] == 1

    def test_stock_matches_the_v1_query_on_every_article(self, settings: Settings, v1: V1Builder) -> None:
        v1.run()
        for number in range(1, 6):
            sku = f"DGW00{number}"
            v1.article(sku)
            v1.booking(sku, datetime(2026, 4, 1, 8), -1, 100 * number)
            v1.booking(sku, datetime(2026, 5, 2 + number, 8), -1, 100 * number - 1 - number)
        v1.close()
        result = rebuild(settings)
        assert result.report.stock_differences == []
        assert result.report.articles_compared == 5


class TestFindPhases:
    def test_a_phase_runs_from_the_first_zero_day_to_the_first_day_above_zero(self) -> None:
        days = [(d(1), 20), (d(3), 0), (d(5), 0), (d(8), 40)]
        assert find_phases("DGW001", days, REFERENCE) == [Phase("DGW001", d(3), d(8), 5)]

    def test_days_without_bookings_keep_the_previous_state(self) -> None:
        days = [(d(3), 0), (d(10), 12)]
        assert find_phases("DGW001", days, REFERENCE) == [Phase("DGW001", d(3), d(10), 7)]

    def test_a_phase_still_open_at_the_reference_date_has_no_end(self) -> None:
        days = [(d(1), 20), (d(12), 0)]
        assert find_phases("DGW001", days, REFERENCE) == [Phase("DGW001", d(12), None, 6)]

    def test_negative_stock_is_not_sold_out_and_ends_a_phase(self) -> None:
        days = [(d(2), 0), (d(4), -3), (d(6), 0), (d(9), 10)]
        assert find_phases("DGW001", days, REFERENCE) == [
            Phase("DGW001", d(2), d(4), 2),
            Phase("DGW001", d(6), d(9), 3),
        ]

    def test_a_negative_start_does_not_open_a_phase(self) -> None:
        assert find_phases("DGW001", [(d(2), -3), (d(5), 8)], REFERENCE) == []

    def test_several_phases_of_one_article(self) -> None:
        days = [(d(1), 0), (d(2), 5), (d(3), 0), (d(4), 5)]
        phases = find_phases("DGW001", days, REFERENCE)
        assert [(p.start_date, p.end_date) for p in phases] == [(d(1), d(2)), (d(3), d(4))]

    def test_days_on_or_after_the_reference_date_are_ignored(self) -> None:
        days = [(d(10), 0), (REFERENCE, 50), (d(20), 0)]
        assert find_phases("DGW001", days, REFERENCE) == [Phase("DGW001", d(10), None, 8)]

    def test_no_zero_day_means_no_phase(self) -> None:
        assert find_phases("DGW001", [(d(1), 5), (d(2), 6)], REFERENCE) == []

    def test_empty_history(self) -> None:
        assert find_phases("DGW001", [], REFERENCE) == []


class TestStockoutsInTheStore:
    def test_phases_are_stored_with_a_stable_id_and_the_shipped_units(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2026, 5, 1, 9), -5, 20)
        v1.booking("DGW001", datetime(2026, 5, 4, 9), -20, 0)  # sold out
        v1.booking("DGW001", datetime(2026, 5, 6, 9), -2, 0)  # shipped although stock is 0 (hint for Q-101)
        v1.booking("DGW001", datetime(2026, 5, 8, 9), 300, 300, movement_type="Wareneingang")
        v1.close()
        rebuild(settings)
        assert rows(
            settings, "SELECT phase_id, start_date, end_date, duration_days, shipped_during FROM stockout_phases"
        ) == [("DGW001:2026-05-04", d(4), d(8), 4, 2)]

    def test_the_last_booking_of_a_day_decides(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2026, 5, 4, 8), -5, 0)
        v1.booking("DGW001", datetime(2026, 5, 4, 16), 100, 100, movement_type="Wareneingang")
        v1.close()
        rebuild(settings)
        assert rows(settings, "SELECT count(*) FROM stockout_phases") == [(0,)]

    def test_a_source_without_any_phase_rebuilds(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2026, 5, 4, 8), -5, 50)
        v1.close()
        rebuild(settings)
        assert rows(settings, "SELECT count(*) FROM stockout_phases") == [(0,)]
