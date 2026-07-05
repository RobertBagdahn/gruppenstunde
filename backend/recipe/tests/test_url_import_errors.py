"""Tests for differentiated error handling in the enhanced recipe URL import.

Covers `POST /api/recipes/import-from-url-enhanced/` error-code mapping:
- SourceUnreachableError -> IMPORT_SOURCE_UNREACHABLE (422)
- GeminiUnavailableError/GeminiAuthError -> IMPORT_AI_UNAVAILABLE (503)
- NoRecipeFoundError -> IMPORT_NO_RECIPE_FOUND (422)
- unexpected Exception -> INTERNAL_ERROR (500), no detail leak
- unauthenticated -> 403; success -> 200
"""

import json
from unittest.mock import patch

import pytest

from core.services.gemini import GeminiAuthError, GeminiUnavailableError
from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError

ENDPOINT = "/api/recipes/import-from-url-enhanced/"
TARGET = "recipe.services.url_import_service.import_recipe_from_url"


def _post(client):
    return client.post(
        ENDPOINT,
        data=json.dumps({"url": "https://example.com/recipe"}),
        content_type="application/json",
    )


@pytest.mark.django_db
class TestImportFromUrlEnhancedErrors:
    def test_requires_auth(self, api_client):
        resp = _post(api_client)
        assert resp.status_code == 403

    def test_source_unreachable(self, auth_client):
        with patch(TARGET, side_effect=SourceUnreachableError("boom")):
            resp = _post(auth_client)
        assert resp.status_code == 422
        data = resp.json()
        assert data["error_code"] == "IMPORT_SOURCE_UNREACHABLE"
        assert "detail" in data

    @pytest.mark.parametrize("exc", [GeminiUnavailableError(), GeminiAuthError()])
    def test_ai_unavailable(self, auth_client, exc):
        with patch(TARGET, side_effect=exc):
            resp = _post(auth_client)
        assert resp.status_code == 503
        data = resp.json()
        assert data["error_code"] == "IMPORT_AI_UNAVAILABLE"

    def test_no_recipe_found(self, auth_client):
        with patch(TARGET, side_effect=NoRecipeFoundError("boom")):
            resp = _post(auth_client)
        assert resp.status_code == 422
        data = resp.json()
        assert data["error_code"] == "IMPORT_NO_RECIPE_FOUND"

    def test_unexpected_error_no_leak(self, auth_client):
        with patch(TARGET, side_effect=RuntimeError("some secret internal detail")):
            resp = _post(auth_client)
        assert resp.status_code == 500
        data = resp.json()
        assert data["error_code"] == "INTERNAL_ERROR"
        assert "some secret internal detail" not in data["detail"]

    def test_success_returns_200(self, auth_client):
        class FakeResult:
            title = "Testrezept"
            description = ""
            summary = ""
            servings = 4
            preparation_time = None
            execution_time = None
            recipe_type = "warm_meal"
            difficulty = "easy"
            execution_time_choice = "less_30"
            preparation_time_choice = "none"
            scout_level_ids = []
            tag_ids = []
            steps = []
            source_url = "https://example.com/recipe"
            recipe_items = []
            created_ingredients = []

        with patch(TARGET, return_value=FakeResult()):
            resp = _post(auth_client)
        assert resp.status_code == 200
        data = resp.json()
        assert data["recipe_draft"]["title"] == "Testrezept"
