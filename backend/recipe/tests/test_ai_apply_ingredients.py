"""Tests for AI apply ingredients endpoint duplicate protection."""

import json

import pytest

from content.choices import ContentStatus
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, MeasuringUnit, Portion


@pytest.fixture
def gramm_unit(db):
    return MeasuringUnit.objects.create(name="g", unit="g", quantity=1.0)


@pytest.fixture
def ingredient_zucker(db, gramm_unit):
    return Ingredient.objects.create(name="Zucker", slug="zucker", status=ContentStatus.APPROVED)


@pytest.fixture
def ingredient_salz(db, gramm_unit):
    return Ingredient.objects.create(name="Salz", slug="salz", status=ContentStatus.APPROVED)


@pytest.fixture
def portion_zucker(db, ingredient_zucker, gramm_unit):
    return Portion.objects.create(
        ingredient=ingredient_zucker,
        measuring_unit=gramm_unit,
        name="Gramm Zucker",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def portion_salz(db, ingredient_salz, gramm_unit):
    return Portion.objects.create(
        ingredient=ingredient_salz,
        measuring_unit=gramm_unit,
        name="Gramm Salz",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def draft_recipe(db, auth_client, portion_zucker):
    """Draft recipe owned by the auth user, with one existing item (Zucker)."""
    user = auth_client._user
    recipe = Recipe.objects.create(
        title="Test",
        status=ContentStatus.DRAFT,
        created_by=user,
    )
    recipe.authors.add(user)
    RecipeItem.objects.create(recipe=recipe, portion=portion_zucker, quantity=100, sort_order=0)
    return recipe


@pytest.mark.django_db
class TestAiApplyIngredientsDedup:
    def test_apply_with_no_duplicates_creates_all(self, auth_client, draft_recipe, portion_salz):
        resp = auth_client.post(
            f"/api/recipes/{draft_recipe.id}/ai-apply-ingredients/",
            data=json.dumps([{"portion_id": portion_salz.id, "quantity": 5.0}]),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["portion_id"] == portion_salz.id

    def test_apply_filters_duplicate_ingredient(self, auth_client, draft_recipe, portion_zucker, portion_salz):
        """Zucker already exists in the recipe; only Salz should be created."""
        resp = auth_client.post(
            f"/api/recipes/{draft_recipe.id}/ai-apply-ingredients/",
            data=json.dumps(
                [
                    {"portion_id": portion_zucker.id, "quantity": 50.0},
                    {"portion_id": portion_salz.id, "quantity": 5.0},
                ]
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["portion_id"] == portion_salz.id

        # No new item for Zucker was created (still only the original one)
        zucker_items = RecipeItem.objects.filter(
            recipe=draft_recipe, portion__ingredient_id=portion_zucker.ingredient_id
        )
        assert zucker_items.count() == 1

    def test_apply_with_all_duplicates_returns_empty(self, auth_client, draft_recipe, portion_zucker):
        """All suggestions are duplicates — response is empty, no new items."""
        initial_count = RecipeItem.objects.filter(recipe=draft_recipe).count()
        resp = auth_client.post(
            f"/api/recipes/{draft_recipe.id}/ai-apply-ingredients/",
            data=json.dumps([{"portion_id": portion_zucker.id, "quantity": 999.0}]),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json() == []
        assert RecipeItem.objects.filter(recipe=draft_recipe).count() == initial_count

    def test_apply_unauthenticated_returns_403(self, api_client, draft_recipe, portion_salz):
        resp = api_client.post(
            f"/api/recipes/{draft_recipe.id}/ai-apply-ingredients/",
            data=json.dumps([{"portion_id": portion_salz.id, "quantity": 5.0}]),
            content_type="application/json",
        )
        assert resp.status_code == 403
