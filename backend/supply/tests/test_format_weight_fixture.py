"""Runs the shared `format_weight_cases.json` fixture against the backend
implementation. The frontend's `lib/format.test.ts` runs the same fixture
(task group 5) so both implementations are provably identical, not just
individually self-consistent.
"""

import json
from pathlib import Path

import pytest

from supply.utils import format_exact_weight, format_weight

_FIXTURE_PATH = Path(__file__).parent / "fixtures" / "format_weight_cases.json"
_CASES = json.loads(_FIXTURE_PATH.read_text())


@pytest.mark.parametrize("case", _CASES["format_weight"], ids=lambda c: f"{c['grams']}g")
def test_format_weight_matches_shared_fixture(case):
    assert format_weight(case["grams"]) == case["expected"]


@pytest.mark.parametrize("case", _CASES["format_exact_weight"], ids=lambda c: f"{c['grams']}g")
def test_format_exact_weight_matches_shared_fixture(case):
    assert format_exact_weight(case["grams"]) == case["expected"]
