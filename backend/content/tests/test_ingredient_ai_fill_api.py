"""Tests for ingredient plausibility detection and AI master data filling."""

import json
from unittest.mock import MagicMock, patch

import pytest
from django.test import Client

from supply.services.ingredient_ai_fill_service import (
    fill_missing_ingredient_fields,
    get_missing_field_names,
)

BASE = "/api/admin/data-quality"


@pytest.fixture
def admin_client(db, django_user_model) -> Client:
    user = django_user_model.objects.create_superuser(
        username="admin",
        email="admin@inspi.dev",
        password="adminpass123",
    )
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def test_ingredients(db):
    from supply.tests import make_ingredient

    # 1. Sugar > Carbs
    i1 = make_ingredient(name="Kirschpraline", slug="kirschpraline")
    i1.sugar_g = 50.0
    i1.carbohydrate_g = 0.0
    i1.save()

    # 2. Sat fat > Fat
    i2 = make_ingredient(name="Feine Butter", slug="feine-butter")
    i2.fat_sat_g = 80.0
    i2.fat_g = 50.0
    i2.save()

    # 3. Macro sum > 100g
    i3 = make_ingredient(name="Power Bar", slug="power-bar")
    i3.protein_g = 60.0
    i3.fat_g = 40.0
    i3.carbohydrate_g = 20.0  # Sum 120g
    i3.save()

    # 4. Missing energy with macros
    i4 = make_ingredient(name="Erdnussbutter", slug="erdnussbutter")
    i4.energy_kcal = 0.0
    i4.protein_g = 25.0
    i4.fat_g = 50.0
    i4.carbohydrate_g = 10.0
    i4.save()

    # 5. Missing macros with energy
    i5 = make_ingredient(name="Energy Drink", slug="energy-drink")
    i5.energy_kcal = 200.0
    i5.protein_g = 0.0
    i5.fat_g = 0.0
    i5.carbohydrate_g = 0.0
    i5.save()

    return i1, i2, i3, i4, i5


@pytest.mark.django_db
class TestNutritionPlausibilityAPI:
    def test_list_all_plausibility_anomalies(self, admin_client, test_ingredients):
        res = admin_client.get(f"{BASE}/ingredients/nutrition-plausibility/")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 5
        names = [item["name"] for item in data["items"]]
        assert "Kirschpraline" in names
        assert "Feine Butter" in names
        assert "Power Bar" in names
        assert "Erdnussbutter" in names
        assert "Energy Drink" in names

    def test_filter_by_anomaly_type(self, admin_client, test_ingredients):
        res = admin_client.get(f"{BASE}/ingredients/nutrition-plausibility/?anomaly_type=sugar_gt_carbs")
        assert res.status_code == 200
        data = res.json()
        assert any(item["name"] == "Kirschpraline" for item in data["items"])
        assert not any(item["name"] == "Feine Butter" for item in data["items"])

    def test_search_filter(self, admin_client, test_ingredients):
        res = admin_client.get(f"{BASE}/ingredients/nutrition-plausibility/?search=Kirsch")
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Kirschpraline"

    def test_zero_price_is_listed_as_missing_price(self, admin_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Preisloses Wasser", slug="preisloses-wasser", price_per_kg=0)

        res = admin_client.get(f"{BASE}/ingredients/price-analysis/?anomaly_type=missing")

        assert res.status_code == 200
        item = next(item for item in res.json()["items"] if item["id"] == ingredient.id)
        assert item["anomaly_type"] == "missing"
        assert item["price_per_kg"] == "0.00"


@pytest.mark.django_db
class TestIngredientAiFillService:
    def test_get_missing_field_names(self, test_ingredients):
        i1, _i2, _i3, i4, _i5 = test_ingredients
        # i4 has energy_kcal=0 with macros > 2g -> energy_kcal must be marked missing
        missing_i4 = get_missing_field_names(i4)
        assert "energy_kcal" in missing_i4

        # i1 has carbs=0 with sugar=50g -> carbohydrate_g must be marked missing
        missing_i1 = get_missing_field_names(i1)
        assert "carbohydrate_g" in missing_i1

    def test_zero_values_treated_as_missing(self, db):
        from supply.tests import make_ingredient

        ing = make_ingredient(name="Wasser", slug="wasser")
        ing.energy_kcal = 0.0
        ing.protein_g = 0.0
        ing.fat_g = 0.0
        ing.carbohydrate_g = 0.0
        ing.price_per_kg = 0.0
        ing.cooking_factor = 0.0
        ing.save()

        missing = get_missing_field_names(ing)
        assert "energy_kcal" in missing
        assert "protein_g" in missing
        assert "fat_g" in missing
        assert "carbohydrate_g" in missing
        assert "price_per_kg" in missing
        assert "cooking_factor" in missing

    @patch("supply.services.ingredient_ai_fill_service.gemini_call")
    def test_fill_missing_ingredient_fields_preserves_existing_data(self, mock_gemini, db):
        from supply.tests import make_ingredient

        ing = make_ingredient(name="Erdnussbutter Creamy", slug="erdnussbutter-creamy")
        ing.protein_g = 29.0
        ing.fat_g = 82.0
        ing.carbohydrate_g = 12.0
        ing.sugar_g = 5.9
        ing.energy_kcal = 0.0  # missing!
        ing.storage_type = None  # missing!
        ing.price_per_kg = 14.09  # existing! Must NOT be replaced
        ing.save()

        # Mock Gemini response that only returns missing fields
        mock_response = MagicMock()
        mock_response.text = json.dumps(
            {
                "energy_kcal": 625.0,
                "storage_type": "ambient",
                "durability_in_days": 180,
            }
        )
        mock_gemini.return_value = (mock_response, "mock-interaction-123")

        result = fill_missing_ingredient_fields(ing)

        ing.refresh_from_db()
        assert ing.energy_kcal == 625.0
        assert ing.storage_type == "ambient"
        assert ing.durability_in_days == 180
        # Check existing fields were NOT replaced
        assert ing.protein_g == 29.0
        assert ing.fat_g == 82.0
        assert float(ing.price_per_kg) == 14.09
        assert result["id"] == ing.id
        assert len(result["filled_fields"]) >= 2


@pytest.mark.django_db
class TestAiFillMissingEndpoints:
    @patch("supply.services.ingredient_ai_fill_service.gemini_call")
    def test_single_ai_fill_missing(self, mock_gemini, admin_client, test_ingredients):
        i1, _, _, _, _ = test_ingredients

        mock_response = MagicMock()
        mock_response.text = json.dumps({"carbohydrate_g": 60.0})
        mock_gemini.return_value = (mock_response, "mock-int-1")

        res = admin_client.post(f"{BASE}/ingredients/{i1.id}/ai-fill-missing/")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == i1.id
        i1.refresh_from_db()
        assert i1.carbohydrate_g == 60.0

    @patch("supply.services.ingredient_ai_fill_service.gemini_call")
    def test_batch_ai_fill_missing(self, mock_gemini, admin_client, test_ingredients):
        i1, i2, _, _, _ = test_ingredients

        mock_response = MagicMock()
        mock_response.text = json.dumps({"carbohydrate_g": 60.0, "fat_g": 85.0})
        mock_gemini.return_value = (mock_response, "mock-int-2")

        payload = {"ingredient_ids": [i1.id, i2.id]}
        res = admin_client.post(
            f"{BASE}/ingredients/ai-fill-missing/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert "results" in data
        assert len(data["results"]) == 2
