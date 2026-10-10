"""The connection-budget command is read-only and compares runtime limits."""

from io import StringIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError


def _mock_postgres_connection(
    max_connections: int,
    superuser_reserved: int,
    role_reserved: int,
    active: int,
) -> MagicMock:
    connection = MagicMock()
    connection.vendor = "postgresql"
    cursor = MagicMock()
    cursor.fetchone.return_value = (max_connections, superuser_reserved, role_reserved, active)
    connection.cursor.return_value.__enter__.return_value = cursor
    return connection


def test_capacity_command_reports_a_safe_application_budget() -> None:
    output = StringIO()
    connection = _mock_postgres_connection(25, 3, 0, 6)

    with patch("core.management.commands.check_database_capacity.connection", connection):
        call_command("check_database_capacity", stdout=output)

    report = output.getvalue()
    assert "application_budget=14" in report
    assert "configured_application_max=8" in report
    assert "Database connection budget is safe." in report


def test_capacity_command_fails_when_the_configured_budget_exceeds_postgres() -> None:
    connection = _mock_postgres_connection(15, 3, 0, 6)

    with patch("core.management.commands.check_database_capacity.connection", connection):
        with pytest.raises(CommandError, match="exceeds the available database connection budget"):
            call_command("check_database_capacity", stdout=StringIO())
