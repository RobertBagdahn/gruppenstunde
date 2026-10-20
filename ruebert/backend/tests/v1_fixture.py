"""Builds a tiny synthetic v1 DuckDB with the same table shapes as the real source (no real data in tests)."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import duckdb

V1_DDL = """
CREATE TABLE products (
    sku VARCHAR, title VARCHAR, created_at DATE, category VARCHAR, subcategory VARCHAR, brand VARCHAR,
    is_set BOOLEAN, ignored BOOLEAN, price DECIMAL(10, 2), sales_decile INTEGER
);
CREATE TABLE weekly_sales_effective (
    sku VARCHAR, week_start TIMESTAMP, year INTEGER, week INTEGER,
    quantity_direct DOUBLE, quantity_from_sets DOUBLE, quantity_total DOUBLE
);
CREATE TABLE inventory_movements (
    id BIGINT, sku VARCHAR, quantity INTEGER, booked_at TIMESTAMP, comment VARCHAR, stock_after INTEGER,
    movement_type VARCHAR
);
CREATE TABLE set_components (set_sku VARCHAR, component_sku VARCHAR, quantity INTEGER);
CREATE TABLE forecast_runs (
    id INTEGER, started_at TIMESTAMP, finished_at TIMESTAMP, duration_s DOUBLE, status VARCHAR,
    sku_count INTEGER, model_counts VARCHAR, error_message VARCHAR
);
CREATE TABLE forecast_all_models (
    run_id INTEGER, sku VARCHAR, week_start TIMESTAMP, model VARCHAR, forecast_qty DOUBLE,
    lower_80 DOUBLE, upper_80 DOUBLE, is_best BOOLEAN, capped BOOLEAN
);
CREATE TABLE forecast_run_metrics (
    id INTEGER, run_id INTEGER, sku VARCHAR, model VARCHAR, mae DOUBLE, mape DOUBLE, rmse DOUBLE,
    cv_samples INTEGER, is_fallback BOOLEAN, coverage DOUBLE, bias DOUBLE, wape DOUBLE
);
CREATE TABLE sim_forecasts (sku VARCHAR, year INTEGER, week INTEGER, model VARCHAR, forecast_qty DOUBLE);
"""


def iso_monday(year: int, week: int) -> date:
    return date.fromisocalendar(year, week, 1)


class V1Builder:
    """Fluent helper: create the file, add rows, call `close()` (rebuilds attach it read-only)."""

    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.con = duckdb.connect(str(path))
        self.con.execute(V1_DDL)
        self._movement_id = 0

    def article(self, sku: str, *, is_set: bool = False, ignored: bool = False, decile: int = 5) -> V1Builder:
        self.con.execute(
            "INSERT INTO products VALUES (?, ?, ?, 'Kräutersamen', 'Test', 'Deine Gartenwelt', ?, ?, 0.99, ?)",
            [sku, f"Artikel {sku}", date(2023, 1, 1), is_set, ignored, decile],
        )
        return self

    def sales(
        self, sku: str, year: int, week: int, qty: float, *, label_shift_days: int = 0, from_sets: float = 0
    ) -> V1Builder:
        """One weekly row. `label_shift_days=7` reproduces v1's one-week-late label of 2026."""
        label = iso_monday(year, week) + timedelta(days=label_shift_days)
        self.con.execute(
            "INSERT INTO weekly_sales_effective VALUES (?, ?, ?, ?, ?, ?, ?)",
            [sku, datetime.combine(label, datetime.min.time()), year, week, qty - from_sets, from_sets, qty],
        )
        return self

    def booking(
        self,
        sku: str,
        when: datetime,
        quantity: int,
        stock_after: int,
        movement_type: str = "Versandprozess WMS",
        booking_id: int | None = None,
    ) -> V1Builder:
        self._movement_id += 1
        self.con.execute(
            "INSERT INTO inventory_movements VALUES (?, ?, ?, ?, '', ?, ?)",
            [booking_id or self._movement_id, sku, quantity, when, stock_after, movement_type],
        )
        return self

    def forecast(
        self,
        sku: str,
        week_start: date,
        qty: float,
        *,
        model: str = "MSTL",
        best: bool = True,
        run_id: int = 25,
        capped: bool = False,
    ) -> V1Builder:
        self.con.execute(
            "INSERT INTO forecast_all_models VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                run_id,
                sku,
                datetime.combine(week_start, datetime.min.time()),
                model,
                qty,
                qty * 0.8,
                qty * 1.2,
                best,
                capped,
            ],
        )
        return self

    def metric(self, row_id: int, sku: str, model: str, wape: float, run_id: int = 25) -> V1Builder:
        self.con.execute(
            "INSERT INTO forecast_run_metrics VALUES (?, ?, ?, ?, 1, 1, 1, 3, false, 0.8, 0, ?)",
            [row_id, run_id, sku, model, wape],
        )
        return self

    def run(self, run_id: int = 25) -> V1Builder:
        started = datetime(2026, 5, 21, 7, 41, tzinfo=UTC).replace(tzinfo=None)
        self.con.execute(
            "INSERT INTO forecast_runs VALUES (?, ?, ?, 176.9, 'success', 2, '{}', NULL)",
            [run_id, started, started + timedelta(minutes=3)],
        )
        return self

    def set_component(self, set_sku: str, component_sku: str, quantity: int = 1) -> V1Builder:
        self.con.execute("INSERT INTO set_components VALUES (?, ?, ?)", [set_sku, component_sku, quantity])
        return self

    def close(self) -> Path:
        self.con.close()
        return self.path
