"""Seasonal anomaly rule (Q-106 option B): spike, collapse, seasonal peak is not an anomaly, data gaps."""

from __future__ import annotations

from datetime import date, timedelta

from ruebert.domain.anomalies import detect, weekly_series

START = date(2021, 1, 4)  # Monday


def series(values: dict[int, float], weeks: int = 260) -> list[tuple[date, float]]:
    """Flat 100 per week unless overridden by index."""
    return [(START + timedelta(weeks=i), values.get(i, 100.0)) for i in range(weeks)]


def test_a_local_spike_without_seasonal_precedent_is_found() -> None:
    found = detect(series({200: 1_000.0}), since=date(2023, 1, 1))
    assert [(a.week_start, a.direction) for a in found] == [(START + timedelta(weeks=200), "high")]


def test_a_seasonal_peak_that_recurs_every_year_is_not_an_anomaly() -> None:
    peaks = {i: 1_000.0 for i in range(10, 260, 52)}  # the same week every year
    found = detect(series(peaks), since=date(2021, 1, 1))
    assert not any(a.week_start in {START + timedelta(weeks=i) for i in peaks} for a in found)


def test_a_collapse_is_flagged_low() -> None:
    found = detect(series({200: 5.0}), since=date(2023, 1, 1))
    assert [a.direction for a in found] == ["low"]


def test_small_numbers_below_the_minimum_delta_are_ignored() -> None:
    assert detect(series({200: 120.0}), since=date(2023, 1, 1)) == []  # only 20 above the neighbours


def test_weeks_before_the_start_date_are_not_checked() -> None:
    assert detect(series({50: 1_000.0}), since=date(2023, 1, 1)) == []


def test_weekly_series_fills_missing_weeks_with_zero() -> None:
    rows = [(START, 5.0), (START + timedelta(weeks=2), 7.0)]
    filled = weekly_series(rows, START, START + timedelta(weeks=2))
    assert filled == [(START, 5.0), (START + timedelta(weeks=1), 0.0), (START + timedelta(weeks=2), 7.0)]
