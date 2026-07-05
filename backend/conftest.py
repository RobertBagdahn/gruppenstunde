"""Pytest configuration and shared fixtures."""

import pytest
from django.test import Client


@pytest.fixture(autouse=True)
def _clear_retail_section_lookup_cache():
    """Clear the module-level RetailSection lookup cache before every test.

    `supply.services.retail_section_mapping._get_retail_section_by_name` uses
    `lru_cache`, which persists across test cases within the same pytest
    process (each test's DB transaction is rolled back, but the Python-level
    cache is not). Without clearing it, tests can see stale/missing
    RetailSection objects depending on test execution order.
    """
    from supply.services.retail_section_mapping import _get_retail_section_by_name

    _get_retail_section_by_name.cache_clear()
    yield
    _get_retail_section_by_name.cache_clear()


@pytest.fixture
def api_client() -> Client:
    """Django test client for API calls."""
    return Client()


@pytest.fixture
def auth_client(db, django_user_model) -> Client:
    """Authenticated Django test client."""
    user = django_user_model.objects.create_user(
        username="testuser",
        email="test@inspi.dev",
        password="testpass123",
    )
    client = Client()
    client.force_login(user)
    client._user = user  # type: ignore[attr-defined]
    return client


@pytest.fixture
def admin_client(db, django_user_model) -> Client:
    """Admin Django test client."""
    user = django_user_model.objects.create_superuser(
        username="admin",
        email="admin@inspi.dev",
        password="adminpass123",
    )
    client = Client()
    client.force_login(user)
    client._user = user  # type: ignore[attr-defined]
    return client
