"""Tests for Supply API (Material + Ingredient endpoints)."""

import json

import pytest
from django.test import Client

from supply.models import (
    Ingredient,
    IngredientAlias,
    Material,
    MeasuringUnit,
    NutritionalTag,
    Portion,
    RetailSection,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def material(db):
    return Material.objects.create(
        name="Schere",
        description="Bastelschere",
        material_category="tools",
        is_consumable=False,
    )


@pytest.fixture
def material_consumable(db):
    return Material.objects.create(
        name="Papier",
        description="DIN A4 Papier",
        material_category="stationery",
        is_consumable=True,
    )


@pytest.fixture
def measuring_unit(db):
    return MeasuringUnit.objects.create(
        name="Gramm",
        unit="g",
        quantity=1.0,
    )


@pytest.fixture
def nutritional_tag(db):
    return NutritionalTag.objects.create(
        name="Glutenfrei",
        name_opposite="Enthält Gluten",
        description="Frei von Gluten",
        rank=1,
        is_dangerous=True,
    )


@pytest.fixture
def retail_section(db):
    return RetailSection.objects.create(
        name="Backwaren",
        rank=1,
    )


@pytest.fixture
def ingredient(db, retail_section):
    return Ingredient.objects.create(
        name="Weizenmehl",
        slug="weizenmehl",
        status="approved",
        retail_section=retail_section,
        energy_kj=1418,
        protein_g=10.3,
        fat_g=1.0,
        fat_sat_g=0.2,
        carbohydrate_g=71.0,
        sugar_g=0.5,
        fibre_g=2.8,
        salt_g=0.01,
    )


@pytest.fixture
def portion(db, ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name="100g Mehl",
        quantity=100.0,
        weight_g=100.0,
    )


# ===========================================================================
# Material API Tests
# ===========================================================================


@pytest.mark.django_db
class TestMaterialList:
    def test_list_materials(self, api_client, material, material_consumable):
        resp = api_client.get("/api/supplies/materials/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2

    def test_list_filter_by_category(self, api_client, material, material_consumable):
        resp = api_client.get("/api/supplies/materials/?material_category=tools")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Schere"

    def test_list_search(self, api_client, material, material_consumable):
        resp = api_client.get("/api/supplies/materials/?q=Schere")
        data = resp.json()
        assert data["total"] == 1

    def test_search_endpoint(self, api_client, material):
        resp = api_client.get("/api/supplies/materials/search/?q=Sche")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Schere"


@pytest.mark.django_db
class TestMaterialDetail:
    def test_get_by_id(self, api_client, material):
        resp = api_client.get(f"/api/supplies/materials/{material.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Schere"
        assert data["material_category"] == "tools"

    def test_get_by_slug(self, api_client, material):
        resp = api_client.get(f"/api/supplies/materials/by-slug/{material.slug}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Schere"

    def test_404_for_nonexistent(self, api_client):
        resp = api_client.get("/api/supplies/materials/99999/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestMaterialCreate:
    def test_create_requires_auth(self, api_client):
        resp = api_client.post(
            "/api/supplies/materials/",
            data=json.dumps({"name": "Seil", "material_category": "outdoor"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_material(self, auth_client):
        resp = auth_client.post(
            "/api/supplies/materials/",
            data=json.dumps(
                {
                    "name": "Seil",
                    "description": "10m Seil",
                    "material_category": "outdoor",
                    "is_consumable": False,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Seil"
        assert data["material_category"] == "outdoor"
        assert data["slug"]  # auto-generated


@pytest.mark.django_db
class TestMaterialUpdate:
    def test_update_material(self, auth_client, material):
        resp = auth_client.patch(
            f"/api/supplies/materials/{material.id}/",
            data=json.dumps({"name": "Bastelschere"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Bastelschere"


@pytest.mark.django_db
class TestMaterialDelete:
    def test_delete_requires_admin(self, auth_client, material):
        resp = auth_client.delete(f"/api/supplies/materials/{material.id}/")
        assert resp.status_code == 403

    def test_admin_can_delete(self, admin_client, material):
        resp = admin_client.delete(f"/api/supplies/materials/{material.id}/")
        assert resp.status_code == 204

        # Soft-deleted
        assert Material.objects.filter(id=material.id).count() == 0
        assert Material.all_objects.filter(id=material.id).count() == 1


# ===========================================================================
# Ingredient API Tests (slug-based URLs)
# ===========================================================================


@pytest.mark.django_db
class TestIngredientList:
    def test_list_ingredients(self, api_client, ingredient):
        resp = api_client.get("/api/ingredients/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1

    def test_list_search_by_name(self, api_client, ingredient):
        resp = api_client.get("/api/ingredients/?name=Weizen")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Weizenmehl"

    def test_list_filter_by_status(self, api_client, ingredient):
        resp = api_client.get("/api/ingredients/?status=approved")
        data = resp.json()
        assert data["total"] == 1


@pytest.mark.django_db
class TestIngredientDetail:
    def test_get_by_slug(self, api_client, ingredient):
        resp = api_client.get(f"/api/ingredients/{ingredient.slug}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Weizenmehl"
        assert data["energy_kj"] == 1418.0

    def test_404_for_nonexistent(self, api_client):
        resp = api_client.get("/api/ingredients/nonexistent-slug/")
        assert resp.status_code == 404


@pytest.mark.django_db
class TestIngredientCreate:
    def test_create_requires_auth(self, api_client):
        resp = api_client.post(
            "/api/ingredients/",
            data=json.dumps({"name": "Zucker"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_ingredient(self, auth_client):
        resp = auth_client.post(
            "/api/ingredients/",
            data=json.dumps(
                {
                    "name": "Zucker",
                    "energy_kj": 1680,
                    "protein_g": 0,
                    "fat_g": 0,
                    "carbohydrate_g": 100,
                    "sugar_g": 100,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Zucker"
        assert data["slug"] == "zucker"
        assert data["status"] == "draft"


@pytest.mark.django_db
class TestIngredientUpdate:
    def test_update_ingredient(self, auth_client, ingredient):
        resp = auth_client.patch(
            f"/api/ingredients/{ingredient.slug}/",
            data=json.dumps({"name": "Weizenmehl Typ 405"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Weizenmehl Typ 405"


# ===========================================================================
# Portions API Tests (under ingredient slug)
# ===========================================================================


@pytest.mark.django_db
class TestPortions:
    def test_list_portions(self, api_client, ingredient, portion):
        resp = api_client.get(f"/api/ingredients/{ingredient.slug}/portions/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == "100g Mehl"

    def test_create_portion(self, auth_client, ingredient, measuring_unit):
        resp = auth_client.post(
            f"/api/ingredients/{ingredient.slug}/portions/",
            data=json.dumps(
                {
                    "name": "Esslöffel Mehl",
                    "measuring_unit_id": measuring_unit.id,
                    "quantity": 1.0,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Esslöffel Mehl"


# ===========================================================================
# MeasuringUnit, NutritionalTag, RetailSection
# ===========================================================================


@pytest.mark.django_db
class TestMeasuringUnits:
    def test_list_measuring_units(self, api_client, measuring_unit):
        resp = api_client.get("/api/supplies/measuring-units/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1


@pytest.mark.django_db
class TestNutritionalTags:
    def test_list_nutritional_tags(self, api_client, nutritional_tag):
        resp = api_client.get("/api/supplies/nutritional-tags/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Glutenfrei"


@pytest.mark.django_db
class TestRetailSections:
    def test_list_retail_sections(self, api_client, retail_section):
        resp = api_client.get("/api/retail-sections/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Backwaren"


# ===========================================================================
# Aliases
# ===========================================================================


@pytest.mark.django_db
class TestIngredientAliases:
    def test_create_alias(self, auth_client, ingredient):
        resp = auth_client.post(
            f"/api/ingredients/{ingredient.slug}/aliases/",
            data=json.dumps({"name": "Weizenmehl 405"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Weizenmehl 405"

    def test_delete_alias(self, auth_client, ingredient):
        alias = IngredientAlias.objects.create(
            ingredient=ingredient,
            name="Mehl",
        )
        resp = auth_client.delete(f"/api/ingredients/{ingredient.slug}/aliases/{alias.id}/")
        assert resp.status_code == 200
        assert IngredientAlias.objects.filter(id=alias.id).count() == 0
