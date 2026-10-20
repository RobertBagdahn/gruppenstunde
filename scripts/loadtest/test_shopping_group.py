"""Evaluation, report and guard logic of the load probe (no network)."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

import shopping_group as probe


def _samples(**by_label: list[tuple[int, float]]) -> probe.Samples:
    samples = probe.Samples()
    for label, entries in by_label.items():
        for status, seconds in entries:
            samples.add(label, status, seconds)
    return samples


def test_percentile_uses_nearest_rank():
    values = [float(n) for n in range(1, 101)]
    assert probe.percentile(values, 0.5) == 50.0
    assert probe.percentile(values, 0.95) == 95.0
    assert probe.percentile([], 0.95) == 0.0
    assert probe.percentile([2.0], 0.95) == 2.0


def test_passes_without_429_and_within_limits():
    samples = _samples(sync_board=[(200, 0.2)] * 20, detail_full=[(200, 2.5)] * 5)
    assert probe.evaluate(samples, p95_sync=1.0, p95_full=3.0) == []


def test_any_429_fails_even_on_other_endpoints():
    samples = _samples(pulse=[(200, 0.1)] * 50 + [(429, 0.0)], detail_full=[(200, 1.0)])
    failures = probe.evaluate(samples, p95_sync=1.0, p95_full=3.0)
    assert failures == ["1 responses with HTTP 429 (limit 0)"]


def test_names_each_violated_latency_limit():
    samples = _samples(sync_board=[(200, 1.5)] * 10, detail_full=[(200, 4.0)] * 10)
    failures = probe.evaluate(samples, p95_sync=1.0, p95_full=3.0)
    assert any("sync_board" in failure for failure in failures)
    assert any("detail_full" in failure for failure in failures)


def test_unused_endpoint_has_no_threshold():
    samples = _samples(detail_full=[(200, 1.0)] * 5)
    assert probe.evaluate(samples, p95_sync=0.001, p95_full=3.0) == []


def test_cached_plan_calls_have_their_own_limit_and_the_first_call_does_not_count():
    slow_first = _samples(plan_first=[(200, 5.0)], plan_cached=[(200, 0.05)] * 20)
    assert probe.evaluate(slow_first, p95_sync=1.0, p95_full=3.0, p95_plan=0.3) == []

    slow_cache = _samples(plan_first=[(200, 1.0)], plan_cached=[(200, 0.5)] * 20)
    failures = probe.evaluate(slow_cache, p95_sync=1.0, p95_full=3.0, p95_plan=0.3)
    assert len(failures) == 1 and "plan_cached" in failures[0]


def test_planner_flags_are_optional_and_default_to_the_spec_limit():
    args = probe.parse_args(["--invite-token", "abc"])
    assert args.event_slug is None and args.p95_plan == 0.3
    args = probe.parse_args(["--invite-token", "abc", "--event-slug", "lager"])
    assert args.event_slug == "lager"


def test_report_lists_statuses():
    report = probe.format_report(_samples(pulse=[(200, 0.1), (200, 0.2), (429, 0.0)]))
    assert "pulse" in report
    assert "200×2, 429×1" in report


@pytest.mark.parametrize(
    ("url", "production"),
    [
        ("http://localhost:8000", False),
        ("http://127.0.0.1:8000", False),
        ("http://[::1]:8000", False),
        ("http://food.localhost:8000", False),
        ("https://essensplan.app", True),
        ("https://inspi-backend-148679246533.europe-west1.run.app", True),
    ],
)
def test_production_detection(url: str, production: bool):
    assert probe.is_production_url(url) is production


def test_production_url_requires_confirmation(capsys):
    with pytest.raises(SystemExit):
        probe.parse_args(["--invite-token", "t", "--base-url", "https://essensplan.app"])
    assert "--confirm-production" in capsys.readouterr().err
    args = probe.parse_args(["--invite-token", "t", "--base-url", "https://essensplan.app", "--confirm-production"])
    assert args.devices == 6 and args.pulse_interval == 5.0 and args.check_interval == 10.0 and args.duration == 600.0


def test_mode_defaults_to_board_and_accepts_detail():
    assert probe.parse_args(["--invite-token", "t"]).mode == "board"
    assert probe.parse_args(["--invite-token", "t", "--mode", "detail"]).mode == "detail"
