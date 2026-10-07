"""Tests for weight-based amount formatting used by printed exports."""

from types import SimpleNamespace

from supply.services.amount_formatting import (
    format_cooking_volume,
    format_cooking_weight,
    format_portion_amount,
    format_shopping_amount,
    format_shopping_item,
)


def _portion(name: str, unit: str, quantity: float, weight_g: float | None, status: str | None = None):
    return SimpleNamespace(
        name=name,
        quantity=quantity,
        weight_g=weight_g,
        weight_status=status,
        measuring_unit=SimpleNamespace(name=unit),
    )


class TestCookingFormats:
    def test_weight_tiers(self):
        assert format_cooking_weight(5.3) == "5,3 g"
        assert format_cooking_weight(528) == "528 g"
        assert format_cooking_weight(4440) == "4,44 kg"
        assert format_cooking_weight(2800) == "2,8 kg"

    def test_volume_tiers(self):
        assert format_cooking_volume(255) == "255 ml"
        assert format_cooking_volume(1050) == "1,05 l"


class TestPortionAmount:
    def test_pre_weighed_portion_uses_weight(self):
        portion = _portion("100g Gurke", "Gramm", 1.0, 100.0)
        # 0.3 portions per person * 35 persons
        assert format_portion_amount(0.3 * 35, portion) == "1,05 kg"

    def test_volume_portion(self):
        portion = _portion("1 EL (10ml)", "Milliliter", 10.0, 10.0)
        assert format_portion_amount(3 * 35, portion) == "1,05 l"

    def test_direct_metric_portion(self):
        portion = _portion("Gramm", "Gramm", 1.0, 1.0)
        assert format_portion_amount(16 * 34, portion) == "544 g"

    def test_no_portion_means_grams(self):
        assert format_portion_amount(250, None) == "250 g"

    def test_piece_portion_with_trusted_weight(self):
        portion = _portion("Stück", "Gramm", 1.0, 60.0, status="confirmed")
        assert format_portion_amount(55.5, portion) == "56 Stück (≈ 3,33 kg)"

    def test_piece_portion_with_legacy_one_gram_weight_has_no_gram_claim(self):
        portion = _portion("Stück", "Gramm", 1.0, 1.0)
        assert format_portion_amount(12, portion) == "12 Stück"

    def test_piece_portion_with_unconfirmed_weight_shows_approximate_grams(self):
        portion = _portion("Stück", "Gramm", 1.0, 60.0)
        assert format_portion_amount(12, portion) == "12 Stück (≈ 720 g)"

    def test_named_piece_count_is_resolved(self):
        portion = _portion("6 Eier", "Gramm", 1.0, 360.0, status="confirmed")
        assert format_portion_amount(2, portion).startswith("12 Eier")

    def test_trailing_weight_in_piece_name_is_dropped(self):
        portion = _portion("1 Stück (400g)", "Gramm", 1.0, 400.0, status="confirmed")
        assert format_portion_amount(7, portion) == "7 Stück (≈ 2,8 kg)"

    def test_zero_quantity_is_empty(self):
        assert format_portion_amount(0, None) == ""


class TestShoppingFormat:
    def test_amount_units(self):
        assert format_shopping_amount(8800, "g") == "8,8 kg"
        assert format_shopping_amount(250, "ml") == "250 ml"
        assert format_shopping_amount(9100, "ml") == "9,1 l"
        assert format_shopping_amount(0, "g") == ""

    def test_package_need(self):
        item = SimpleNamespace(
            quantity=8800.0,
            total_quantity_g=8800.0,
            unit="g",
            package_options=[{"count": 18, "package_name": "Packung", "weight_g": 500.0, "volume_ml": None}],
            piece_equivalent=None,
        )
        assert format_shopping_item(item) == "8,8 kg · 18 × 500-g-Packung"

    def test_piece_equivalent_fallback(self):
        item = SimpleNamespace(
            quantity=3100.0,
            total_quantity_g=3100.0,
            unit="g",
            package_options=None,
            piece_equivalent={"count": 7.6, "portion_name": "Stück"},
        )
        assert format_shopping_item(item) == "3,1 kg · ≈ 8 Stück"

    def test_amount_only(self):
        item = SimpleNamespace(
            quantity=320.0, total_quantity_g=320.0, unit="g", package_options=None, piece_equivalent=None
        )
        assert format_shopping_item(item) == "320 g"

    def test_piece_equivalent_rounds_up_to_whole_pieces(self):
        item = SimpleNamespace(
            quantity=5700.0,
            total_quantity_g=5700.0,
            unit="g",
            package_options=None,
            piece_equivalent={"count": 22.8, "portion_name": "Stück"},
        )
        assert format_shopping_item(item) == "5,7 kg · ≈ 23 Stück"

    def test_weight_package_and_pieces_are_all_shown(self):
        item = SimpleNamespace(
            quantity=5700.0,
            total_quantity_g=5700.0,
            unit="g",
            package_options=[{"count": 23, "package_name": "Stück", "weight_g": 250.0, "volume_ml": None}],
            piece_equivalent={"count": 22.8, "portion_name": "Stück"},
        )
        assert format_shopping_item(item) == "5,7 kg · 23 × 250-g-Stück · ≈ 23 Stück"
