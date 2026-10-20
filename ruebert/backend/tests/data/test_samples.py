"""Sample data (Beispieldaten): deterministic, always flagged, shaped like the intended flows."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from typing import Any

import duckdb
import pytest
import yaml
from pydantic import ValidationError
from ruebert.data.build import rebuild
from ruebert.data.samples import (
    FORECAST_WEEKS,
    SAMPLE_FILE,
    SampleChannels,
    channel_shares,
    load_spec,
    season_factor,
)
from ruebert.settings import Settings

from ..v1_fixture import V1Builder

SAMPLE_TABLES = (
    "sample_suppliers",
    "sample_supplier_articles",
    "sample_supplier_forecasts",
    "sample_channel_shares",
    "sample_events",
)


@pytest.fixture
def built(settings: Settings, v1: V1Builder) -> Settings:
    v1.article("DGW001").article("DGW002").article("DGW00A", is_set=True).run().close()
    rebuild(settings)
    return settings


def rows(settings: Settings, sql: str) -> list[tuple[Any, ...]]:
    with duckdb.connect(str(settings.derived_db_path), read_only=True) as con:
        return con.execute(sql).fetchall()


class TestFixtureFile:
    def test_the_file_is_valid_and_announces_that_it_is_not_real_data(self) -> None:
        assert SAMPLE_FILE.read_text(encoding="utf-8").startswith("# BEISPIELDATEN")
        spec = load_spec()
        assert len(spec.suppliers) >= 4
        assert spec.events

    def test_sku_ids_cannot_be_mistaken_for_real_articles(self) -> None:
        spec = load_spec()
        skus = [article.sku for supplier in spec.suppliers for article in supplier.articles]
        assert len(skus) == len(set(skus))
        assert all(sku.startswith("BSP-") for sku in skus)
        assert all(supplier.id.startswith("BSP-") for supplier in spec.suppliers)
        assert all(supplier.name.startswith("Beispiel") for supplier in spec.suppliers)

    def test_minimum_order_value_is_100_euro_net_purchase_price_for_every_supplier(self) -> None:
        assert {supplier.min_order_value_eur for supplier in load_spec().suppliers} == {100}

    def test_channel_shares_must_sum_to_one(self, tmp_path: Path) -> None:
        with pytest.raises(ValidationError, match="summieren"):
            SampleChannels(base_shares={"Amazon": 0.9, "Shop": 0.2}, jitter=0.1)

    def test_a_broken_file_is_rejected(self, tmp_path: Path) -> None:
        broken = tmp_path / "sample.yaml"
        broken.write_text(yaml.safe_dump({"seed": 1, "suppliers": [{"id": "X"}], "channels": {}, "events": []}))
        with pytest.raises(ValidationError):
            load_spec(broken)


class TestStoredSamples:
    @pytest.mark.parametrize("table", SAMPLE_TABLES)
    def test_every_row_is_flagged_as_sample(self, built: Settings, table: str) -> None:
        total, flagged = rows(built, f"SELECT count(*), count(*) FILTER (WHERE is_sample) FROM {table}")[0]
        assert total > 0
        assert flagged == total

    def test_rebuilds_produce_identical_samples(self, built: Settings) -> None:
        first = rebuild(built)
        second = rebuild(built)
        for table in SAMPLE_TABLES:
            assert first.table_checksums[table] == second.table_checksums[table]

    def test_channel_shares_sum_to_one_per_article_and_exclude_sets(self, built: Settings) -> None:
        result = rows(built, "SELECT sku, sum(share) FROM sample_channel_shares GROUP BY sku ORDER BY sku")
        assert [sku for sku, _ in result] == ["DGW001", "DGW002"]
        assert all(total == pytest.approx(1.0, abs=1e-9) for _, total in result)

    def test_amazon_dominates_like_in_the_wiki_80_to_90_percent(self, built: Settings) -> None:
        shares = dict(rows(built, "SELECT channel, avg(share) FROM sample_channel_shares GROUP BY channel"))  # type: ignore[arg-type]
        assert 0.75 <= float(shares["Amazon"]) <= 0.92  # type: ignore[arg-type]
        assert max(shares, key=lambda name: float(shares[name])) == "Amazon"  # type: ignore[arg-type]

    def test_each_supplier_article_has_two_years_of_forecast_from_the_reference_monday(self, built: Settings) -> None:
        result = rows(
            built, "SELECT sku, count(*), min(week_start), max(week_start) FROM sample_supplier_forecasts GROUP BY sku"
        )
        assert len(result) == sum(len(s.articles) for s in load_spec().suppliers)
        for _, count, first, last in result:
            assert count == FORECAST_WEEKS
            assert first == built.reference_date
            assert last == built.reference_date + timedelta(weeks=FORECAST_WEEKS - 1)

    def test_events_lie_before_the_reference_date(self, built: Settings) -> None:
        latest = rows(built, "SELECT max(event_date) FROM sample_events")[0][0]
        assert latest <= built.reference_date  # type: ignore[operator]

    def test_the_forecast_peaks_in_spring(self, built: Settings) -> None:
        result = dict(
            rows(
                built,
                "SELECT week(week_start), avg(forecast_qty) FROM sample_supplier_forecasts "
                "WHERE sku = 'BSP-2001' GROUP BY 1",
            )  # type: ignore[arg-type]
        )
        assert result[13] > 3 * result[40]  # type: ignore[operator]


class TestPureFunctions:
    def test_season_factor_is_highest_in_week_13_and_never_below_the_floor(self) -> None:
        by_week = {week: season_factor(date.fromisocalendar(2026, week, 1)) for week in range(1, 53)}
        assert max(by_week, key=lambda week: by_week[week]) == 13
        assert min(by_week.values()) >= 0.25

    def test_channel_shares_are_stable_for_the_same_seed_and_article(self) -> None:
        spec = load_spec().channels
        assert channel_shares(spec, 42, "DGW001") == channel_shares(spec, 42, "DGW001")
        assert channel_shares(spec, 42, "DGW001") != channel_shares(spec, 42, "DGW002")
        assert channel_shares(spec, 42, "DGW001") != channel_shares(spec, 43, "DGW001")

    def test_channel_shares_sum_to_exactly_one_after_rounding(self) -> None:
        spec = load_spec().channels
        for number in range(200):
            assert sum(channel_shares(spec, 1, f"DGW{number:03d}").values()) == pytest.approx(1.0, abs=1e-12)
