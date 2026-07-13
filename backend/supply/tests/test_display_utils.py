"""Tests for supply.utils display formatting functions."""

import pytest
from model_bakery import baker

from supply.models import Ingredient, MeasuringUnit, Portion
from supply.utils import build_package_display, build_portion_display, format_weight

# ---------------------------------------------------------------------------
# format_weight
# ---------------------------------------------------------------------------


class TestFormatWeight:
    def test_zero_returns_zero(self):
        assert format_weight(0) == "0g"

    def test_negative_returns_zero(self):
        assert format_weight(-5) == "0g"

    def test_under_1g_returns_mg(self):
        assert format_weight(0.3) == "300mg"

    def test_under_1g_small_value(self):
        assert format_weight(0.05) == "50mg"

    def test_exactly_1g(self):
        assert format_weight(1.0) == "1g"

    def test_1_to_9g_rounds_to_nearest(self):
        assert format_weight(3.7) == "4g"
        assert format_weight(1.1) == "1g"
        assert format_weight(8.9) == "9g"

    def test_under_50g_rounds_to_1g(self):
        assert format_weight(47.0) == "47g"
        assert format_weight(10.0) == "10g"
        assert format_weight(12.0) == "12g"

    def test_50_to_99g_rounds_to_5g(self):
        assert format_weight(53.0) == "55g"
        assert format_weight(67.0) == "65g"

    def test_100_to_999g_rounds_to_10g(self):
        assert format_weight(145.0) == "150g"
        assert format_weight(964.0) == "960g"
        assert format_weight(100.0) == "100g"

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
        return baker.make(Ingredient, name=name, slug=slug, status="approved")

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
        assert "7g" in display or "8g" in display  # 0.5 × 14g = 7g (rounded to 5g step)
        assert missing is False

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
        assert "300mg" in display
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
        ingredient = baker.make(Ingredient, name="", slug="apfel", status="approved")
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
        )
        display, missing = build_portion_display(2.24, portion, ingredient)
        assert "1 Portion Nudeln" in display
        assert "Gramm" not in display
        assert missing is False
        # 2.24 × 125g = 280g
        assert "280g" in display


# ---------------------------------------------------------------------------
# build_package_display
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBuildPackageDisplay:
    def _make_ingredient(self) -> Ingredient:
        return baker.make(Ingredient, name="Quark", slug="quark", status="approved")

    def _make_unit(self, name: str = "Pkg") -> MeasuringUnit:
        return baker.make(MeasuringUnit, name=name, quantity=1.0, unit="g")

    def _make_package_portion(self, ingredient, weight_g: float, name: str = "") -> Portion:
        unit = self._make_unit()
        if not name:
            name = f"{int(weight_g)}g Packung"
        return baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=unit,
            name=name,
            weight_g=weight_g,
            quantity=1.0,
            is_system=False,
        )

    def test_no_package_portions_returns_empty(self):
        ingredient = self._make_ingredient()
        # No non-system portions with weight_g > 0 exist (only system "g"/"Packung"/"Stück")
        # build_package_display should return "" when no user-defined package portions exist
        Portion.objects.filter(ingredient=ingredient, is_system=False).delete()
        result = build_package_display(750.0, ingredient)
        assert result == ""

    def test_single_package_exact_fit(self):
        ingredient = self._make_ingredient()
        self._make_package_portion(ingredient, weight_g=250.0, name="250g Packung")
        result = build_package_display(750.0, ingredient)
        assert "3×250g" in result

    def test_multiple_package_sizes(self):
        # build_package_display uses the smallest available package portion.
        # With 250g and 500g packages, 750g → 3×250g (smallest fits better).
        ingredient = self._make_ingredient()
        self._make_package_portion(ingredient, weight_g=250.0, name="250g Packung")
        self._make_package_portion(ingredient, weight_g=500.0, name="500g Packung")
        result = build_package_display(750.0, ingredient)
        # Smallest non-system portion wins: 3×250g
        assert "250g" in result
        assert result != ""

    def test_rounds_up_when_not_exact(self):
        ingredient = self._make_ingredient()
        self._make_package_portion(ingredient, weight_g=250.0, name="250g Packung")
        # 600 / 250 = 2.4 → always ceil = 3
        result = build_package_display(600.0, ingredient)
        assert "3×250g" in result

    def test_exact_fit_no_rounding(self):
        ingredient = self._make_ingredient()
        self._make_package_portion(ingredient, weight_g=250.0, name="250g Packung")
        # 750 / 250 = 3.0 → exactly 3
        result = build_package_display(750.0, ingredient)
        assert "3×250g" in result

    def test_ceil_when_floor_would_be_insufficient(self):
        ingredient = self._make_ingredient()
        self._make_package_portion(ingredient, weight_g=500.0, name="500g Packung")
        # 995 / 500 = 1.99 → ceil = 2, surplus = 5g = 0.5% < 10%
        # floor=1 would mean 500g for 995g — a shortage, so ceil=2 is used.
        # The floor shortcut only applies when floor > 0 AND surplus < 10%.
        # But floor=1 leaves 495g uncovered, so ceil=2 is correct.
        result = build_package_display(995.0, ingredient)
        assert "2×500g" in result

    def test_zero_quantity_returns_empty(self):
        ingredient = self._make_ingredient()
        self._make_package_portion(ingredient, weight_g=250.0, name="250g Packung")
        result = build_package_display(0.0, ingredient)
        assert result == ""
