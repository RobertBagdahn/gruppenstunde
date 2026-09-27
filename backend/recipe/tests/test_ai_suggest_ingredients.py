"""Tests for AI suggest ingredients endpoint and service."""

from unittest.mock import MagicMock, patch

import pytest

from content.choices import ContentStatus
from recipe.models import Recipe, RecipeItem
from recipe.services.ai_ingredients_service import (
    AiIngredientSuggestion,
    MatchedIngredientResult,
    RecipeAiIngredientsService,
    is_duplicate_ingredient_name,
    is_trivial_ingredient_name,
)
from supply.models import Ingredient, MeasuringUnit, Portion


@pytest.fixture
def gramm_unit(db):
    return MeasuringUnit.objects.create(name="g", unit="g", quantity=1.0)


@pytest.fixture
def ingredient_nudeln(db, gramm_unit):
    return Ingredient.objects.create(name="Fusilli trocken", slug="fusilli-trocken", status="verified")


@pytest.fixture
def portion_nudeln(db, ingredient_nudeln, gramm_unit):
    return Portion.objects.create(
        ingredient=ingredient_nudeln,
        measuring_unit=gramm_unit,
        name="100g Fusilli",
        quantity=100.0,
        weight_g=100.0,
        rank=1,
    )


@pytest.fixture
def draft_recipe(db, auth_client):
    user = auth_client._user
    recipe = Recipe.objects.create(
        title="Nudelgericht",
        status=ContentStatus.DRAFT,
        created_by=user,
    )
    recipe.authors.add(user)
    return recipe


@pytest.mark.django_db
class TestAiSuggestIngredientsEndpoint:
    def test_unauthenticated_returns_403(self, client, draft_recipe):
        resp = client.post(f"/api/recipes/{draft_recipe.id}/ai-suggest-ingredients/")
        assert resp.status_code == 403

    def test_other_user_draft_returns_404_or_403(self, client, django_user_model, draft_recipe):
        other = django_user_model.objects.create_user(username="other", password="pw")
        client.force_login(other)
        resp = client.post(f"/api/recipes/{draft_recipe.id}/ai-suggest-ingredients/")
        assert resp.status_code in (403, 404)

    def test_suggest_returns_list_with_portions(self, auth_client, draft_recipe, portion_nudeln):
        mock_result = [
            MatchedIngredientResult(
                ingredient_id=portion_nudeln.ingredient_id,
                ingredient_name="Fusilli trocken",
                portion_id=portion_nudeln.id,
                portion_name="100g Fusilli",
                quantity=1.25,
                measuring_unit_id=portion_nudeln.measuring_unit_id,
                measuring_unit_name="g",
                is_new_ingredient=False,
                note="",
            )
        ]
        with patch.object(
            RecipeAiIngredientsService,
            "get_full_suggestions",
            return_value=(mock_result, "interaction-id"),
        ):
            resp = auth_client.post(f"/api/recipes/{draft_recipe.id}/ai-suggest-ingredients/")
            assert resp.status_code == 200
            data = resp.json()
            items = data["items"] if isinstance(data, dict) else data
            assert len(items) == 1
            assert items[0]["ingredient_id"] == portion_nudeln.ingredient_id
            assert items[0]["portion_id"] == portion_nudeln.id
            assert items[0]["quantity"] == 1.25
            assert data["ai_interaction_id"] == "interaction-id"

    def test_suggest_503_when_service_returns_none(self, auth_client, draft_recipe):
        with patch.object(RecipeAiIngredientsService, "get_full_suggestions", return_value=(None, None)):
            resp = auth_client.post(f"/api/recipes/{draft_recipe.id}/ai-suggest-ingredients/")
            assert resp.status_code == 503
            assert "KI-Vorschläge konnten nicht generiert werden" in resp.json().get("detail", "")


