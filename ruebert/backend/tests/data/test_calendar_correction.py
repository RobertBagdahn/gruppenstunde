"""v1 labels all weeks of 2026 one week late; the rebuild restores the ISO Monday (see master.py)."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from itertools import pairwise
from typing import Any

import duckdb
from ruebert.data.build import rebuild, report_path_for
from ruebert.settings import Settings

from ..v1_fixture import V1Builder, iso_monday


def shifted_source(v1: V1Builder) -> None:
    """DGW001: sales 2025 aligned, 2026 labelled +7 days, forecast continues the shifted labels.
    DGW909: dormant (last sale 2024), forecast counted forward from an aligned label."""
    v1.article("DGW001").article("DGW909")
    for week in range(40, 53):
        v1.sales("DGW001", 2025, week, 100)
    for week in range(1, 21):
        v1.sales("DGW001", 2026, week, 100, label_shift_days=7)
    v1.sales("DGW909", 2024, 20, 50)
    for offset in range(5):
        v1.forecast("DGW001", date(2026, 5, 25) + timedelta(weeks=offset), 130.0)
        v1.forecast("DGW909", date(2024, 6, 3) + timedelta(weeks=offset), 10.0)
    v1.run().close()


def rows(settings: Settings, sql: str) -> list[tuple[Any, ...]]:
    with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
        return con.execute(sql).fetchall()


def test_2026_weeks_get_the_iso_monday_and_keep_the_v1_label_for_lineage(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    rebuild(settings)
    result = rows(
        settings,
        "SELECT week_start, v1_week_start FROM weekly_sales WHERE sku = 'DGW001' "
        "AND week_start IN ('2026-01-05', '2026-05-11') ORDER BY 1",
    )
    assert result == [(date(2026, 1, 5), date(2026, 1, 12)), (date(2026, 5, 11), date(2026, 5, 18))]
    assert iso_monday(2026, 20) == date(2026, 5, 11)


def test_the_series_has_no_hole_at_the_year_change(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    rebuild(settings)
    weeks = [r[0] for r in rows(settings, "SELECT week_start FROM weekly_sales WHERE sku = 'DGW001' ORDER BY 1")]
    assert date(2025, 12, 29) in weeks  # v1 left it empty (label jumped from 22.12. to 05.01.)
    assert all((later - earlier).days == 7 for earlier, later in pairwise(weeks))


def test_the_last_history_week_is_the_week_before_the_reference_monday(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    rebuild(settings)
    ((latest,),) = rows(settings, "SELECT max(week_start) FROM weekly_sales")
    assert latest == date(2026, 5, 11)
    assert latest + timedelta(days=7) == settings.reference_date


def test_forecast_of_an_active_article_starts_on_the_reference_monday(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    rebuild(settings)
    ((first, v1_first),) = rows(
        settings, "SELECT min(week_start), min(v1_week_start) FROM forecasts WHERE sku = 'DGW001'"
    )
    assert first == settings.reference_date
    assert v1_first == date(2026, 5, 25)


def test_forecast_of_a_dormant_article_is_not_shifted(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    rebuild(settings)
    result = rows(
        settings, "SELECT week_start = v1_week_start, count(*) FROM forecasts WHERE sku = 'DGW909' GROUP BY 1"
    )
    assert result == [(True, 5)]


def test_values_are_untouched_only_labels_move(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    rebuild(settings)
    ((total_new,),) = rows(settings, "SELECT sum(quantity_total) FROM weekly_sales WHERE sku = 'DGW001'")
    with duckdb.connect(str(settings.v1_duckdb_path), read_only=True) as con:
        ((total_v1,),) = con.execute(
            "SELECT sum(quantity_total) FROM weekly_sales_effective WHERE sku = 'DGW001'"
        ).fetchall()
    assert total_new == total_v1


def test_report_documents_the_correction(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    rebuild(settings)
    correction = json.loads(report_path_for(settings.derived_db_path).read_text(encoding="utf-8"))[
        "calendar_correction"
    ]
    assert correction["shift_from"] == "2026-01-05"
    assert correction["days"] == 7
    assert correction["sales_rows"] == 20
    assert correction["forecast_rows"] == 5


def test_a_source_without_shifted_labels_is_taken_over_as_it_is(settings: Settings, v1: V1Builder) -> None:
    v1.article("DGW001")
    for week in range(1, 21):
        v1.sales("DGW001", 2026, week, 100)  # aligned labels
    v1.forecast("DGW001", date(2026, 5, 18), 130.0)
    v1.run().close()
    result = rebuild(settings)
    assert result.calendar_correction.shift_from is None
    assert result.calendar_correction.days == 0
    assert rows(settings, "SELECT count(*) FROM weekly_sales WHERE week_start <> v1_week_start") == [(0,)]
    assert rows(settings, "SELECT count(*) FROM forecasts WHERE week_start <> v1_week_start") == [(0,)]


def test_bookings_and_cases_use_real_dates_not_week_labels(settings: Settings, v1: V1Builder) -> None:
    shifted_source(v1)
    v1_con = duckdb.connect(str(settings.v1_duckdb_path))
    v1_con.execute(
        "INSERT INTO inventory_movements VALUES (1, 'DGW001', -500, ?, '', 900, 'Versandprozess WMS')",
        [datetime(2026, 5, 13, 10, 0)],
    )
    v1_con.close()
    rebuild(settings)
    ((week_start, title),) = rows(settings, "SELECT week_start, title FROM cases WHERE kind = 'bulk_shipping'")
    assert week_start == date(2026, 5, 11)
    assert "KW 20/2026" in str(title)
