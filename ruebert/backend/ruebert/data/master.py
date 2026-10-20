"""Copy master data, sales, sets and forecast run 25 from the v1 source (attached as `v1`, read-only)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import duckdb

FORECAST_RUN_ID = 25

# Daniel: these run outside the regular bulk order (DGWADV/DGWADV2 are not in the v1 master data).
SPECIAL_SKUS: tuple[str, ...] = ("DGW158", "DGWADV", "DGWADV2")

# ISO Monday of v1's (year, week) fields: ISO week 1 contains 4 January.
_ISO_MONDAY = "(CAST(date_trunc('week', make_date(year, 1, 4)) AS DATE) + (week - 1) * 7)"


@dataclass(frozen=True)
class CalendarCorrection:
    """v1 labels all weeks of 2026 one week late: `week_start` = ISO Monday + 7 days while (year, week) are right.

    Evidence (checked 17.10.2026 against the bookings): the raw shipping total of Monday 11.05.2026 – Sunday
    17.05.2026 (16,912 units) sits in the v1 row labelled 18.05.2026 together with year 2026 / week 20; weeks up
    to 2025 match the ISO Monday exactly, and the label jumps from 22.12.2025 to 05.01.2026, leaving 29.12.2025 empty.
    Forecasts continue the sales labels (first forecast week 25.05.2026), so those of articles with a shifted
    sales series carry the same shift.
    """

    shift_from: date | None  # first v1 label that is shifted; None when v1 is aligned everywhere
    days: int
    sales_rows: int
    forecast_rows: int


def detect_calendar_shift(con: duckdb.DuckDBPyConnection) -> date | None:
    row = con.execute(
        f"""
        SELECT min(CAST(week_start AS DATE))
        FROM v1.weekly_sales_effective
        WHERE CAST(week_start AS DATE) = {_ISO_MONDAY} + 7
        """
    ).fetchone()
    return row[0] if row and row[0] else None


def copy_master_data(con: duckdb.DuckDBPyConnection, reference_date: date) -> tuple[dict[str, int], CalendarCorrection]:
    """Fill the master and forecast tables. Returns the source rows left out by reason and the calendar correction."""
    specials = list(SPECIAL_SKUS)
    con.execute(
        """
        INSERT INTO articles
        SELECT sku, title, category, subcategory, brand,
               coalesce(is_set, false), coalesce(ignored, false),
               list_contains(?, sku),
               price, created_at, coalesce(sales_decile, 0)
        FROM v1.products
        """,
        [specials],
    )

    shift_from = detect_calendar_shift(con)
    # DATE 'infinity' keeps the CASE total: nothing is shifted when v1 is aligned.
    boundary = shift_from or date.max
    corrected = (
        "CASE WHEN CAST({col} AS DATE) >= CAST(? AS DATE) THEN CAST({col} AS DATE) - 7 ELSE CAST({col} AS DATE) END"
    )

    # Only weeks that end before the reference Monday; unknown articles stay out (counted below).
    con.execute(
        f"""
        INSERT INTO weekly_sales
        SELECT w.sku, {corrected.format(col="w.week_start")}, CAST(w.week_start AS DATE),
               w.quantity_direct, w.quantity_from_sets, w.quantity_total
        FROM v1.weekly_sales_effective w
        JOIN articles a USING (sku)
        WHERE {corrected.format(col="w.week_start")} < ?
        """,
        [boundary, boundary, reference_date],
    )

    con.execute("INSERT INTO set_components SELECT set_sku, component_sku, quantity FROM v1.set_components")

    con.execute(
        """
        INSERT INTO forecast_runs
        SELECT id, started_at, finished_at, status, sku_count, model_counts
        FROM v1.forecast_runs WHERE id = ?
        """,
        [FORECAST_RUN_ID],
    )

    # Forecast labels continue the last sales label of their article, so only articles whose sales series
    # ends in the shifted domain carry the shift. Dormant articles (e.g. DGW909, last sale 2024) are counted
    # forward from an aligned label and stay as they are.
    con.execute(
        """
        INSERT INTO forecasts
        WITH shifted_articles AS (
            SELECT sku FROM v1.weekly_sales_effective
            GROUP BY sku HAVING max(CAST(week_start AS DATE)) >= CAST(? AS DATE)
        )
        SELECT f.run_id, f.sku,
               CASE WHEN f.sku IN (SELECT sku FROM shifted_articles) THEN CAST(f.week_start AS DATE) - 7
                    ELSE CAST(f.week_start AS DATE) END,
               CAST(f.week_start AS DATE), f.model,
               f.forecast_qty, f.lower_80, f.upper_80, coalesce(f.is_best, false), coalesce(f.capped, false)
        FROM v1.forecast_all_models f
        WHERE f.run_id = ?
        """,
        [boundary, FORECAST_RUN_ID],
    )

    # v1 wrote some (sku, model) pairs twice in one run; the last written row (highest id) wins.
    con.execute(
        """
        INSERT INTO forecast_metrics
        SELECT run_id, sku, model, mae, mape, rmse, wape, bias, coverage, cv_samples, is_fallback
        FROM v1.forecast_run_metrics
        WHERE run_id = ?
        QUALIFY row_number() OVER (PARTITION BY sku, model ORDER BY id DESC) = 1
        """,
        [FORECAST_RUN_ID],
    )

    # Keyed by (year, week), which v1 stores correctly for 2026 – no calendar correction needed.
    con.execute("INSERT INTO backtest_forecasts SELECT sku, year, week, model, forecast_qty FROM v1.sim_forecasts")

    correction = CalendarCorrection(
        shift_from=shift_from,
        days=7 if shift_from else 0,
        sales_rows=_scalar(con, "SELECT count(*) FROM weekly_sales WHERE week_start <> v1_week_start"),
        forecast_rows=_scalar(con, "SELECT count(*) FROM forecasts WHERE week_start <> v1_week_start"),
    )
    return _left_out(con, reference_date, boundary), correction


def _scalar(con: duckdb.DuckDBPyConnection, sql: str, params: list[object] | None = None) -> int:
    row = con.execute(sql, params or []).fetchone()
    return int(row[0]) if row else 0


def _left_out(con: duckdb.DuckDBPyConnection, reference_date: date, boundary: date) -> dict[str, int]:
    return {
        "weekly_sales_unknown_article": _scalar(
            con, "SELECT count(*) FROM v1.weekly_sales_effective WHERE sku NOT IN (SELECT sku FROM articles)"
        ),
        "weekly_sales_from_reference_week": _scalar(
            con,
            """
            SELECT count(*) FROM v1.weekly_sales_effective
            WHERE CASE WHEN CAST(week_start AS DATE) >= ? THEN CAST(week_start AS DATE) - 7
                       ELSE CAST(week_start AS DATE) END >= ?
            """,
            [boundary, reference_date],
        ),
        "movements_unknown_article_skus": _scalar(
            con, "SELECT count(DISTINCT sku) FROM v1.inventory_movements WHERE sku NOT IN (SELECT sku FROM articles)"
        ),
        "forecast_metrics_duplicates": _scalar(
            con,
            "SELECT count(*) - count(DISTINCT (sku, model)) FROM v1.forecast_run_metrics WHERE run_id = ?",
            [FORECAST_RUN_ID],
        ),
        "special_skus_missing_in_master": _scalar(
            con,
            "SELECT count(*) FROM unnest(?) AS t(sku) WHERE sku NOT IN (SELECT sku FROM articles)",
            [list(SPECIAL_SKUS)],
        ),
    }