@pytest.mark.django_db
class TestAiIngredientsServiceDeduplication:
    def test_match_ingredients_reuses_existing_slug(self, ingredient_nudeln):
        """When an ingredient with the exact slug already exists, it must be reused without UniqueViolation."""
        service = RecipeAiIngredientsService()
        suggestions = [
            AiIngredientSuggestion(name="Fusilli trocken", estimated_grams=125.0),
        ]
        results = service.match_ingredients(suggestions)
        assert len(results) == 1
        result = results[0]
        assert result.ingredient_id == ingredient_nudeln.id
        assert result.is_new_ingredient is False

    def test_match_ingredients_creates_unique_slug_when_collision(self, ingredient_nudeln):
        """When a new ingredient collides on slug, unique slug with counter is generated."""
        service = RecipeAiIngredientsService()
        # Mock matcher to return needs_review and no match
        match_mock = MagicMock(
            ingredient_id=None,
            name="Fusilli trocken anders",
            is_new=False,
            note="",
            needs_review=True,
            candidates=[],
        )
        with patch("recipe.services.ingredient_matcher.IngredientMatcher.match", return_value=match_mock):
            suggestions = [
                AiIngredientSuggestion(name="Fusilli trocken anders", estimated_grams=125.0),
            ]
            results = service.match_ingredients(suggestions)
            assert len(results) == 1
            result = results[0]
            assert result.is_new_ingredient is True
            new_ing = Ingredient.objects.get(id=result.ingredient_id)
            assert new_ing.slug.startswith("fusilli-trocken-anders")

    def test_match_ingredients_preview_does_not_create_draft(self, db):
        """Preview mode must not persist an Ingredient for unresolved names."""
        service = RecipeAiIngredientsService()
        match_mock = MagicMock(
            ingredient_id=None,
            name="Spezialgewürz",
            is_new=False,
            note="",
            needs_review=True,
            candidates=[],
        )
        with patch("recipe.services.ingredient_matcher.IngredientMatcher.match", return_value=match_mock):
            suggestions = [
                AiIngredientSuggestion(name="Spezialgewürz", estimated_grams=10.0),
            ]
            results = service.match_ingredients(suggestions, create_missing=False)
            assert len(results) == 1
            result = results[0]
            assert result.ingredient_id is None
            assert result.is_new_ingredient is True
            assert not Ingredient.objects.filter(name="Spezialgewürz").exists()


class TestDuplicateIngredientNames:
    EXISTING = ["Langkornreis trocken", "Speisezwiebel frisch", "Olivenöl", "Jodsalz"]

    @pytest.mark.parametrize(
        "name",
        ["Reis trocken", "Zwiebel frisch", "Olivenöl", "Rapsöl", "Meersalz", "Zwiebeln"],
    )
    def test_detects_duplicates_and_variants(self, name):
        assert is_duplicate_ingredient_name(name, self.EXISTING) is True

    @pytest.mark.parametrize(
        "name",
        ["Zucchini frisch", "Schwarzer Pfeffer gemahlen", "Sojasauce", "Frühlingszwiebel frisch", "Karotte frisch"],
    )
    def test_keeps_new_ingredients(self, name):
        assert is_duplicate_ingredient_name(name, self.EXISTING) is False

    def test_trivial_water_is_detected(self):
        assert is_trivial_ingredient_name("Trinkwasser aus der Leitung") is True
        assert is_trivial_ingredient_name("Leitungswasser") is True
        assert is_trivial_ingredient_name("Zucchini frisch") is False


@pytest.mark.django_db
class TestSuggestPromptWithExistingIngredients:
    def test_prompt_lists_existing_ingredients_and_forbids_repeats(self, draft_recipe, portion_nudeln):
        RecipeItem.objects.create(recipe=draft_recipe, portion=portion_nudeln, quantity=1.25)
        prompt = RecipeAiIngredientsService()._build_suggest_prompt(draft_recipe)
        assert "BEREITS diese Zutaten" in prompt
        assert "- Fusilli trocken" in prompt
        assert "Leitungswasser, Trinkwasser" in prompt
        assert "vollständige Zutatenliste" not in prompt

    def test_prompt_without_items_requests_full_list(self, draft_recipe):
        prompt = RecipeAiIngredientsService()._build_suggest_prompt(draft_recipe)
        assert "vollständige Zutatenliste" in prompt
        assert "BEREITS" not in prompt

    def test_full_suggestions_filter_variants_and_water(self, draft_recipe, portion_nudeln):
        RecipeItem.objects.create(recipe=draft_recipe, portion=portion_nudeln, quantity=1.25)
        service = RecipeAiIngredientsService()
        matched = [
            MatchedIngredientResult(None, name, None, None, 10.0, None, None, is_new_ingredient=True)
            for name in ["Fusilli", "Trinkwasser aus der Leitung", "Zucchini frisch"]
        ]
        with (
            patch.object(service, "suggest_ingredients", return_value=(MagicMock(items=[1]), "iid")),
            patch.object(service, "match_ingredients", return_value=matched),
            patch.object(service, "assign_portions", side_effect=lambda m, **_: m),
        ):
            results, interaction_id = service.get_full_suggestions(draft_recipe)
        assert [r.ingredient_name for r in results] == ["Zucchini frisch"]
        assert interaction_id == "iid"
