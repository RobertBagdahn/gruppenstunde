"""Tests for the RecipeItem update endpoint's AI-estimate plausibility guard.

See openspec change `fix-portion-integrity-and-ai-estimate`: when the
frontend applies an AI quantity estimate, it now sends `expected_grams_total`
so the backend can reject an update that would silently persist a
portion/quantity mismatch (the class of bug discovered in recipe #59
"Linsensuppe").
"""

import json

import pytest

from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestRecipeItemPlausibilityGuard:
    def test_consistent_update_is_accepted(self, auth_client):
        recipe = make_recipe(portions=1, created_by=auth_client._user)
        ingredient = make_ingredient(name="Jodsalz")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        rank1 = make_portion(ingredient=ingredient, measuring_unit=unit, name="100g Jodsalz", weight_g=100.0, rank=1)
        item = make_recipe_item(recipe=recipe, portion=rank1, quantity=0.073)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": 0.03, "expected_grams_total": 3.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.quantity == 0.03

    def test_mismatched_update_is_rejected(self, auth_client):
        """A quantity that produces grams outside the 15%/2g tolerance must be
        rejected. quantity=0.5 on a weight_g=100 portion yields 50g while the AI
        intended 3g — diff 47g > max(3×0.15, 2)=2g."""
        recipe = make_recipe(portions=1, created_by=auth_client._user)
        ingredient = make_ingredient(name="Jodsalz")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(
            ingredient=ingredient,
            measuring_unit=unit,
            name="100g Salz",
            weight_g=100.0,
            rank=1,
        )
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=0.073)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": 0.5, "expected_grams_total": 3.0}),
            content_type="application/json",
        )
        assert resp.status_code == 422
        item.refresh_from_db()
        assert item.quantity == 0.073  # unchanged

    def test_update_without_expected_grams_total_skips_check(self, auth_client):
        """Normal manual edits (no AI-estimate context) are not required to
        pass the plausibility check."""
        recipe = make_recipe(portions=1, created_by=auth_client._user)
        ingredient = make_ingredient(name="Mehl")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="100g Mehl", weight_g=100.0, rank=1)
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": 999.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_portion_and_quantity_change_together_is_accepted(self, auth_client):
        """Applying an AI estimate that targets a *different* portion than the
        one currently stored must succeed when portion_id and quantity are
        submitted together and are mutually consistent."""
        recipe = make_recipe(portions=1, created_by=auth_client._user)
        ingredient = make_ingredient(name="Olivenöl nativ extra")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        old_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="100g Olivenöl",
            weight_g=100.0,
            rank=2,
        )
        new_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(name="Esslöffel", quantity=1.0, unit="stk"),
            name="Portion",
            weight_g=10.0,
            rank=1,
        )
        item = make_recipe_item(recipe=recipe, portion=old_portion, quantity=0.488)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps(
                {
                    "portion_id": new_portion.id,
                    "quantity": 1.0,
                    "expected_grams_total": 10.0,
                },
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.portion_id == new_portion.id
        assert item.quantity == 1.0

    def test_legitimate_portion_variation_passes_check(self, auth_client):
        """A small cooking-portion variation (e.g. 48g vs 50g expected, 4%
        difference) must be accepted with the relaxed 15% tolerance."""
        recipe = make_recipe(portions=1, created_by=auth_client._user)
        ingredient = make_ingredient(name="Karotte")
        unit = make_measuring_unit(name="Stück", quantity=1.0, unit="stk")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="1 Stück Karotte", weight_g=24.0, rank=1)
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": 2.0, "expected_grams_total": 50.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.quantity == 2.0

    def test_floating_point_noise_passes_check(self, auth_client):
        """Sub-gram floating-point noise (e.g. 0.99g vs 1.0g expected) must
        be accepted — the 2g absolute tolerance floor covers this."""
        recipe = make_recipe(portions=1, created_by=auth_client._user)
        ingredient = make_ingredient(name="Salz")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="1g Salz", weight_g=1.0, rank=1)
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)

        resp = auth_client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            data=json.dumps({"quantity": 0.99, "expected_grams_total": 1.0}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.quantity == 0.99
