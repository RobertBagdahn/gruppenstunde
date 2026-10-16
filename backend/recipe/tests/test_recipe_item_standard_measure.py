"""Recipe items keep a selected standard measure (EL, Tasse, …) as their unit.

See openspec change `switchable-quantity-units`, requirement
"Standardmaß-Auswahl behält die Einheit": the item stores
`standard_measure_key` and the count, grams are derived via the density.
"""

import json

import pytest

from planner.services.calculation_context import resolve_active_recipe_items
from recipe.models import RecipeItem
from recipe.services.recipe_item_helpers import get_recipe_item_weight_g
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion


def _setup(auth_client, *, density: float | None = None):
    recipe = make_recipe(portions=1, created_by=auth_client._user)
    ingredient = make_ingredient(name="Olivenöl", physical_density=density or 1.0)
    gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
    # Every ingredient gets its "g" base portion on creation (supply.signals).
    gram_portion = ingredient.portions.get(name="g")
    piece_portion = make_portion(
        ingredient=ingredient,
        measuring_unit=gram_unit,
        name="Flasche",
        weight_g=500.0,
        rank=1,
        weight_status="confirmed",
    )
    return recipe, ingredient, gram_portion, piece_portion


def _patch(auth_client, recipe, item, payload):
    return auth_client.patch(
        f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
        data=json.dumps(payload),
        content_type="application/json",
    )


@pytest.mark.django_db
class TestRecipeItemStandardMeasure:
    def test_patch_to_tasse_keeps_unit(self, auth_client):
        recipe, _ingredient, gram_portion, _piece = _setup(auth_client)
        item = make_recipe_item(recipe=recipe, portion=gram_portion, quantity=200)

        resp = _patch(
            auth_client, recipe, item, {"portion_id": gram_portion.id, "standard_measure_key": "tasse", "quantity": 1}
        )

        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["standard_measure_key"] == "tasse"
        assert body["unit_kind"] == "standard"
        assert body["unit_label"] == "Tasse"
        assert body["quantity"] == 1
        assert body["weight_g"] == pytest.approx(200.0)
        assert body["is_weight_approx"] is True
        assert body["has_missing_weight"] is False
        item.refresh_from_db()
        assert item.standard_measure_key == "tasse"

    def test_el_uses_explicit_density(self, auth_client):
        recipe, _ingredient, gram_portion, _piece = _setup(auth_client, density=0.92)
        item = make_recipe_item(recipe=recipe, portion=gram_portion, quantity=30)

        resp = _patch(auth_client, recipe, item, {"standard_measure_key": "el", "quantity": 2})

        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["weight_g"] == pytest.approx(27.6)
        assert body["is_weight_approx"] is False
        assert body["portion_display"].startswith("2 EL")

    def test_portion_change_without_key_clears_standard_measure(self, auth_client):
        recipe, _ingredient, gram_portion, piece = _setup(auth_client)
        item = make_recipe_item(recipe=recipe, portion=gram_portion, quantity=2)
        RecipeItem.objects.filter(id=item.id).update(standard_measure_key="el")

        resp = _patch(auth_client, recipe, item, {"portion_id": piece.id, "quantity": 1})

        assert resp.status_code == 200, resp.content
        assert resp.json()["standard_measure_key"] == ""
        assert resp.json()["unit_kind"] == "portion"

    def test_standard_measure_with_piece_portion_is_rejected(self, auth_client):
        recipe, _ingredient, _gram, piece = _setup(auth_client)
        item = make_recipe_item(recipe=recipe, portion=piece, quantity=1)

        resp = _patch(auth_client, recipe, item, {"standard_measure_key": "el"})

        assert resp.status_code == 422

    def test_unknown_standard_measure_is_rejected(self, auth_client):
        recipe, _ingredient, gram_portion, _piece = _setup(auth_client)
        item = make_recipe_item(recipe=recipe, portion=gram_portion, quantity=10)

        resp = _patch(auth_client, recipe, item, {"standard_measure_key": "eimer"})

        assert resp.status_code == 422

    def test_create_with_standard_measure(self, auth_client):
        recipe, _ingredient, gram_portion, _piece = _setup(auth_client)

        resp = auth_client.post(
            f"/api/recipes/{recipe.id}/recipe-items/",
            data=json.dumps({"portion_id": gram_portion.id, "standard_measure_key": "tl", "quantity": 3}),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        assert resp.json()["standard_measure_key"] == "tl"
        assert resp.json()["weight_g"] == pytest.approx(15.0)

    def test_anonymous_patch_is_rejected(self, client, auth_client):
        recipe, _ingredient, gram_portion, _piece = _setup(auth_client)
        item = make_recipe_item(recipe=recipe, portion=gram_portion, quantity=10)

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"standard_measure_key": "el"}),
            content_type="application/json",
        )

        assert resp.status_code == 401

    def test_calculations_use_standard_measure_grams(self, auth_client):
        recipe, _ingredient, gram_portion, _piece = _setup(auth_client)
        item = make_recipe_item(recipe=recipe, portion=gram_portion, quantity=2)
        RecipeItem.objects.filter(id=item.id).update(standard_measure_key="tasse")
        item.refresh_from_db()

        assert get_recipe_item_weight_g(item) == pytest.approx(400.0)
        [active] = resolve_active_recipe_items(recipe)
        assert active.weight_g == pytest.approx(400.0)


@pytest.mark.django_db
class TestCreateRecipeKeepsStandardMeasure:
    def test_reviewed_tablespoon_is_stored_as_unit(self, auth_client):
        """Creating a recipe from the ingredient review keeps "5 EL" instead of converting to grams."""
        ingredient = make_ingredient(name="Olivenöl")
        gram_portion = ingredient.portions.get(name="g")

        resp = auth_client.post(
            "/api/recipes/",
            data=json.dumps(
                {
                    "title": "Dressing",
                    "input_servings": 1,
                    "recipe_items": [
                        {
                            "portion_id": gram_portion.id,
                            "standard_measure_key": "el",
                            "quantity": 5,
                            "sort_order": 0,
                        }
                    ],
                    "ingredient_review_rows": [
                        {
                            "key": "row-1",
                            "status": "confirmed",
                            "selected_ingredient_id": ingredient.id,
                            "selected_portion_id": gram_portion.id,
                            "quantity": 5,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        item = RecipeItem.objects.get(recipe_id=resp.json()["id"])
        assert item.standard_measure_key == "el"
        assert item.quantity == 5
