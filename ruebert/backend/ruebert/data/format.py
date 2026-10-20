"""German formatting for texts generated during the rebuild (titles and summaries of cases)."""

from __future__ import annotations

from datetime import date


def format_int(value: float | int) -> str:
    """15000 → "15.000"; rounds half away from zero like the frontend's Intl formatter."""
    rounded = int(abs(value) + 0.5) * (1 if value >= 0 else -1)
    return f"{rounded:,}".replace(",", ".")


def format_date(value: date) -> str:
    return value.strftime("%d.%m.%Y")


def week_label(value: date) -> str:
    """ISO week: date(2024, 4, 1) → "KW 14/2024"."""
    year, week, _ = value.isocalendar()
    return f"KW {week}/{year}"
