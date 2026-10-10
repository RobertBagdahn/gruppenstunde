"""Conservative connection accounting for the Cloud Run backend."""


def calculate_max_application_connections(
    *,
    max_instances: int,
    request_concurrency: int,
    gunicorn_workers: int,
    gunicorn_threads: int,
    background_workers_per_process: int,
    connection_max_age_seconds: int,
) -> int:
    """Calculate the maximum DB sessions held by request and background work."""
    if (
        min(
            max_instances,
            request_concurrency,
            gunicorn_workers,
            gunicorn_threads,
        )
        < 1
    ):
        raise ValueError("Instance, concurrency, and Gunicorn limits must be positive")
    if background_workers_per_process < 0 or connection_max_age_seconds < 0:
        raise ValueError("Worker counts and connection age cannot be negative")

    gunicorn_request_slots = gunicorn_workers * gunicorn_threads
    request_connections = (
        gunicorn_request_slots if connection_max_age_seconds > 0 else min(request_concurrency, gunicorn_request_slots)
    )
    background_connections = gunicorn_workers * background_workers_per_process
    return max_instances * (request_connections + background_connections)
