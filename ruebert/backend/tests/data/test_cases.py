"""Case inbox content: IQR anomalies (checked against an independent reference) and data findings."""

from __future__ import annotations

import random
from datetime import date, datetime, timedelta
from typing import Any

import duckdb
import pytest
from ruebert.data.build import rebuild
from ruebert.data.cases import (
    ANOMALY_FROM,
    ANOMALY_IQR_FACTOR,
    ANOMALY_MIN_DELTA,
    ANOMALY_MIN_VALUES,
)
from ruebert.settings import Settings

from ..v1_fixture import V1Builder, iso_monday


def cases(settings: Settings, where: str = "TRUE") -> list[tuple[Any, ...]]:
    with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
        return con.execute(
            f"SELECT case_id, kind, sku, week_start, title, question_id, actual_qty, expected_qty, booking_count, options "
            f"FROM cases WHERE {where} ORDER BY case_id"
        ).fetchall()


def quantile(values: list[float], q: float) -> float:
    """Linear interpolation like numpy.percentile (what v1 used) and DuckDB quantile_cont."""
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    low = int(position)
    high = min(low + 1, len(ordered) - 1)
    return ordered[low] + (ordered[high] - ordered[low]) * (position - low)


def reference_anomalies(series: dict[tuple[str, date], float]) -> set[tuple[str, date]]:
    """Independent re-implementation of legacy detect_weekly_anomalies for the test data."""
    by_week: dict[tuple[str, int], list[tuple[date, float]]] = {}
    for (sku, week_start), qty in series.items():
        if week_start >= ANOMALY_FROM:
            by_week.setdefault((sku, week_start.isocalendar().week), []).append((week_start, qty))
    found: set[tuple[str, date]] = set()
    for (sku, _), entries in by_week.items():
        if len(entries) < ANOMALY_MIN_VALUES:
            continue
        values = [qty for _, qty in entries]
        q1, q3 = quantile(values, 0.25), quantile(values, 0.75)
        median = quantile(values, 0.5)
        low, high = q1 - ANOMALY_IQR_FACTOR * (q3 - q1), q3 + ANOMALY_IQR_FACTOR * (q3 - q1)
        for week_start, qty in entries:
            if (qty < low or qty > high) and abs(qty - median) >= ANOMALY_MIN_DELTA:
                found.add((sku, week_start))
    return found


LONG_HISTORY = range(2023, 2032)  # nine yearly values per calendar week


def with_long_history(settings: Settings) -> None:
    """The IQR method needs many yearly values per calendar week (see the test about three values)."""
    settings.reference_date = date(2032, 1, 4)


