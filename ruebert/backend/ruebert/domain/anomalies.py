"""Seasonal sales anomalies (Q-106, option B: chosen by Robert, pending review).

A week is an anomaly when all three hold:
  1. it is at least 3× the highest of its six neighbouring weeks (local spike; at least 1 unit baseline),
  2. it is at least 2× the highest same-season week (±1 week) in other years (not a seasonal peak),
  3. it is at least 50 units above the median of its neighbours.
The same rule flags a collapse: a week below 20 % of both the neighbours and the seasonal reference,
when both are at least 50 units.
Pure functions: the caller passes the weekly series, zero-filled, oldest first.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Final

METHOD_NAME: Final = "seasonal-v1"
NEIGHBOUR_WEEKS: Final = 3
YEARS_BACK: Final = 7
MIN_DELTA: Final = 50.0
SPIKE_FACTOR: Final = 3.0
SEASON_FACTOR: Final = 2.0
COLLAPSE_SHARE: Final = 0.2


@dataclass(frozen=True)
class Anomaly:
    week_start: date
    actual: float
    expected: float  # the seasonal reference (median of the same ISO week in other years)
    direction: str  # "high" or "low"


def _seasonal_reference(values: list[float], index: int) -> list[float]:
    """Largest value of ISO week ±1 in each earlier year, 52 weeks apart; years without full data are skipped.

    The maximum, not the mean: a peak that recurs every year must stay a peak in the reference.
    """
    peaks: list[float] = []
    for back in range(1, YEARS_BACK + 1):
        j = index - 52 * back
        if j - 1 < 0 or j + 1 >= len(values):
            continue
        peaks.append(max(values[j - 1 : j + 2]))
    return peaks


def detect(series: list[tuple[date, float]], since: date) -> list[Anomaly]:
    """Anomalies in `series` from `since` on. The series must be weekly and gap-free (zero-filled)."""
    values = [v for _, v in series]
    found: list[Anomaly] = []
    for index, (week, actual) in enumerate(series):
        if week < since:
            continue
        neighbours = values[max(0, index - NEIGHBOUR_WEEKS) : index] + values[index + 1 : index + 1 + NEIGHBOUR_WEEKS]
        if len(neighbours) < NEIGHBOUR_WEEKS + 1:
            continue
        seasonal = _seasonal_reference(values, index)
        if len(seasonal) < 2:
            continue
        season_median = statistics.median(seasonal)
        neighbour_median = statistics.median(neighbours)
        spike = (
            actual >= SPIKE_FACTOR * max(max(neighbours), 1.0)
            and actual >= SEASON_FACTOR * max(seasonal)
            and actual - neighbour_median >= MIN_DELTA
        )
        collapse = (
            actual <= COLLAPSE_SHARE * neighbour_median
            and neighbour_median >= MIN_DELTA
            and season_median >= MIN_DELTA
            and actual < COLLAPSE_SHARE * season_median
        )
        if spike:
            found.append(Anomaly(week, actual, season_median, "high"))
        elif collapse:
            found.append(Anomaly(week, actual, season_median, "low"))
    return found


def weekly_series(rows: list[tuple[date, float]], first: date, last: date) -> list[tuple[date, float]]:
    """Zero-filled weekly series from `first` to `last` (both Mondays), oldest first."""
    by_week = {week: qty for week, qty in rows}
    weeks: list[tuple[date, float]] = []
    current = first
    while current <= last:
        weeks.append((current, by_week.get(current, 0.0)))
        current += timedelta(weeks=1)
    return weeks
