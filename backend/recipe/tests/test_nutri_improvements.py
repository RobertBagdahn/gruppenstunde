"""Tests for nutri_improvement_service — Nutri-Score improvement suggestions."""

import pytest

from recipe.services.nutri_improvement_service import calculate_nutri_improvements
from recipe.tests import make_recipe, make_recipe_item
from supply.models import Ingredient, MeasuringUnit, Portion


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def measuring_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


@pytest.fixture
def unhealthy_ingredient(db):
    """Ingredient with very high sugar and fat — pushes Nutri-Score down."""
    return Ingredient.objects.create(
        name="Zucker",
        slug="zucker",
        status="approved",
        energy_kj=1700.0,
        protein_g=0.0,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=100.0,
        sugar_g=100.0,
        fibre_g=0.0,
        salt_g=0.0,
    )


@pytest.fixture
def salty_ingredient(db):
    """Ingredient with high salt content."""
    return Ingredient.objects.create(
        name="Salz",
        slug="salz",
        status="approved",
        energy_kj=0.0,
        protein_g=0.0,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=100.0,
    )


@pytest.fixture
def flour_ingredient(db):
    """Moderate nutritional values."""
    return Ingredient.objects.create(
        name="Mehl",
        slug="mehl",
        status="approved",
        energy_kj=1418.0,
        protein_g=10.3,
        fat_g=1.0,
        fat_sat_g=0.2,
        carbohydrate_g=71.0,
        sugar_g=0.5,
        fibre_g=2.8,
        salt_g=0.01,
    )


@pytest.fixture
def portion_sugar(unhealthy_ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=unhealthy_ingredient,
        measuring_unit=measuring_unit,
        name="Gramm Zucker",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def portion_salt(salty_ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=salty_ingredient,
        measuring_unit=measuring_unit,
        name="Gramm Salz",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def portion_flour(flour_ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=flour_ingredient,
        measuring_unit=measuring_unit,
        name="Gramm Mehl",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def recipe_poor_nutrition(portion_sugar, portion_salt, portion_flour):
    """Recipe with poor nutritional values (high sugar, fat, salt) → Nutri-Score D or E."""
    recipe = make_recipe(
        cached_energy_kj=1500.0,
        cached_sugar_g=50.0,
        cached_fat_g=5.0,
        cached_salt_g=3.0,
        cached_fibre_g=1.0,
        cached_protein_g=5.0,
        cached_nutri_class=4,
    )
    make_recipe_item(recipe=recipe, portion=portion_sugar, quantity=200.0)
    make_recipe_item(recipe=recipe, portion=portion_salt, quantity=10.0)
    make_recipe_item(recipe=recipe, portion=portion_flour, quantity=300.0)
    return recipe


# ===========================================================================
# TestNutriImprovements
# ===========================================================================


@pytest.mark.django_db
class TestNutriImprovements:
    def test_returns_empty_for_nutri_score_a(self):
        """Recipe with Nutri-Score A (class 1) should return no improvements."""
        recipe = make_recipe(
            cached_energy_kj=200.0,
            cached_protein_g=15.0,
            cached_fat_g=2.0,
            cached_sugar_g=1.0,
            cached_fibre_g=8.0,
            cached_salt_g=0.1,
            cached_nutri_class=1,
        )
        result = calculate_nutri_improvements(recipe)
        assert result == []

    def test_returns_candidates_without_hard_limit(self, recipe_poor_nutrition):
        """Poor recipe should return candidates; the ranking service applies the Top-N limit."""
        result = calculate_nutri_improvements(recipe_poor_nutrition)
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_suggestion_has_required_fields(self, recipe_poor_nutrition):
        """Each suggestion must contain all required keys."""
        result = calculate_nutri_improvements(recipe_poor_nutrition)
        required_keys = {
            "parameter",
            "parameter_label",
            "direction",
            "current_value",
            "target_value",
            "affected_ingredients",
            "expected_nutri_class",
            "expected_nutri_label",
        }
        for item in result:
            assert required_keys.issubset(item.keys()), f"Missing keys: {required_keys - item.keys()}"

    def test_empty_recipe_returns_empty(self):
        """Recipe with no items → no nutritional data → empty list."""
        recipe = make_recipe(
            cached_energy_kj=None,
            cached_nutri_class=None,
        )
        result = calculate_nutri_improvements(recipe)
        assert result == []
