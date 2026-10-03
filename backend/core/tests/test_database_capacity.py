"""Connection budgets must include Cloud Run, Gunicorn, and background workers."""

import pytest

from core.services.database_capacity import calculate_max_application_connections


def test_short_lived_connections_are_bounded_by_cloud_run_concurrency() -> None:
    assert (
        calculate_max_application_connections(
            max_instances=2,
            request_concurrency=2,
            gunicorn_workers=2,
            gunicorn_threads=4,
            background_workers_per_process=1,
            connection_max_age_seconds=0,
        )
        == 8
    )


def test_persistent_connections_reserve_a_session_for_each_worker_thread() -> None:
    assert (
        calculate_max_application_connections(
            max_instances=10,
            request_concurrency=10,
            gunicorn_workers=2,
            gunicorn_threads=4,
            background_workers_per_process=3,
            connection_max_age_seconds=60,
        )
        == 140
    )


def test_connection_budget_rejects_invalid_limits() -> None:
    with pytest.raises(ValueError, match="must be positive"):
        calculate_max_application_connections(
            max_instances=0,
            request_concurrency=4,
            gunicorn_workers=2,
            gunicorn_threads=4,
            background_workers_per_process=1,
            connection_max_age_seconds=0,
        )
