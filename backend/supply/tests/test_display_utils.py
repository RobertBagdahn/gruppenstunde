"""Tests for supply.utils display formatting functions."""

import pytest
from model_bakery import baker

from supply.models import Ingredient, MeasuringUnit, Portion
from supply.utils import build_portion_display, compute_package_need, format_weight, shopping_quantity

# ---------------------------------------------------------------------------
# format_weight
# ---------------------------------------------------------------------------


class TestFormatWeight:
    def test_zero_returns_zero(self):
        assert format_weight(0) == "0 g"

    def test_negative_returns_zero(self):
        assert format_weight(-5) == "0 g"

    def test_under_1g_returns_mg(self):
        assert format_weight(0.3) == "300 mg"

    def test_under_1g_small_value(self):
        assert format_weight(0.05) == "50 mg"

    def test_exactly_1g(self):
        assert format_weight(1.0) == "1 g"

    def test_1_to_9g_rounds_to_nearest(self):
        assert format_weight(3.7) == "4 g"
        assert format_weight(1.1) == "1 g"
        assert format_weight(8.9) == "9 g"

    def test_under_50g_rounds_to_1g(self):
        assert format_weight(47.0) == "47 g"
        assert format_weight(10.0) == "10 g"
        assert format_weight(12.0) == "12 g"

    def test_50_to_99g_rounds_to_5g(self):
        assert format_weight(53.0) == "55 g"
        assert format_weight(67.0) == "65 g"

    def test_100_to_999g_rounds_to_10g(self):
        assert format_weight(145.0) == "150 g"
        assert format_weight(964.0) == "960 g"
        assert format_weight(100.0) == "100 g"

    def test_exactly_1000g_returns_kg(self):
        result = format_weight(1000.0)
        assert result == "1,0 kg"

    def test_1500g_returns_kg(self):
        assert format_weight(1500.0) == "1,5 kg"

    def test_2000g_returns_kg(self):
        assert format_weight(2000.0) == "2,0 kg"

    def test_kg_uses_comma_not_dot(self):
        result = format_weight(1500.0)
        assert "," in result
        assert "." not in result


# ---------------------------------------------------------------------------
# build_portion_display
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBuildPortionDisplay:
    def _make_unit(self, name: str, qty: float = 1.0, unit_type: str = "g") -> MeasuringUnit:
        return baker.make(MeasuringUnit, name=name, quantity=qty, unit=unit_type)

    def _make_ingredient(self, name: str, slug: str = "test-ingredient") -> Ingredient:
        return baker.make(Ingredient, name=name, slug=slug, status="verified")

    def _make_portion(self, ingredient, measuring_unit, weight_g=100.0) -> Portion:
        return baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=measuring_unit,
            quantity=1.0,
            weight_g=weight_g,
        )

    def test_normal_portion_with_unit(self):
        ingredient = self._make_ingredient("Olivenöl")
        unit = self._make_unit("EL", qty=15.0, unit_type="ml")
        portion = self._make_portion(ingredient, unit, weight_g=14.0)
        display, missing = build_portion_display(0.5, portion, ingredient)
        assert "0,5" in display
        assert "EL" in display
        assert "Olivenöl" in display
        assert "7 g" in display or "8 g" in display  # 0.5 × 14g = 7g (rounded to 5g step)
        assert missing is False

    def test_pre_weighed_gram_portion_uses_portion_name(self):
        ingredient = self._make_ingredient("Langkornreis")
        unit = self._make_unit("Gramm")
        portion = baker.make(
            Portion, ingredient=ingredient, measuring_unit=unit, name="100g Reis", quantity=1.0, weight_g=100.0
        )
        display, _ = build_portion_display(1.5, portion, ingredient)
        assert display == "1,5 100g Reis (150 g)"

    def test_gram_unit_portion_keeps_unit_label(self):
        ingredient = self._make_ingredient("Langkornreis")
        unit = self._make_unit("Gramm")
        portion = baker.make(
            Portion, ingredient=ingredient, measuring_unit=unit, name="1 Gramm", quantity=1.0, weight_g=1.0
        )
        display, _ = build_portion_display(125, portion, ingredient)
        assert display.startswith("125 Gramm Langkornreis")

    def test_stueck_unit_is_suppressed(self):
        ingredient = self._make_ingredient("Äpfel")
        unit = self._make_unit("Stück")
        portion = self._make_portion(ingredient, unit, weight_g=285.0)
        display, _ = build_portion_display(3.4, portion, ingredient)
        assert "Stück" not in display
        assert "Äpfel" in display
        assert "3,4" in display

    def test_mg_threshold_for_small_weights(self):
        ingredient = self._make_ingredient("Salz")
        unit = self._make_unit("Prise")
        portion = self._make_portion(ingredient, unit, weight_g=0.3)
        display, _ = build_portion_display(1.0, portion, ingredient)
        assert "300 mg" in display
        assert "Prise" in display
        assert "Salz" in display

    def test_missing_weight_g_returns_flag(self):
        ingredient = self._make_ingredient("Salz")
        unit = self._make_unit("Prise")
        portion = self._make_portion(ingredient, unit, weight_g=None)
        # Override weight_g to None (baker may compute it)
        portion.weight_g = None
        display, missing = build_portion_display(1.0, portion, ingredient)
        assert missing is True
        assert "(" not in display  # no weight clause

    def test_missing_ingredient_name_uses_slug(self):
        ingredient = baker.make(Ingredient, name="", slug="apfel", status="verified")
        unit = self._make_unit("Stück")
        portion = self._make_portion(ingredient, unit, weight_g=200.0)
        display, _ = build_portion_display(2.0, portion, ingredient)
        assert "apfel" in display

    def test_whole_number_quantity_no_decimal(self):
        ingredient = self._make_ingredient("Honig")
        unit = self._make_unit("EL")
        portion = self._make_portion(ingredient, unit, weight_g=25.0)
        display, _ = build_portion_display(2.0, portion, ingredient)
        # Should be "2 EL Honig", not "2,0 EL Honig"
        assert display.startswith("2 ")

    def test_kg_display_for_large_quantity(self):
        ingredient = self._make_ingredient("Mehl")
        unit = self._make_unit("g")
        portion = self._make_portion(ingredient, unit, weight_g=1.0)
        display, _ = build_portion_display(1500.0, portion, ingredient)
        assert "1,5 kg" in display

    def test_composite_portion_uses_own_name_not_measuring_unit(self):
        """Regression test (recipe #434 bug class): a composite/pre-scaled
        portion (quantity != 1, e.g. "1 Portion Nudeln" = 125g) must be labeled
        with its own name, not the underlying measuring_unit name ("Gramm").
        `quantity` here is a *count* of the portion, not a gram amount.
        """
        ingredient = self._make_ingredient("Nudeln")
        gram_unit = self._make_unit("Gramm")
        portion = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="1 Portion Nudeln",
            quantity=125.0,
            weight_g=125.0,
            weight_status="confirmed",
        )
        display, missing = build_portion_display(2.24, portion, ingredient)
        assert "1 Portion Nudeln" in display
        assert "Gramm" not in display
        assert missing is False
        # 2.24 × 125g = 280g
        assert "280 g" in display


