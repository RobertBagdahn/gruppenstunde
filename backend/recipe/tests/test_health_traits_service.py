"""Tests for positive health traits computation (tasks 5.1–5.3)."""

import pytest

from recipe.services.health_traits_service import (
    BALANCED_SCORE_MAX,
    BALANCED_SCORE_MIN,
    FIBER_THRESHOLD_G,
    PROTEIN_ENERGY_PCT,
    SALT_THRESHOLD_G,
    SAT_FAT_THRESHOLD_G,
    SUGAR_THRESHOLD_G,
    compute_positive_traits,
    is_balanced,
    is_high_fiber,
    is_high_protein,
    is_low_salt,
    is_low_sat_fat,
    is_low_sugar,
)
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


# ---------------------------------------------------------------------------
# Unit tests for individual trait helpers
# ---------------------------------------------------------------------------


class TestIsHighFiber:
    def test_exactly_at_threshold(self):
        assert is_high_fiber(6.0) is True

    def test_above_threshold(self):
        assert is_high_fiber(6.1) is True

    def test_below_threshold(self):
        assert is_high_fiber(5.9) is False


class TestIsHighProtein:
    def test_exactly_at_threshold(self):
        # 20% of energy from protein: if energy = 1000 kJ, protein = 200 kJ / 17 ≈ 11.76g
        energy_kj = 1000.0
        protein_g = (PROTEIN_ENERGY_PCT / 100.0) * energy_kj / 17.0
        assert is_high_protein(protein_g, energy_kj) is True

    def test_above_threshold(self):
        assert is_high_protein(15.0, 1000.0) is True  # 15*17/1000*100 = 25.5%

    def test_below_threshold(self):
        assert is_high_protein(10.0, 1000.0) is False  # 10*17/1000*100 = 17%

    def test_zero_energy(self):
        assert is_high_protein(10.0, 0.0) is False


class TestIsLowSalt:
    def test_exactly_at_threshold(self):
        assert is_low_salt(0.3) is True

    def test_above_threshold(self):
        assert is_low_salt(0.31) is False

    def test_below_threshold(self):
        assert is_low_salt(0.1) is True


class TestIsLowSatFat:
    def test_exactly_at_threshold(self):
        assert is_low_sat_fat(1.5) is True

    def test_above_threshold(self):
        assert is_low_sat_fat(1.6) is False

    def test_below_threshold(self):
        assert is_low_sat_fat(1.0) is True


class TestIsLowSugar:
    def test_exactly_at_threshold(self):
        assert is_low_sugar(5.0) is True

    def test_above_threshold(self):
        assert is_low_sugar(5.1) is False

    def test_below_threshold(self):
        assert is_low_sugar(3.0) is True


class TestIsBalanced:
    def test_at_lower_bound(self):
        assert is_balanced(-1) is True

    def test_at_upper_bound(self):
        assert is_balanced(4) is True

    def test_below_range(self):
        assert is_balanced(-2) is False

    def test_above_range(self):
        assert is_balanced(5) is False

    def test_middle(self):
        assert is_balanced(1) is True


# ---------------------------------------------------------------------------
# Integration tests with actual Recipe objects
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestComputePositiveTraitsIntegration:
    def _make_recipe_with_nutrition(self, **nutrition_kwargs):
        """Helper: create recipe with one ingredient having given per-100g values."""
        defaults = {
            "energy_kj": 800.0,
            "protein_g": 5.0,
            "fat_g": 3.0,
            "fat_sat_g": 1.0,
            "carbohydrate_g": 30.0,
            "sugar_g": 2.0,
            "fibre_g": 3.0,
            "salt_g": 0.1,
        }
        defaults.update(nutrition_kwargs)
        ingredient = make_ingredient(**defaults)
        portion = make_portion(ingredient=ingredient, weight_g=100.0)
        recipe = make_recipe()
        make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)
        return recipe

    def test_all_traits_met(self):
        """Recipe meeting all thresholds returns all trait keys."""
        # high fiber (>=6), high protein (>=20% energy), low salt (<=0.3),
        # low sat fat (<=1.5), low sugar (<=5)
        # For high_protein: need protein_g * 17 / energy_kj >= 0.20
        # With energy_kj=500, need protein_g >= 500*0.20/17 ≈ 5.88
        recipe = self._make_recipe_with_nutrition(
            energy_kj=500.0,
            protein_g=6.0,    # 6*17/500 = 20.4%
            fat_g=2.0,
            fat_sat_g=1.0,
            carbohydrate_g=15.0,
            sugar_g=3.0,
            fibre_g=7.0,
            salt_g=0.1,
            sodium_mg=40.0,
            fructose_g=0.0,
            lactose_g=0.0,
        )
        traits = compute_positive_traits(recipe)
        assert "high_fiber" in traits
        assert "high_protein" in traits
        assert "low_salt" in traits
        assert "low_sat_fat" in traits
        assert "low_sugar" in traits

    def test_empty_recipe_returns_empty(self):
        """Recipe with no items returns empty traits list."""
        recipe = make_recipe()
        traits = compute_positive_traits(recipe)
        assert traits == []

    def test_no_traits_met(self):
        """Recipe violating all thresholds returns empty or only 'balanced'."""
        recipe = self._make_recipe_with_nutrition(
            energy_kj=2000.0,
            protein_g=3.0,    # 3*17/2000 = 2.55% — not high protein
            fat_g=20.0,
            fat_sat_g=10.0,   # not low sat fat
            carbohydrate_g=50.0,
            sugar_g=25.0,     # not low sugar
            fibre_g=1.0,      # not high fiber
            salt_g=3.0,       # not low salt
        )
        traits = compute_positive_traits(recipe)
        assert "high_fiber" not in traits
        assert "high_protein" not in traits
        assert "low_salt" not in traits
        assert "low_sat_fat" not in traits
        assert "low_sugar" not in traits
