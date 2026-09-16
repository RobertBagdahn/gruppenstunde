"""Cross-consumer regression tests for trusted portion weights."""

import pytest

from planner.services.variant_service import _item_total_for_field
from recipe.services.recipe_checks import _calculate_item_weight_g
from supply.services.portion_resolution import resolve_trusted_weight
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
def test_confirmed_weight_is_shared_by_recipe_and_variant_consumers():
    ingredient = make_ingredient(name="Apfel", price_per_kg=4.0, energy_kcal=52.0)
    unit = make_measuring_unit(name="Gramm", unit="g", quantity=1.0)
    portion = make_portion(
        ingredient=ingredient,
        measuring_unit=unit,
        name="Stück",
        quantity=1.0,
        weight_g=150.0,
        weight_status="confirmed",
    )

    assert resolve_trusted_weight(portion) == 150.0

    item = type("RecipeItem", (), {"quantity": 2.0, "portion": portion})()

    assert _calculate_item_weight_g(item) == 300.0
    assert _item_total_for_field(item, "energy_kcal") == pytest.approx(156.0)
    assert _item_total_for_field(item, "price") == pytest.approx(1.2)


@pytest.mark.django_db
def test_unconfirmed_piece_weight_is_excluded_consistently():
    ingredient = make_ingredient(name="Zwiebel", price_per_kg=2.0, energy_kcal=40.0)
    unit = make_measuring_unit(name="Gramm", unit="g", quantity=1.0)
    portion = make_portion(
        ingredient=ingredient,
        measuring_unit=unit,
        name="Stück",
        quantity=1.0,
        weight_g=120.0,
        weight_status="ai_proposed",
    )

    item = type("RecipeItem", (), {"quantity": 1.0, "portion": portion})()

    assert resolve_trusted_weight(portion) is None
    assert _calculate_item_weight_g(item) == 0.0
    assert _item_total_for_field(item, "energy_kcal") == 0.0
    assert _item_total_for_field(item, "price") == 0.0
