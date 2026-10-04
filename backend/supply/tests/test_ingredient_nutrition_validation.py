"""Create/update endpoints reject impossible nutrition values and warn on soft findings."""

import json

import pytest

from supply.models import Ingredient
from supply.tests import make_ingredient


def _post(client, **payload):
    payload.setdefault("name", "Testzutat Nährwerte")
    return client.post("/api/ingredients/", data=json.dumps(payload), content_type="application/json")


def _patch(client, slug, **payload):
    return client.patch(f"/api/ingredients/{slug}/", data=json.dumps(payload), content_type="application/json")


@pytest.mark.django_db
class TestCreateNutritionValidation:
    def test_protein_above_100_is_rejected(self, auth_client):
        resp = _post(auth_client, energy_kcal=500, protein_g=200)

        assert resp.status_code == 422
        body = resp.json()
        assert body["code"] == "nutrition_implausible"
        assert "protein_g" in body["fields"]
        assert not Ingredient.objects.filter(name="Testzutat Nährwerte").exists()

    def test_sugar_above_carbs_is_rejected(self, auth_client):
        resp = _post(auth_client, energy_kcal=40, carbohydrate_g=3, sugar_g=8)

        assert resp.status_code == 422
        assert set(resp.json()["fields"]) >= {"sugar_g", "carbohydrate_g"}

    def test_plausible_values_are_saved(self, auth_client):
        resp = _post(auth_client, energy_kcal=64, protein_g=3.3, fat_g=3.5, carbohydrate_g=4.7, sugar_g=4.7)

        assert resp.status_code == 200, resp.content
        assert resp.json()["nutrition_warnings"] == []

    def test_no_nutrition_fields_skips_check(self, auth_client):
        assert _post(auth_client).status_code == 200

    def test_energy_mismatch_is_only_a_warning(self, auth_client):
        resp = _post(auth_client, energy_kcal=400, protein_g=1, fat_g=1, carbohydrate_g=1, sugar_g=0.5)

        assert resp.status_code == 200, resp.content
        codes = [warning["code"] for warning in resp.json()["nutrition_warnings"]]
        assert "energy_mismatch" in codes


@pytest.mark.django_db
class TestUpdateNutritionValidation:
    def _owned(self, user, **kwargs):
        return make_ingredient(name="Eigene Zutat", status="draft", owner=user, created_by=user, **kwargs)

    def test_update_rejects_impossible_value(self, auth_client):
        ingredient = self._owned(auth_client._user)

        resp = _patch(auth_client, ingredient.slug, protein_g=200)

        assert resp.status_code == 422
        assert "protein_g" in resp.json()["fields"]
        ingredient.refresh_from_db()
        assert ingredient.protein_g != 200

    def test_partial_update_is_checked_against_stored_values(self, auth_client):
        ingredient = self._owned(auth_client._user, carbohydrate_g=3.0, sugar_g=1.0, energy_kcal=30)

        resp = _patch(auth_client, ingredient.slug, sugar_g=8)

        assert resp.status_code == 422
        assert "sugar_g" in resp.json()["fields"]

    def test_price_change_on_legacy_implausible_ingredient_is_not_blocked(self, auth_client):
        ingredient = self._owned(auth_client._user, protein_g=200, energy_kcal=500)

        resp = _patch(auth_client, ingredient.slug, price_per_kg=3.5)

        assert resp.status_code == 200, resp.content
        ingredient.refresh_from_db()
        assert float(ingredient.price_per_kg) == 3.5

    def test_form_resending_unchanged_legacy_values_is_not_blocked(self, auth_client):
        ingredient = self._owned(auth_client._user, protein_g=200, energy_kcal=500)

        resp = _patch(auth_client, ingredient.slug, protein_g=200, energy_kcal=500, price_per_kg=2.0)

        assert resp.status_code == 200, resp.content

    def test_plausible_update_succeeds(self, auth_client):
        ingredient = self._owned(auth_client._user)

        resp = _patch(auth_client, ingredient.slug, protein_g=12.0, fat_g=3.0, carbohydrate_g=60.0, energy_kcal=315)

        assert resp.status_code == 200, resp.content
