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
            image_url = ""
            recipe_items = []
            created_ingredients = []

        with patch(TARGET, return_value=FakeResult()):
            resp = _post(auth_client)
        assert resp.status_code == 200
        data = resp.json()
        assert data["recipe_draft"]["title"] == "Testrezept"

    def test_invalid_url_returns_classified_error(self, auth_client):
        with patch(
            "recipe.services.url_import_service.import_recipe_from_url", side_effect=ValueError("Ungültige Rezept-URL")
        ):
            resp = _post(auth_client)

        assert resp.status_code == 422
        data = resp.json()
        assert data["error_code"] == "IMPORT_INVALID_URL"
        assert "URL" in data["detail"]

    def test_success_returns_complete_preview(self, auth_client):
        class FakeItem:
            ingredient_id = 12
            ingredient_name = "Weizenmehl"
            quantity = 500
            measuring_unit_id = 3
            measuring_unit_name = "Gramm"
            note = ""
            is_new_ingredient = False
            portion_id = 44

        class FakeIngredient:
            id = 12
            name = "Weizenmehl"
            aliases = ["Mehl"]
            nutri_class = 1
            name_warning = None

        class CompleteResult:
            title = "Pfannkuchen"
            description = "Teig aus Mehl und Eiern."
            summary = "Ein einfaches Rezept."
            servings = 4
            preparation_time = 10
            execution_time = 20
            recipe_type = "warm_meal"
            difficulty = "easy"
            execution_time_choice = "less_30"
            preparation_time_choice = "less_15"
            scout_level_ids = []
            tag_ids = []
            steps = ["Teig verrühren.", "Ausbacken."]
            source_url = "https://www.chefkoch.de/rezepte/test"
            image_url = "https://example.test/pfannkuchen.jpg"
            recipe_items = [FakeItem()]
            created_ingredients = [FakeIngredient()]

        with patch("recipe.services.url_import_service.import_recipe_from_url", return_value=CompleteResult()):
            resp = auth_client.post(
                ENDPOINT,
                data=json.dumps({"url": "https://www.chefkoch.de/rezepte/test"}),
                content_type="application/json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["recipe_draft"]["servings"] == 4
        assert data["recipe_draft"]["steps"] == ["Teig verrühren.", "Ausbacken."]
        assert data["recipe_items"][0]["portion_id"] == 44
        assert data["created_ingredients"][0]["aliases"] == ["Mehl"]

    def test_success_allows_missing_servings_for_manual_context_selection(self, auth_client):
        class ResultWithoutServings:
            title = "Unklare Mengen"
            description = ""
            summary = ""
            servings = None
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
            image_url = ""
            recipe_items = []
            created_ingredients = []

        with patch(TARGET, return_value=ResultWithoutServings()):
            resp = _post(auth_client)

        assert resp.status_code == 200
        assert resp.json()["recipe_draft"]["servings"] is None

    def test_import_recipe_skips_existing_alias_without_integrity_error(self, admin_user):
        from recipe.services.import_service import ImportedIngredient, ImportedRecipe
        from recipe.services.url_import_service import (
            GeminiIngredientMatch,
            GeminiNewIngredient,
            GeminiRecipeExtraction,
            import_recipe_from_url,
        )
        from supply.models import Ingredient, IngredientAlias

        existing_ing = Ingredient.objects.create(name="Existierendes Mehl", slug="existierendes-mehl")
        IngredientAlias.objects.create(ingredient=existing_ing, name="mehl")

        fake_parsed = ImportedRecipe(
            title="Pfannkuchen",
            ingredients=[ImportedIngredient(name="Exotische Frucht")],
            steps=["Alles mischen."],
            source_url="https://www.chefkoch.de/rezepte/test",
        )

        fake_gemini_meta = GeminiRecipeExtraction(
            title="Pfannkuchen",
            ingredients=[
                GeminiIngredientMatch(
                    original_name="Exotische Frucht",
                    quantity=200,
                    unit="g",
                    estimated_portion_weight_g=200,
                    new_ingredient=GeminiNewIngredient(
                        name="Neues Spezialobst",
                        aliases=["mehl", "spezialobst"],
                    ),
                )
            ],
            steps=["Alles mischen."],
        )

        with (
            patch("recipe.services.import_service.import_from_url", return_value=fake_parsed),
            patch("recipe.services.url_import_service._call_gemini_for_metadata", return_value=fake_gemini_meta),
            patch("recipe.services.ingredient_matcher.IngredientMatcher._stage_embedding", return_value=None),
        ):
            result = import_recipe_from_url("https://www.chefkoch.de/rezepte/test", admin_user)

        assert result.title == "Pfannkuchen"
        assert len(result.created_ingredients) == 1
        created = result.created_ingredients[0]
        assert "mehl" not in created.aliases
