"""Sample data for flows without real data yet (third-party brand, channels, events). Always `is_sample`."""

from __future__ import annotations

import math
import random
import zlib
from datetime import date, timedelta
from pathlib import Path

import duckdb
import yaml
from pydantic import BaseModel, Field, model_validator

from ruebert.data.sql import insert_rows
from ruebert.settings import BACKEND_ROOT

SAMPLE_FILE = BACKEND_ROOT / "fixtures" / "sample.yaml"
FORECAST_WEEKS = 104


class SampleArticle(BaseModel):
    sku: str
    title: str
    category: str
    purchase_price_eur: float = Field(gt=0)
    packaging_unit: int = Field(ge=1)
    stock: int = Field(ge=0)
    weekly_demand: float = Field(ge=0)


class SampleSupplier(BaseModel):
    id: str
    name: str
    lead_time_weeks: int = Field(ge=1)
    min_order_value_eur: float = Field(ge=0)
    articles: list[SampleArticle]


class SampleChannels(BaseModel):
    base_shares: dict[str, float]
    jitter: float = Field(ge=0, lt=1)

    @model_validator(mode="after")
    def _shares_sum_to_one(self) -> SampleChannels:
        if abs(sum(self.base_shares.values()) - 1) > 1e-9:
            raise ValueError("Kanalanteile müssen sich zu 1 summieren.")
        return self


class SampleEvent(BaseModel):
    id: str
    date: date
    kind: str
    title: str
    sku: str | None


class SampleSpec(BaseModel):
    seed: int
    suppliers: list[SampleSupplier]
    channels: SampleChannels
    events: list[SampleEvent]


def load_spec(path: Path = SAMPLE_FILE) -> SampleSpec:
    return SampleSpec.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))


def season_factor(week_start: date) -> float:
    """Seed demand peaks in spring (around ISO week 13); stays above 0.25 off-season."""
    week = week_start.isocalendar().week
    return 0.25 + 1.75 * math.exp(-(((week - 13) / 7) ** 2))


def _rng(seed: int, key: str) -> random.Random:
    # crc32 instead of hash(): Python salts str hashes per process, which would break determinism.
    return random.Random(seed * 1_000_003 + zlib.crc32(key.encode()))


def channel_shares(spec: SampleChannels, seed: int, sku: str) -> dict[str, float]:
    rng = _rng(seed, f"channels:{sku}")
    raw = {name: share * (1 + rng.uniform(-spec.jitter, spec.jitter)) for name, share in spec.base_shares.items()}
    total = sum(raw.values())
    shares = {name: round(value / total, 4) for name, value in raw.items()}
    largest = max(shares, key=lambda name: shares[name])
    shares[largest] = round(shares[largest] + 1 - sum(shares.values()), 4)
    return shares


def build_samples(con: duckdb.DuckDBPyConnection, reference_date: date, path: Path = SAMPLE_FILE) -> SampleSpec:
    spec = load_spec(path)
    first_week = reference_date - timedelta(days=reference_date.weekday())

    for supplier in spec.suppliers:
        con.execute(
            "INSERT INTO sample_suppliers VALUES (?, ?, ?, ?, true)",
            [supplier.id, supplier.name, supplier.lead_time_weeks, supplier.min_order_value_eur],
        )
        for article in supplier.articles:
            con.execute(
                "INSERT INTO sample_supplier_articles VALUES (?, ?, ?, ?, ?, ?, ?, true)",
                [
                    article.sku,
                    supplier.id,
                    article.title,
                    article.category,
                    article.purchase_price_eur,
                    article.packaging_unit,
                    article.stock,
                ],
            )
            rng = _rng(spec.seed, f"forecast:{article.sku}")
            rows: list[list[object]] = []
            for offset in range(FORECAST_WEEKS):
                week = first_week + timedelta(weeks=offset)
                qty = article.weekly_demand * season_factor(week) * rng.uniform(0.85, 1.15)
                rows.append([article.sku, week, round(qty, 1)])
            insert_rows(con, "INSERT INTO sample_supplier_forecasts VALUES (?, ?, ?, true)", rows)

    skus = [row[0] for row in con.execute("SELECT sku FROM articles WHERE NOT is_set ORDER BY sku").fetchall()]
    share_rows: list[list[object]] = []
    for sku in skus:
        for channel, share in channel_shares(spec.channels, spec.seed, sku).items():
            share_rows.append([sku, channel, share])
    insert_rows(con, "INSERT INTO sample_channel_shares VALUES (?, ?, ?, true)", share_rows)

    for event in spec.events:
        con.execute(
            "INSERT INTO sample_events VALUES (?, ?, ?, ?, ?, true)",
            [event.id, event.date, event.kind, event.title, event.sku],
        )
    return spec
