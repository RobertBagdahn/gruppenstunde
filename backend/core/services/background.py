"""Background task execution utilities for fire-and-forget operations."""

import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from django.db import connection

# Bounded thread pool prevents DB connection exhaustion on small DB instances
# (e.g. Cloud SQL db-f1-micro) when many post_save signals fire simultaneously.
_EXECUTOR = ThreadPoolExecutor(max_workers=3, thread_name_prefix="bg-task")


def run_in_background(fn: Callable[[], None]) -> None:
    """Run fn in a bounded background thread pool with its own short-lived DB connection.

    Closes the connection explicitly when fn returns (or raises), instead of
    relying on CONN_MAX_AGE to eventually reclaim it. Must be called from
    within transaction.on_commit(...) if the callback reads data written by
    the just-committed transaction.

    Args:
        fn: Callable that takes no arguments and returns None. Should represent
            a unit of background work (e.g., updating an embedding, computing a score).

    Example:
        @receiver(post_save, sender=Ingredient)
        def update_score(sender, instance, **kwargs):
            def _do_update():
                new_score = calculate_score(instance)
                instance.score = new_score
                instance.save(update_fields=['score'])

            transaction.on_commit(lambda: run_in_background(_do_update))
    """

    def _wrapper():
        try:
            fn()
        except Exception:
            logging.getLogger(__name__).warning(
                "Background task failed",
                exc_info=True,
            )
        finally:
            # Close the thread-local DB connection immediately to avoid
            # holding it for CONN_MAX_AGE (typically 60s in production),
            # which can exhaust the connection pool on high-concurrency operations
            connection.close()

    _EXECUTOR.submit(_wrapper)
