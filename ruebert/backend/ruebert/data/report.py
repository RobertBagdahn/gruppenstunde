"""Rebuild comparison with v1: stock per article and traffic-light counts under the v1 rules.

The v1 colours are the reference. The colours of the new traffic light (order window, spec
`order-traffic-light`) are added to this report together with that logic.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date

import duckdb

from ruebert.domain.traffic_light import ForecastWeek, LightSettings, classify

# legacy/src/config.py: ALERT_RED_WEEKS, ALERT_YELLOW_WEEKS, ALERT_BLUE_WEEKS and the 30-unit buffer.
V1_RED_WEEKS = 13
V1_YELLOW_WEEKS = 25
V1_BLUE_WEEKS = 100
V1_MIN_REMAINING = 30


@dataclass(frozen=True)
class StockDifference:
    sku: str
    v1_stock: int
    new_stock: int | None
    reason: str


@dataclass
class ComparisonReport:
    reference_date: str
    articles_compared: int
    stock_differences: list[StockDifference] = field(default_factory=list[StockDifference])
    v1_colour_counts: dict[str, int] = field(default_factory=dict[str, int])
    colour_counts: dict[str, int] = field(default_factory=dict[str, int])  # order-window traffic light, defaults
    articles_without_forecast: list[str] = field(default_factory=list[str])

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def v1_colour(coverage_weeks: int) -> str:
    """The v1 rule of `bestell_ampel.py`: blue above 100 weeks, red below 13, yellow below 25, else green."""
    if coverage_weeks > V1_BLUE_WEEKS:
        return "blue"
    if coverage_weeks < V1_RED_WEEKS:
        return "red"
    if coverage_weeks < V1_YELLOW_WEEKS:
        return "yellow"
    return "green"


def v1_coverage_weeks(stock: int, weekly_forecast: list[float], horizon_weeks: int) -> int:
    """v1: subtract weekly demand until fewer than 30 units remain; no depletion → whole horizon."""
    remaining = float(stock)
    for index, demand in enumerate(weekly_forecast):
        remaining -= demand
        if remaining < V1_MIN_REMAINING:
            return index + 1
    return len(weekly_forecast) if weekly_forecast else horizon_weeks


def build_report(con: duckdb.DuckDBPyConnection, reference_date: date) -> ComparisonReport:
    """Compare the derived store with the v1 computation (v1 attached read-only as `v1`)."""
    v1_rows = con.execute(
        """
        SELECT sku, greatest(stock_after, 0) FROM (
            SELECT m.sku, m.stock_after,
                   row_number() OVER (PARTITION BY m.sku ORDER BY m.booked_at DESC, m.id DESC) AS rank
            FROM v1.inventory_movements m
            WHERE m.sku IN (SELECT sku FROM v1.products WHERE NOT is_set)
              AND m.booked_at < CAST(? AS TIMESTAMP)
        ) WHERE rank = 1 ORDER BY sku
        """,
        [reference_date],
    ).fetchall()
    new_stock = {sku: int(stock) for sku, stock in con.execute("SELECT sku, stock FROM stock").fetchall()}

    report = ComparisonReport(reference_date=reference_date.isoformat(), articles_compared=len(v1_rows))
    for sku, v1_stock in v1_rows:
        ours = new_stock.get(sku)
        if ours is None:
            report.stock_differences.append(StockDifference(sku, int(v1_stock), None, "fehlt im neuen Stand"))
        elif ours != int(v1_stock):
            report.stock_differences.append(StockDifference(sku, int(v1_stock), ours, "anderer Wert"))

    report.v1_colour_counts, report.articles_without_forecast = _v1_colours(con, reference_date)
    report.colour_counts = _colours(con, reference_date)
    return report


def _v1_colours(con: duckdb.DuckDBPyConnection, reference_date: date) -> tuple[dict[str, int], list[str]]:
    products = con.execute(
        "SELECT sku FROM articles WHERE NOT is_set AND NOT ignored AND NOT is_special "
        "AND sku IN (SELECT sku FROM stock) ORDER BY sku"
    ).fetchall()
    stock = {sku: int(value) for sku, value in con.execute("SELECT sku, stock FROM stock").fetchall()}
    weekly: dict[str, list[float]] = {}
    for sku, qty in con.execute(
        """
        SELECT sku, forecast_qty FROM forecasts
        WHERE is_best AND week_start >= date_trunc('week', CAST(? AS DATE))
        ORDER BY sku, week_start
        """,
        [reference_date],
    ).fetchall():
        weekly.setdefault(sku, []).append(float(qty))

    horizon = max((len(values) for values in weekly.values()), default=104)
    counts = {"red": 0, "yellow": 0, "green": 0, "blue": 0}
    without_forecast: list[str] = []
    for (sku,) in products:
        if sku not in weekly:
            # v1 gave articles without forecast the whole horizon as coverage, i.e. blue; the new
            # traffic light shows them as a case instead of a colour.
            without_forecast.append(sku)
        counts[v1_colour(v1_coverage_weeks(stock[sku], weekly.get(sku, []), horizon))] += 1
    return counts, without_forecast


def _colours(con: duckdb.DuckDBPyConnection, reference_date: date) -> dict[str, int]:
    """Colours of the order-window traffic light with default settings (order-traffic-light spec)."""
    forecast: dict[str, list[ForecastWeek]] = {}
    for sku, week_start, qty in con.execute(
        "SELECT sku, week_start, forecast_qty FROM forecasts WHERE is_best ORDER BY sku, week_start"
    ).fetchall():
        forecast.setdefault(sku, []).append(ForecastWeek(week_start, float(qty)))
    counts = {"red": 0, "yellow": 0, "green": 0, "blue": 0}
    for sku, stock in con.execute(
        "SELECT a.sku, s.stock FROM articles a JOIN stock s USING (sku) "
        "WHERE NOT a.is_set AND NOT a.ignored AND NOT a.is_special ORDER BY a.sku"
    ).fetchall():
        if sku in forecast:
            counts[classify(sku, float(stock), forecast[sku], reference_date, LightSettings()).colour] += 1
    return counts
