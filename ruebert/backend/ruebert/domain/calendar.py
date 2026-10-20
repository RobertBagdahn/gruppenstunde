"""Fixed chart markers: year change, Easter and 20 March (spec article-views)."""

from __future__ import annotations

from datetime import date, timedelta


def easter_sunday(year: int) -> date:
    """Western Easter (anonymous Gregorian algorithm)."""
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    weekday_offset = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * weekday_offset) // 451
    month, day = divmod(h + weekday_offset - 7 * m + 114, 31)
    return date(year, month, day + 1)


def markers(start: date, end: date) -> list[tuple[date, str, str]]:
    """(date, key, label) of all markers in [start, end], oldest first."""
    found: list[tuple[date, str, str]] = []
    for year in range(start.year, end.year + 1):
        found.append((date(year, 1, 1), "year_change", "Jahreswechsel"))
        found.append((easter_sunday(year), "easter", "Ostern"))
        found.append((date(year, 3, 20), "march_20", "20.03."))
    return sorted(m for m in found if start - timedelta(days=0) <= m[0] <= end)
