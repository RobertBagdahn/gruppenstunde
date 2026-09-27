"""Server-side normalization of recipe quantities to one portion."""

import json

import pytest

from recipe.models import Recipe
from supply.choices import IngredientStatusChoices
from supply.models import Ingredient
from supply.tests import make_ingredient, make_portion


def _post_recipe(client, payload: dict):
    return client.post("/api/recipes/", data=json.dumps(payload), content_type="application/json")


@pytest.fixture
def gram_portion(db):
    ingredient = make_ingredient(name="Spaghetti")
    return make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)


@pytest.mark.django_db
class TestServingsNormalization:
    def test_divides_quantities_by_input_servings(self, auth_client, gram_portion):
        resp = _post_recipe(
            auth_client,
            {
                "title": "Spaghetti für vier",
                "input_servings": 4,
                "recipe_items": [{"portion_id": gram_portion.id, "quantity": 500, "sort_order": 0}],
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["portions"] == 1
        assert data["source_servings"] == 4
        assert data["recipe_items"][0]["quantity"] == 125
        assert Recipe.objects.get(id=data["id"]).source_servings == 4

    def test_items_without_input_servings_are_rejected(self, auth_client, gram_portion):
        resp = _post_recipe(
            auth_client,
            {
                "title": "Ohne Personenzahl",
                "recipe_items": [{"portion_id": gram_portion.id, "quantity": 500, "sort_order": 0}],
            },
        )

        assert resp.status_code == 422
        assert "Personenzahl des Originalrezepts" in resp.json()["detail"]
        assert not Recipe.objects.filter(title="Ohne Personenzahl").exists()

    def test_review_rows_without_input_servings_are_rejected(self, auth_client, gram_portion):
        resp = _post_recipe(
            auth_client,
            {
                "title": "Review ohne Personenzahl",
                "ingredient_review_rows": [
                    {
                        "key": "row-1",
                        "status": "confirmed",
                        "selected_portion_id": gram_portion.id,
                        "quantity": 500,
                    }
                ],
            },
        )

        assert resp.status_code == 422

    @pytest.mark.parametrize("servings", [0, 150])
    def test_out_of_range_input_servings_are_rejected(self, auth_client, gram_portion, servings):
        resp = _post_recipe(
            auth_client,
            {
                "title": "Ungültig",
                "input_servings": servings,
                "recipe_items": [{"portion_id": gram_portion.id, "quantity": 500, "sort_order": 0}],
            },
        )

        assert resp.status_code == 422

    def test_recipe_without_ingredients_needs_no_input_servings(self, auth_client):
        resp = _post_recipe(auth_client, {"title": "Leerer Entwurf"})

        assert resp.status_code == 200
        assert resp.json()["source_servings"] is None

    def test_anonymous_user_cannot_create(self, api_client, gram_portion):
        resp = _post_recipe(
            api_client,
            {
                "title": "Anonym",
                "input_servings": 4,
                "recipe_items": [{"portion_id": gram_portion.id, "quantity": 500, "sort_order": 0}],
            },
        )

        assert resp.status_code == 403
        assert not Recipe.objects.filter(title="Anonym").exists()

    def test_source_servings_patch_does_not_rescale(self, auth_client, gram_portion):
        created = _post_recipe(
            auth_client,
            {
                "title": "Nachträglich",
                "input_servings": 4,
                "recipe_items": [{"portion_id": gram_portion.id, "quantity": 500, "sort_order": 0}],
            },
        ).json()

        resp = auth_client.patch(
            f"/api/recipes/{created['id']}/",
            data=json.dumps({"source_servings": 6}),
            content_type="application/json",
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["source_servings"] == 6
        assert data["recipe_items"][0]["quantity"] == 125

    def test_new_ingredient_from_review_row_is_draft_of_creator(self, auth_client):
        resp = _post_recipe(
            auth_client,
            {
                "title": "Knoblauchbrot",
                "input_servings": 4,
                "recipe_items": [{"portion_id": None, "quantity": 8, "sort_order": 0}],
                "ingredient_review_rows": [
                    {
                        "key": "row-1",
                        "status": "confirmed",
                        "quantity": 8,
                        "temporary_ingredient": {
                            "name": "Knoblauch frisch",
                            "values": {"energy_kcal": 149},
                            "portions": [{"name": "Zehe", "quantity": 1, "weight_g": 4, "is_new": True}],
                        },
                    }
                ],
            },
        )

        assert resp.status_code == 200
        created = Ingredient.objects.get(name="Knoblauch frisch")
        assert created.status == IngredientStatusChoices.DRAFT
        assert created.created_by == auth_client._user
        assert resp.json()["recipe_items"][0]["quantity"] == 2


@pytest.mark.django_db
class TestCreationIdempotency:
    def test_same_key_returns_existing_recipe(self, auth_client):
        payload = {"title": "Doppelklick", "idempotency_key": "wizard-abc"}

        first = _post_recipe(auth_client, payload)
        second = _post_recipe(auth_client, payload)

        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json()["id"] == second.json()["id"]
        assert Recipe.objects.filter(title="Doppelklick").count() == 1

    def test_key_is_scoped_per_owner(self, auth_client, admin_client):
        payload = {"title": "Gleicher Schlüssel", "idempotency_key": "wizard-shared"}

        first = _post_recipe(auth_client, payload)
        second = _post_recipe(admin_client, payload)

        assert first.json()["id"] != second.json()["id"]
