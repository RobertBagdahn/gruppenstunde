"""Shared fixtures for recipe tests."""

from collections.abc import Iterator

import pytest
from django.db import connection


@pytest.fixture
def legacy_recipe_portions(db) -> Iterator[None]:
    """Allow rows that violate the ``portions = 1`` check constraint.

    Only the legacy normalization paths (``normalize_recipe_servings`` and the
    0013 migration guard) still need recipes with ``portions != 1``. The test
    database is SQLite, which can skip CHECK constraints per connection.
    """
    assert connection.vendor == "sqlite"
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA ignore_check_constraints = ON")
    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA ignore_check_constraints = OFF")
