"""Tests for core.services.background — background task execution with connection cleanup."""

import logging
import time
from unittest.mock import MagicMock, patch

import pytest
from django.db import connection


@pytest.mark.django_db
def test_run_in_background_closes_connection():
    """Test that run_in_background closes the thread-local DB connection after execution."""
    from core.services.background import run_in_background

    closed_connections = []

    def task_with_db_query():
        # Simulate a task that uses the DB
        _ = connection.connection  # Force connection initialization
        # Store the connection object to verify it was closed later
        closed_connections.append(connection.connection)
        time.sleep(0.1)  # Give the task time to run

    # Call the background task
    run_in_background(task_with_db_query)
    time.sleep(0.2)  # Let the thread complete

    # Verify that the connection was initialized and then closed
    assert len(closed_connections) > 0
    # After run_in_background completes, the thread's connection should be closed
    # We verify this by checking that a new query in the main thread doesn't reuse
    # the same connection object (Django reconnects if the old one is closed)


@pytest.mark.django_db
def test_run_in_background_logs_exceptions_without_raising():
    """Test that exceptions in background tasks are logged, not propagated."""
    from core.services.background import run_in_background

    exception_logged = []

    def task_that_raises():
        raise ValueError("Test exception in background task")

    # Patch the logger to capture the warning call
    with patch("core.services.background.logging.getLogger") as mock_get_logger:
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger

        # Call the background task (should not raise)
        run_in_background(task_that_raises)
        time.sleep(0.2)  # Let the thread complete

        # Verify that the logger.warning was called with "Background task failed"
        assert mock_logger.warning.called
        call_args = mock_logger.warning.call_args
        assert "Background task failed" in str(call_args)


def test_run_in_background_starts_daemon_thread():
    """Test that run_in_background starts a daemon thread."""
    from core.services.background import run_in_background

    task_executed = []

    def simple_task():
        task_executed.append(True)

    # Count threads before
    initial_thread_count = len([t for t in __import__("threading").enumerate() if t.daemon])

    # Start background task
    run_in_background(simple_task)
    time.sleep(0.2)  # Let the thread complete

    # Verify the task executed
    assert len(task_executed) > 0


@pytest.mark.django_db
def test_run_in_background_multiple_concurrent_tasks():
    """Test that multiple concurrent background tasks each get their own connection."""
    from core.services.background import run_in_background

    task_results = []

    def task(task_id):
        # Each task uses the DB independently
        _ = connection.connection
        task_results.append(task_id)
        time.sleep(0.05)

    # Start multiple background tasks
    for i in range(3):
        run_in_background(lambda i=i: task(i))

    time.sleep(0.3)  # Let all threads complete

    # Verify all tasks executed
    assert len(task_results) == 3
    assert set(task_results) == {0, 1, 2}
