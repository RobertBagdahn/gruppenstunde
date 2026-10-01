"""Plan-Check texts use German date and number formats."""

import pytest

from planner.services.plan_check import _german_date, _german_euro


@pytest.mark.parametrize(
    ("iso", "expected"),
    [("2026-12-12", "12.12.2026"), ("2026-01-05", "05.01.2026")],
)
def test_german_date(iso, expected):
    assert _german_date(iso) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [(4.37, "4,37 €"), (0.37, "0,37 €"), (4, "4,00 €"), (1234.5, "1.234,50 €")],
)
def test_german_euro(value, expected):
    assert _german_euro(value) == expected
