"""Tests for RecipeItem PATCH quantity validation (no more DB-constraint 500s).

A RecipeItem's quantity must always be > 0. Invalid client values (0,
negative, NaN) must be rejected with a clean 422 instead of crashing against
the `recipe_item_quantity_positive` check constraint. A null quantity is
treated as "not changed" so partial PATCH clients can omit fields freely.
"""

import json

import pytest

from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestRecipeItemQuantityValidation:
    def _item(self, auth_client, quantity: float = 1.0):
        recipe = make_recipe(portions=1, created_by=auth_client._user)
        ingredient = make_ingredient(name="Speisezwiebeln")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(
            ingredient=ingredient,
            measuring_unit=unit,
            name="100g Zwiebeln",
            weight_g=100.0,
            rank=1,
            weight_status="confirmed",
        )
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=quantity)
        return recipe, item

    def test_zero_quantity_is_rejected_with_422(self, auth_client):
        recipe, item = self._item(auth_client)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": 0}),
            content_type="application/json",
        )
        assert resp.status_code == 422
        assert resp.json()["detail"] == "Menge muss größer als 0 sein."
        item.refresh_from_db()
        assert item.quantity == 1.0

    def test_negative_quantity_is_rejected_with_422(self, auth_client):
        recipe, item = self._item(auth_client)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": -3}),
            content_type="application/json",
        )
        assert resp.status_code == 422
        item.refresh_from_db()
        assert item.quantity == 1.0

    def test_nan_quantity_is_rejected_by_schema_validation(self, auth_client):
        import math

        recipe, item = self._item(auth_client)
        assert math.isnan(float("nan"))

        # NaN is not valid strict JSON — send it raw so schema validation
        # (allow_inf_nan=False) must reject it before any DB write happens.
        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data='{"quantity": NaN}',
            content_type="application/json",
        )
        assert resp.status_code == 422
        item.refresh_from_db()
        assert item.quantity == 1.0

    def test_null_quantity_is_treated_as_unchanged(self, auth_client):
        recipe, item = self._item(auth_client, quantity=2.5)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": None, "note": "gehackt"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.quantity == 2.5
        assert item.note == "gehackt"

    def test_valid_quantity_is_saved(self, auth_client):
        recipe, item = self._item(auth_client)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": 1.5}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.quantity == 1.5
