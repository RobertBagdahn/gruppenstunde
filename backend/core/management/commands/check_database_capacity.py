"""Report whether the deployed backend fits the connected database budget."""

from __future__ import annotations

import os
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from core.services.database_capacity import calculate_max_application_connections


def _positive_setting(name: str, default: int, *, allow_zero: bool = False) -> int:
    raw_value = os.environ.get(name, str(default))
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise CommandError(f"{name} must be an integer") from exc
    lower_bound = 0 if allow_zero else 1
    if value < lower_bound:
        raise CommandError(f"{name} must be at least {lower_bound}")
    return value


class Command(BaseCommand):
    help = "Check Cloud Run's maximum DB connection budget against PostgreSQL settings."

    def handle(self, *args: Any, **options: Any) -> None:
        if connection.vendor != "postgresql":
            raise CommandError("Database capacity checks require PostgreSQL.")

        database_config = settings.DATABASES["default"]
        connection_max_age = int(database_config.get("CONN_MAX_AGE", 0))
        maximum_application_connections = calculate_max_application_connections(
            max_instances=_positive_setting("BACKEND_MAX_INSTANCES", 2),
            request_concurrency=_positive_setting("BACKEND_CONCURRENCY", 2),
            gunicorn_workers=_positive_setting("GUNICORN_WORKERS", 2),
            gunicorn_threads=_positive_setting("GUNICORN_THREADS", 4),
            background_workers_per_process=_positive_setting("BACKGROUND_WORKERS_PER_PROCESS", 1, allow_zero=True),
            connection_max_age_seconds=connection_max_age,
        )
        operator_reserve = _positive_setting("DB_CONNECTION_RESERVE", 8, allow_zero=True)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    current_setting('max_connections')::integer,
                    current_setting('superuser_reserved_connections')::integer,
                    COALESCE(NULLIF(current_setting('reserved_connections', true), ''), '0')::integer,
                    (SELECT count(*)::integer FROM pg_stat_activity WHERE datname = current_database())
                """
            )
            max_connections, superuser_reserved, role_reserved, active_connections = cursor.fetchone()

        application_capacity = max_connections - superuser_reserved - role_reserved - operator_reserve
        self.stdout.write(
            "Database capacity: "
            f"max={max_connections}, reserved={superuser_reserved + role_reserved + operator_reserve}, "
            f"application_budget={application_capacity}, "
            f"configured_application_max={maximum_application_connections}, "
            f"active_connections={active_connections}"
        )
        if maximum_application_connections > application_capacity:
            raise CommandError(
                "Configured Cloud Run/Gunicorn concurrency exceeds the available database connection budget."
            )
        if active_connections >= application_capacity:
            self.stderr.write(
                self.style.WARNING("Active database connections are already at or above the application budget.")
            )
        self.stdout.write(self.style.SUCCESS("Database connection budget is safe."))
