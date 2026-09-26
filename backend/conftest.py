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


@pytest.fixture(autouse=True)
def _block_real_gemini_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail any test that would reach the real Gemini/Vertex AI client.

    All Gemini traffic goes through `core.services.gemini._get_client` or
    `_get_image_client`, so blocking them catches unpatched `gemini_call`,
    `gemini_image_call` and `gemini_embed` usage regardless of how callers
    imported those functions. `pytest.fail` raises a BaseException, so
    service-level `except Exception` fallbacks cannot swallow it.

    Tests that need a fake client patch `_get_client` themselves; their patch
    is applied after this fixture and takes precedence.
    """
    from core.services import gemini

    def _fail(*args: object, **kwargs: object) -> None:
        pytest.fail(
            "Real Gemini call attempted in test. Patch the caller's `gemini_call`/"
            "`gemini_embed` or `core.services.gemini._get_client`.",
            pytrace=True,
        )

    monkeypatch.setattr(gemini, "_get_client", _fail)
    monkeypatch.setattr(gemini, "_get_image_client", _fail)


@pytest.fixture
def gemini_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    """Simulate a disabled Gemini client (no GOOGLE_CLOUD_PROJECT).

    `gemini_call` / `gemini_image_call` return `(None, interaction_id)` and
    `gemini_embed` returns `None`, exercising the services' graceful
    degradation paths without any network access.
    """
    from core.services import gemini

    monkeypatch.setattr(gemini, "_get_client", lambda: None)
    monkeypatch.setattr(gemini, "_get_image_client", lambda: None)


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
