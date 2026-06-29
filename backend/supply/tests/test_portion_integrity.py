"""Tests for Portion data integrity."""

import json

import pytest

from supply.models import Ingredient, MeasuringUnit, Portion, RetailSection
from supply.services.unit_resolution import resolve_canonical_unit


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
    )


@pytest.fixture
def measuring_unit(db):
    return MeasuringUnit.objects.create(
        name="Gramm",
        unit="g",
        quantity=1.0,
    )


# ---------------------------------------------------------------------------
# 7.1 Unit-Test Portion.compute_weight_g()
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_portion_compute_weight_g(ingredient, measuring_unit):
    # test explicit has precedence
    portion = Portion(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name="Test Portion",
        quantity=50.0,
        weight_g=150.0,
    )
    assert portion.compute_weight_g(explicit=150.0) == 150.0

    # test calculation (quantity 50.0 * measuring_unit.quantity 1.0)
    assert portion.compute_weight_g() == 50.0

    # test <= 0 behavior
    assert portion.compute_weight_g(explicit=-10.0) is None
    assert portion.compute_weight_g(explicit=0.0) is None


# ---------------------------------------------------------------------------
# 7.2 API-Test create_portion: Happy-Path, leerer Name -> 422, nicht-authentifiziert -> 403
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_portion_auth_and_validation(api_client, auth_client, ingredient, measuring_unit):
    # Non-authenticated -> 403
    resp_unauth = api_client.post(
        f"/api/ingredients/{ingredient.slug}/portions/",
        data=json.dumps(
            {
                "name": "Prise",
                "measuring_unit_id": measuring_unit.id,
                "quantity": 1.0,
            }
        ),
        content_type="application/json",
    )
    assert resp_unauth.status_code == 403

    # Authenticated, Happy Path -> 200
    resp_happy = auth_client.post(
        f"/api/ingredients/{ingredient.slug}/portions/",
        data=json.dumps(
            {
                "name": "Prise",
                "measuring_unit_id": measuring_unit.id,
                "quantity": 1.0,
            }
        ),
        content_type="application/json",
    )
    assert resp_happy.status_code == 200
    assert resp_happy.json()["name"] == "Prise"

    # Authenticated, Empty Name -> 422
    resp_empty = auth_client.post(
        f"/api/ingredients/{ingredient.slug}/portions/",
        data=json.dumps(
            {
                "name": " ",
                "measuring_unit_id": measuring_unit.id,
                "quantity": 1.0,
            }
        ),
        content_type="application/json",
    )
    assert resp_empty.status_code == 422


# ---------------------------------------------------------------------------
# 7.3 Test resolve_canonical_unit() (g->Gramm, unbekannt -> Fallback)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_resolve_canonical_unit_mapping(db):
    # Setup MeasuringUnits
    gramm = MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)
    liter = MeasuringUnit.objects.create(name="Liter", unit="l", quantity=1000.0)

    # Test synonym matching
    assert resolve_canonical_unit("g") == gramm
    assert resolve_canonical_unit("Gramm") == gramm
    assert resolve_canonical_unit("l") == liter
    assert resolve_canonical_unit("Liter") == liter

    # Test case insensitivity and spaces
    assert resolve_canonical_unit("   g   ") == gramm

    # Test unknown fallback
    assert resolve_canonical_unit("unknown_unit") == gramm


# ---------------------------------------------------------------------------
# 7.4 Test URL-Import: keine Dubletten-Einheit, keine Duplikat-Portion, weight_g gesetzt
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_resolve_portion_url_import(ingredient, measuring_unit):
    from recipe.services.url_import_service import _resolve_portion

    # Resolve first time -> creates portion and sets weight_g
    p_id_1 = _resolve_portion(ingredient.id, measuring_unit.id, 120.0, "Gramm")
    assert p_id_1 is not None

    portion = Portion.objects.get(id=p_id_1)
    assert portion.name == "Gramm"
    assert portion.weight_g == 120.0

    # Resolve second time -> returns existing portion, no new duplicate
    p_id_2 = _resolve_portion(ingredient.id, measuring_unit.id, 120.0, "Gramm")
    assert p_id_1 == p_id_2

    # 3 System-Portionen (g, Packung, Stück) + 1 per _resolve_portion
    assert Portion.objects.filter(ingredient=ingredient).count() == 4


# ---------------------------------------------------------------------------
# 7.6 Migrations-Test: kaputte Fixtures (NULL weight_g, leere Namen, Duplikate)
# ---------------------------------------------------------------------------


class MockApps:
    def get_model(self, app_label, model_name):
        from django.apps import apps

        return apps.get_model(app_label, model_name)


@pytest.mark.skip(
    reason="Migration 0024 test incompatible with UNIQUE constraint added in 0044 "
    "(unique_portion_name_per_ingredient). Historical data cleanup no longer relevant."
)
@pytest.mark.django_db
def test_fix_portion_data_integrity_migration(ingredient, measuring_unit):
    import importlib

    migration_mod = importlib.import_module("supply.migrations.0024_fix_portion_data_integrity")
    fix_portion_data_integrity = migration_mod.fix_portion_data_integrity

    # 1. Create duplicate measuring units
    mu_dup = MeasuringUnit.objects.create(id=95, name="Gramm", unit="g", quantity=1.0)

    # 2. Create portions with empty name, "g" name, NULL weight_g, and duplicates
    p_empty = Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name="",
        quantity=5.0,
        weight_g=None,
    )
    p_g = Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name="g",
        quantity=10.0,
        weight_g=None,
    )

    # Create duplicate portions to test deduplication
    p_dup1 = Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name="Stück",
        quantity=1.0,
        weight_g=15.0,
    )
    p_dup2 = Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name="Stück",
        quantity=1.0,
        weight_g=15.0,
    )

    # Link a recipe item to the duplicate portion to test FK update
    from recipe.models import Recipe, RecipeItem

    recipe = Recipe.objects.create(title="Kuchen", portions=4)
    item = RecipeItem.objects.create(
        recipe=recipe,
        portion=p_dup2,
        quantity=2.0,
        sort_order=1,
    )

    # Run migration function
    apps = MockApps()
    fix_portion_data_integrity(apps, None)

    # Assertions
    # A. Remap duplicate measuring units (id=95 deleted)
    assert not MeasuringUnit.objects.filter(id=95).exists()

    # B. Blank names and "g" name derived from measuring unit ("Gramm")
    p_empty.refresh_from_db()
    assert p_empty.name == "Gramm"
    p_g.refresh_from_db()
    assert p_g.name == "Gramm"

    # C. Weight calculated
    assert p_empty.weight_g == 5.0  # quantity 5 * mu.quantity 1.0
    assert p_g.weight_g == 10.0  # quantity 10 * mu.quantity 1.0

    # D. Deduplicated portions (p_dup2 soft deleted, RecipeItem updated to p_dup1)
    p_dup2.refresh_from_db()
    assert p_dup2.deleted_at is not None

    item.refresh_from_db()
    assert item.portion_id == p_dup1.id
