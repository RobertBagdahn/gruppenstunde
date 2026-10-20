"""A small but complete built world for API tests: one article per colour, a special article and a set.

The derived store is built once per test session and copied into each test's temporary directory.
"""

from __future__ import annotations

import itertools
import shutil
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Final

from ruebert.data.build import rebuild, report_path_for
from ruebert.settings import Settings

from .v1_fixture import V1Builder

# sku → (stock, forecast per week) – with the defaults (12 + 8 weeks, 130 weeks) these give:
STOCKS: Final = {
    "DGW001": (250, 100),  # runs out in week 3 → red
    "DGW002": (1_600, 100),  # week 16 → yellow
    "DGW003": (1_000_000, 100),  # overstock → blue
    "DGW004": (3_030, 100),  # week 31 → green
    "DGW158": (10, 100),  # special article, would be red
}

_cache: Path | None = None


def _populate(v1: V1Builder) -> None:
    row_ids = itertools.count(1)
    for sku in STOCKS:
        v1.article(sku)
    v1.article("SET001", is_set=True)
    v1.set_component("SET001", "DGW001", 2)
    v1.run()
    for sku, (stock, per_week) in STOCKS.items():
        for week in range(1, 53):
            v1.sales(sku, 2025, week, 90 + week % 5)
        for week in range(1, 21):
            v1.sales(sku, 2026, week, 95, label_shift_days=7)
        for offset in range(110):  # forecast continues the shifted labels: first week 25.05.2026
            v1.forecast(sku, date(2026, 5, 25) + timedelta(weeks=offset), float(per_week))
        v1.booking(sku, datetime(2026, 5, 15, 9), -1, stock)
        v1.metric(next(row_ids), sku, "MSTL", 0.42)
        v1.metric(next(row_ids), sku, "LightGBM-LT", 0.37)
    v1.close()


def build_world(settings: Settings, v1: V1Builder) -> None:
    """Make `settings.derived_db_path` contain the world (a copy of one shared build)."""
    global _cache
    if _cache is None:
        folder = Path(tempfile.mkdtemp(prefix="ruebert-world-"))
        shared = settings.model_copy(
            update={
                "v1_duckdb_path": folder / "source.duckdb",
                "derived_db_path": folder / "ruebert.duckdb",
                "journal_dir": folder / "journal",
            }
        )
        _populate(V1Builder(shared.v1_duckdb_path))
        rebuild(shared)
        _cache = shared.derived_db_path
    settings.derived_db_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(_cache, settings.derived_db_path)
    shutil.copy(report_path_for(_cache), report_path_for(settings.derived_db_path))
    v1.close()