# ---------------------------------------------------------------------------
# compute_package_need / shopping_quantity
# ---------------------------------------------------------------------------


class TestComputePackageNeed:
    def test_just_over_package_boundary_rounds_down(self):
        # 1020 / 500 = 2.04 → within 5 % tolerance → 2 packages, 20 g short (covered by reserve)
        assert compute_package_need(1020, 500) == (2, -20.0)

    def test_clearly_over_boundary_rounds_up(self):
        # 700 / 250 = 2.8 → 3 packages, 50 g surplus
        assert compute_package_need(700, 250) == (3, 50.0)

    def test_tolerance_boundary_is_inclusive(self):
        # 1025 / 500 = 2.05 → exactly 5 % → round down
        assert compute_package_need(1025, 500) == (2, -25.0)
        assert compute_package_need(1026, 500) == (3, 474.0)

    def test_tiny_quantity_needs_at_least_one_package(self):
        assert compute_package_need(30, 500) == (1, 470.0)
        # below 5 % of a single package still means one package
        assert compute_package_need(10, 500) == (1, 490.0)

    def test_exact_fit(self):
        assert compute_package_need(750, 250) == (3, 0.0)

    def test_invalid_inputs(self):
        assert compute_package_need(0, 500) is None
        assert compute_package_need(100, 0) is None


@pytest.mark.django_db
class TestShoppingQuantity:
    def test_beverage_is_converted_to_ml(self):
        milk = baker.make(Ingredient, name="Milch", physical_viscosity="beverage", physical_density=1.03)
        assert shopping_quantity(9400, milk) == (9126.0, "ml")

    def test_liquid_is_converted_to_ml(self):
        oil = baker.make(Ingredient, name="Rapsöl", physical_viscosity="liquid", physical_density=0.92)
        assert shopping_quantity(920, oil) == (1000.0, "ml")

    def test_solid_stays_in_grams(self):
        flour = baker.make(Ingredient, name="Mehl", physical_viscosity="solid", physical_density=0.6)
        assert shopping_quantity(1500, flour) == (1500, "g")

    def test_without_ingredient_stays_in_grams(self):
        assert shopping_quantity(300, None) == (300, "g")