class TestAnomalies:
    @pytest.fixture(autouse=True)
    def _iqr_reference_method(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """These tests pin the v1 IQR port (task 3.3); the inbox default is the seasonal method (Q-106)."""
        monkeypatch.setattr("ruebert.data.cases.ANOMALY_METHOD", "iqr")

    def test_a_spike_is_found_and_described_in_german(self, settings: Settings, v1: V1Builder) -> None:
        with_long_history(settings)
        v1.article("DGW001").run()
        for year in LONG_HISTORY:
            v1.sales("DGW001", year, 14, 5000 if year == 2025 else 200)
        v1.close()
        rebuild(settings)
        ((case_id, kind, sku, week_start, title, question, actual, expected, _, options),) = cases(
            settings, "kind = 'anomaly'"
        )
        assert case_id == f"anomaly:DGW001:{iso_monday(2025, 14).isoformat()}"
        assert (kind, sku, week_start, question) == ("anomaly", "DGW001", iso_monday(2025, 14), None)
        assert (actual, expected) == (5000.0, 200.0)
        assert title == "Ausreißer KW 14/2025: 5.000 statt üblich 200"
        assert list(options) == ["verwenden", "ausschließen"]  # type: ignore[arg-type]

    def test_with_three_or_four_yearly_values_an_outlier_cannot_be_detected(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        """Why v1 finds nothing on the real data (2023–2026): the outlier inflates its own IQR bound.

        [200, 200, 5000] has Q1 = 200, Q3 = 2,600, upper bound 2,600 + 3 × 2,400 = 9,800; four values give
        an upper bound of exactly 5,000, which a value of 5,000 does not exceed.
        """
        v1.article("DGW001").run()
        for year, qty in ((2023, 200), (2024, 200), (2025, 5000)):
            v1.sales("DGW001", year, 14, qty)
        v1.sales("DGW001", 2026, 14, 200)
        v1.close()
        rebuild(settings)
        assert cases(settings, "kind = 'anomaly'") == []

    def test_a_drop_is_described_as_below(self, settings: Settings, v1: V1Builder) -> None:
        with_long_history(settings)
        v1.article("DGW001").run()
        for year in LONG_HISTORY:
            v1.sales("DGW001", year, 10, 5 if year == 2027 else 1000)
        v1.close()
        rebuild(settings)
        with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
            ((summary, actual),) = con.execute(
                "SELECT summary, actual_qty FROM cases WHERE kind = 'anomaly'"
            ).fetchall()
        assert actual == 5.0
        assert "unter" in str(summary)

    def test_small_deviations_below_the_minimum_delta_are_not_flagged(self, settings: Settings, v1: V1Builder) -> None:
        with_long_history(settings)
        v1.article("DGW001").run()
        for year in LONG_HISTORY:
            v1.sales("DGW001", year, 10, 10 + ANOMALY_MIN_DELTA - 1 if year == 2027 else 10)
        v1.close()
        rebuild(settings)
        assert cases(settings, "kind = 'anomaly'") == []

    def test_weeks_before_2023_are_not_examined(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        for year in range(2014, 2023):
            v1.sales("DGW001", year, 10, 9000 if year == 2018 else 100)
        v1.close()
        rebuild(settings)
        assert cases(settings, "kind = 'anomaly'") == []

    def test_at_least_three_values_per_calendar_week_are_required(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.sales("DGW001", 2024, 10, 100).sales("DGW001", 2025, 10, 9000)
        v1.close()
        rebuild(settings)
        assert cases(settings, "kind = 'anomaly'") == []

    def test_matches_an_independent_reference_on_random_series(self, settings: Settings, v1: V1Builder) -> None:
        with_long_history(settings)
        rng = random.Random(7)
        v1.run()
        series: dict[tuple[str, date], float] = {}
        for number in range(1, 7):
            sku = f"DGW00{number}"
            v1.article(sku)
            for year in LONG_HISTORY:
                for week in range(1, 53):
                    base = 200 + 150 * (1 if 10 <= week <= 22 else 0)
                    qty = float(max(0, round(rng.gauss(base, 40))))
                    if rng.random() < 0.04:
                        qty *= rng.choice((0.0, 0.1, 4.0))  # injected outliers
                    v1.sales(sku, year, week, qty)
                    series[(sku, iso_monday(year, week))] = qty
        v1.close()
        rebuild(settings)
        found = {(str(row[2]), row[3]) for row in cases(settings, "kind = 'anomaly'")}
        expected = reference_anomalies(series)
        assert expected, "the random data must contain anomalies, otherwise this test proves nothing"
        assert found == expected


class TestBulkShipping:
    def test_a_large_booking_without_counter_booking_is_a_case(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2021, 3, 9, 10), -12000, 5)
        v1.close()
        rebuild(settings)
        ((case_id, _, _, week_start, title, question, actual, _, count, options),) = cases(
            settings, "kind = 'bulk_shipping'"
        )
        assert case_id == "bulk_shipping:DGW001:2021-03-08"
        assert week_start == date(2021, 3, 8)
        assert title == "Sammelbuchung ohne Gegenbuchung KW 10/2021: 12.000 Tüten"
        assert (question, actual, count) == ("Q-024", 12000.0, 1)
        assert list(options) == ["Nachfrage", "keine Nachfrage"]  # type: ignore[arg-type]

    def test_a_counter_booking_within_24_hours_makes_it_technical_rule_r020(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        v1.article("DGW001").run()
        when = datetime(2021, 3, 9, 10)
        v1.booking("DGW001", when, -12000, 5)
        v1.booking("DGW001", when + timedelta(hours=23), 12000, 12005, movement_type="Plusbuchung WMS")
        v1.close()
        rebuild(settings)
        assert cases(settings, "kind = 'bulk_shipping'") == []

    def test_a_counter_booking_after_more_than_24_hours_does_not_count(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        when = datetime(2021, 3, 9, 10)
        v1.booking("DGW001", when, -12000, 5)
        v1.booking("DGW001", when + timedelta(hours=25), 12000, 12005, movement_type="Plusbuchung WMS")
        v1.close()
        rebuild(settings)
        assert len(cases(settings, "kind = 'bulk_shipping'")) == 1

    def test_bookings_below_100_units_and_other_movement_types_are_ignored(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2021, 3, 9, 10), -99, 5)
        v1.booking("DGW001", datetime(2021, 3, 9, 11), -5000, 5, movement_type="Warenausgang")
        v1.close()
        rebuild(settings)
        assert cases(settings, "kind = 'bulk_shipping'") == []

    def test_bookings_of_one_week_are_grouped(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2021, 3, 9, 10), -300, 5)
        v1.booking("DGW001", datetime(2021, 3, 11, 10), -700, 5)
        v1.close()
        rebuild(settings)
        ((_, _, _, _, title, _, actual, _, count, _),) = cases(settings, "kind = 'bulk_shipping'")
        assert (actual, count) == (1000.0, 2)
        assert title.endswith("1.000 Tüten")  # type: ignore[union-attr]


class TestOtherFindings:
    def test_fba_bookings_are_summarised_per_article_with_q026(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2020, 2, 1, 10), 500, 500, movement_type="FBA Bestandsänderung")
        v1.booking("DGW001", datetime(2022, 6, 1, 10), -120, 380, movement_type="FBA Bestandsänderung")
        v1.close()
        rebuild(settings)
        ((case_id, _, _, _, title, question, _, _, count, _),) = cases(settings, "kind = 'fba_bookings'")
        assert case_id == "fba_bookings:DGW001:all"
        assert title == "FBA-Buchungen 2020–2022: 2 Buchungen"
        assert (question, count) == ("Q-026", 2)

    def test_negative_stock_is_one_case_per_article_and_year_with_q104(self, settings: Settings, v1: V1Builder) -> None:
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2024, 3, 1, 10), -5, -40)
        v1.booking("DGW001", datetime(2024, 3, 2, 10), -5, -2950)
        v1.booking("DGW001", datetime(2025, 1, 2, 10), -5, -1)
        v1.close()
        rebuild(settings)
        result = cases(settings, "kind = 'negative_stock'")
        assert [row[0] for row in result] == ["negative_stock:DGW001:2024", "negative_stock:DGW001:2025"]
        assert result[0][4] == "Negativer Bestand 2024: bis -2.950 Tüten"
        assert {row[5] for row in result} == {"Q-104"}

    def test_an_active_article_without_forecast_is_a_case_but_special_articles_are_not(
        self, settings: Settings, v1: V1Builder
    ) -> None:
        v1.article("DGW160").article("DGW158").article("DGW00A", is_set=True).article("DGW170", ignored=True).run()
        v1.close()
        rebuild(settings)
        assert [row[2] for row in cases(settings, "kind = 'missing_forecast'")] == ["DGW160"]

    def test_decided_cases_are_never_created_or_removed_here(self, settings: Settings, v1: V1Builder) -> None:
        """Detection is a pure function of the source; deciding happens in the journal (group 4)."""
        v1.article("DGW001").run()
        v1.booking("DGW001", datetime(2021, 3, 9, 10), -500, 5)
        v1.close()
        first = rebuild(settings)
        second = rebuild(settings)
        assert first.table_checksums["cases"] == second.table_checksums["cases"]


class TestSeasonalAnomalies:
    """Default method (Q-106, option B): a week that stands out from its neighbours and from earlier years."""

    def test_a_spike_without_seasonal_precedent_is_a_case_with_q106(self, settings: Settings, v1: V1Builder) -> None:
        for year in (2023, 2024, 2025):
            for week in range(1, 53):
                v1.sales("DGW001", year, week, 1_000.0 if (year, week) == (2025, 30) else 100.0)
        for week in range(1, 21):
            v1.sales("DGW001", 2026, week, 100.0)
        v1.article("DGW001")
        v1.run()
        v1.close()
        rebuild(settings)
        rows = cases(settings, "kind = 'anomaly'")
        assert [r[2] for r in rows] == ["DGW001"]
        assert rows[0][3] == date(2025, 7, 21)  # Monday of KW 30/2025
        assert rows[0][4].startswith("Ausreißer KW 30/2025: 1.000 statt üblich 100")
        assert rows[0][5] == "Q-106"
        assert rows[0][9] == ["verwenden", "ausschließen"]
