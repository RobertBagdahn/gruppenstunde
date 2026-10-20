"""Reads the derived store into the plain inputs the domain functions need (read-only)."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import duckdb

from ruebert.domain.planner import PlanInput
from ruebert.domain.traffic_light import ForecastWeek


def load_plan_inputs(derived_db_path: Path) -> list[PlanInput]:
    """Active articles with stock and the selected (is_best) forecast; articles without forecast are left out.

    Articles without a forecast appear as the case "ohne Prognose" instead of getting a colour.
    """
    with duckdb.connect(str(derived_db_path), read_only=True) as con:
        forecast: dict[str, list[ForecastWeek]] = defaultdict(list)
        for sku, week_start, quantity in con.execute(
            "SELECT sku, week_start, forecast_qty FROM forecasts WHERE is_best ORDER BY sku, week_start"
        ).fetchall():
            forecast[sku].append(ForecastWeek(week_start, float(quantity)))
        rows = con.execute(
            "SELECT a.sku, a.is_set, COALESCE(s.stock, 0) FROM articles a LEFT JOIN stock s USING (sku) "
            "WHERE NOT a.ignored ORDER BY a.sku"
        ).fetchall()
    return [PlanInput(sku, float(stock), forecast[sku], bool(is_set)) for sku, is_set, stock in rows if sku in forecast]
