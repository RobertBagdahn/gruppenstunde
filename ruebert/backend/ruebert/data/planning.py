"""Assembles what the pages show: colours, order plan and the journal's effect on them (read-only)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import duckdb

from ruebert.domain import parameters
from ruebert.domain.ordering import is_allowed_quantity
from ruebert.domain.planner import OrderPlan, PlanInput, build_order_plan
from ruebert.domain.traffic_light import ForecastWeek, TrafficLight, classify
from ruebert.journal import Entry, current_entries


@dataclass(frozen=True)
class Article:
    sku: str
    title: str
    category: str | None
    brand: str | None
    is_set: bool
    is_special: bool
    turnover_class: int | None
    stock: float


@dataclass(frozen=True)
class World:
    reference_date: date
    values: dict[str, parameters.Value]
    articles: dict[str, Article]
    inputs: dict[str, PlanInput]
    lights: dict[str, TrafficLight]
    plan: OrderPlan
    quantity_overrides: dict[str, Entry]
    decisions: dict[str, Entry]  # queue decisions of the start page, by sku

    def final_quantity(self, sku: str) -> int | None:
        """The suggestion, or the user's journaled quantity if there is one."""
        override = self.quantity_overrides.get(sku)
        if override is not None and isinstance(override.value, int | float):
            return int(override.value)
        row = next((r for r in self.plan.rows if r.sku == sku), None)
        return row.quantity if row else None


def load_articles(con: duckdb.DuckDBPyConnection) -> dict[str, Article]:
    rows = con.execute(
        "SELECT a.sku, a.title, a.category, a.brand, a.is_set, a.is_special, a.turnover_class, COALESCE(s.stock, 0) "
        "FROM articles a LEFT JOIN stock s USING (sku) WHERE NOT a.ignored ORDER BY a.sku"
    ).fetchall()
    return {r[0]: Article(r[0], r[1], r[2], r[3], bool(r[4]), bool(r[5]), r[6], float(r[7])) for r in rows}


def load_world(
    con: duckdb.DuckDBPyConnection,
    entries: list[Entry],
    values: dict[str, parameters.Value],
    reference_date: date,
    tranche: int | None = None,
    target: date | None = None,
) -> World:
    articles = load_articles(con)
    forecast: dict[str, list[ForecastWeek]] = {}
    for sku, week_start, qty in con.execute(
        "SELECT sku, week_start, forecast_qty FROM forecasts WHERE is_best ORDER BY sku, week_start"
    ).fetchall():
        forecast.setdefault(sku, []).append(ForecastWeek(week_start, float(qty)))
    inputs = {sku: PlanInput(sku, a.stock, forecast[sku], a.is_set) for sku, a in articles.items() if sku in forecast}
    light_settings = parameters.light_settings(values)
    order_settings = parameters.order_settings(values)
    plan = build_order_plan(
        list(inputs.values()),
        reference_date,
        target or parameters.target_week(values),
        tranche,
        order_settings,
        int(values["tranche_size"]),
    )
    suggestions = {r.sku: r.quantity for r in plan.rows}
    lights = {
        sku: classify(sku, i.stock, i.forecast, reference_date, light_settings, suggestions.get(sku))
        for sku, i in inputs.items()
        if not i.is_set
    }
    quantities = {
        s.removeprefix("quantity:"): e
        for s, e in current_entries([e for e in entries if e.type == "quantity"]).items()
        if e.choice == "ändern"
        and isinstance(e.value, int | float)
        and is_allowed_quantity(int(e.value), order_settings)
    }
    decisions = {
        s.removeprefix("order:"): e
        for s, e in current_entries([e for e in entries if e.type == "order"]).items()
        if s.startswith("order:") and e.choice in ("annehmen", "zurückstellen")
    }
    return World(reference_date, values, articles, inputs, lights, plan, quantities, decisions)
