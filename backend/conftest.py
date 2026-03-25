"""Pytest configuration and shared fixtures."""

import pytest
from django.test import Client


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
