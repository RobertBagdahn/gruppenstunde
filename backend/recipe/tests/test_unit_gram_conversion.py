"""Tests for UnitGramConverter — unit → gram → portion conversion."""

from unittest.mock import patch

import pytest

from recipe.services.unit_gram_conversion import UnitGramConverter
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestMetricConversion:
    def test_grams_direct(self):
        ing = make_ingredient(name="Mehl")
        assert UnitGramConverter.convert_to_grams(200, "g", ing) == 200
        assert UnitGramConverter.convert_to_portion_count(200, "g", ing) == 200

    def test_kg_direct(self):
        ing = make_ingredient(name="Mehl")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=250.0, rank=1)
        assert UnitGramConverter.convert_to_grams(0.5, "kg", ing) == 500
        assert UnitGramConverter.convert_to_portion_count(0.5, "kg", ing) == 2

    def test_grams_ignore_density(self):
        ing = make_ingredient(name="Weizenmehl Type 405", physical_density=0.6)
        make_portion(ing, name="Tasse Mehl", quantity=1.0, weight_g=100.0, rank=1)
        assert UnitGramConverter.convert_to_grams(250, "g", ing) == 250
        assert UnitGramConverter.convert_to_portion_count(250, "g", ing) == 2.5

    def test_kg_ignores_density(self):
        ing = make_ingredient(name="Kartoffeln", physical_density=0.7)
        make_portion(ing, name="Portion", quantity=1.0, weight_g=100.0, rank=1)
        assert UnitGramConverter.convert_to_grams(1, "kg", ing) == 1000
        assert UnitGramConverter.convert_to_portion_count(1, "kg", ing) == 10

    def test_liter_without_density_uses_1000g(self):
        ing = make_ingredient(name="Wasser", physical_density=1.0)
        make_portion(ing, name="Portion", quantity=1.0, weight_g=200.0, rank=1)
        assert UnitGramConverter.convert_to_grams(1, "Liter", ing) == 1000
        assert UnitGramConverter.convert_to_portion_count(1, "Liter", ing) == 5

    def test_liter_with_density(self):
        ing = make_ingredient(name="Orangensaft", physical_density=1.05)
        make_portion(ing, name="Portion", quantity=1.0, weight_g=210.0, rank=1)
        assert UnitGramConverter.convert_to_grams(1, "Liter", ing) == 1050
        assert UnitGramConverter.convert_to_portion_count(1, "Liter", ing) == 5

    def test_ml_with_density(self):
        ing = make_ingredient(name="Orangensaft", physical_density=1.05)
        make_portion(ing, name="Portion", quantity=1.0, weight_g=105.0, rank=1)
        assert UnitGramConverter.convert_to_grams(100, "ml", ing) == 105
        assert UnitGramConverter.convert_to_portion_count(100, "ml", ing) == 1

    def test_standard_measure_el(self):
        ing = make_ingredient(name="Öl", physical_density=0.9)
        make_portion(ing, name="Portion", quantity=1.0, weight_g=13.5, rank=1)
        assert UnitGramConverter.convert_to_grams(1, "EL", ing) == 13.5
        assert UnitGramConverter.convert_to_portion_count(1, "EL", ing) == 1

    def test_rounding_to_two_decimals(self):
        ing = make_ingredient(name="Öl")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=50.0, rank=1)
        # 15 ml × category density 0.92 for oil = 13.8 g → 0.276 portions.
        assert UnitGramConverter.convert_to_portion_count(1, "EL", ing) == 0.28

    def test_tiny_count_switches_to_the_gram_portion(self):
        ing = make_ingredient(name="Öl")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=130.0, rank=1)

        result = UnitGramConverter.convert_to_portion(1, "EL", ing)

        assert result is not None
        assert result.portion.name == "g"
        assert result.count == 13.8


@pytest.mark.django_db
class TestContainerConversion:
    def test_gemini_estimate_converted(self):
        ing = make_ingredient(name="Ananasstücke (Dose)")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=150.0, rank=1)

        mock_response = type("R", (), {"text": '{"grams_per_unit": 350.0}'})()
        with patch("core.services.gemini.gemini_call", return_value=(mock_response, None)):
            assert UnitGramConverter.convert_to_grams(1, "Dose", ing) == 350
            assert UnitGramConverter.convert_to_portion_count(1, "Dose", ing) == 2.33

    def test_no_ai_estimate_for_anonymous_previews(self):
        ing = make_ingredient(name="Ananasstücke (Dose)")
        with patch("core.services.gemini.gemini_call") as mocked:
            assert UnitGramConverter.convert_to_grams(1, "Dose", ing, allow_ai_estimate=False) is None
            mocked.assert_not_called()

    def test_gemini_fallback_to_none(self):
        ing = make_ingredient(name="Ananasstücke (Dose)")
        with patch("core.services.gemini.gemini_call", return_value=(None, None)):
            assert UnitGramConverter.convert_to_grams(1, "Dose", ing) is None

    def test_memoized_per_ingredient_and_unit(self):
        ing = make_ingredient(name="Ananasstücke (Dose)")
        memo: dict[tuple[str, int], float] = {}

        mock_response = type("R", (), {"text": '{"grams_per_unit": 350.0}'})()
        with patch("core.services.gemini.gemini_call", return_value=(mock_response, None)) as mocked:
            assert UnitGramConverter.convert_to_grams(1, "Dose", ing, _memo=memo) == 350
            assert UnitGramConverter.convert_to_grams(2, "Dose", ing, _memo=memo) == 700
            assert mocked.call_count == 1

    def test_unknown_unit_returns_none(self):
        ing = make_ingredient(name="Ananas")
        assert UnitGramConverter.convert_to_grams(1, "xyz", ing) is None


@pytest.mark.django_db
class TestPortionBase:
    def test_no_portion_returns_none(self):
        from supply.models import Portion

        ing = make_ingredient(name="Mehl")
        Portion.objects.filter(ingredient=ing).delete()
        assert UnitGramConverter.convert_to_portion_count(200, "g", ing) is None

    def test_zero_quantity_returns_none(self):
        ing = make_ingredient(name="Mehl")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=100.0)
        assert UnitGramConverter.convert_to_portion_count(0, "g", ing) is None

    def test_empty_unit_returns_none(self):
        ing = make_ingredient(name="Mehl")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=100.0)
        assert UnitGramConverter.convert_to_grams(2, "", ing) is None


@pytest.mark.django_db
class TestDirectPortionMatch:
    """The recipe unit equals one of the ingredient's own portions: no detour via grams."""

    def test_two_tablespoons_olive_oil_is_two_portions(self):
        ing = make_ingredient(name="Olivenöl", physical_density=0.92)
        make_portion(ing, name="Esslöffel", quantity=1.0, weight_g=15.0, rank=1)
        assert UnitGramConverter.convert_to_portion_count(2, "EL", ing) == 2

    def test_one_onion_is_one_piece_portion(self):
        ing = make_ingredient(name="Zwiebel")
        make_portion(ing, name="mittelgroße Zwiebel", quantity=1.0, weight_g=80.0, rank=1, weight_status="confirmed")
        assert UnitGramConverter.convert_to_portion_count(1, "Stück", ing) == 1
        assert UnitGramConverter.convert_to_portion_count(1, "", ing) == 1

    def test_pinch_of_salt(self):
        ing = make_ingredient(name="Salz")
        make_portion(ing, name="Prise", quantity=1.0, weight_g=0.3, rank=1)
        assert UnitGramConverter.convert_to_portion_count(2, "Prise", ing) == 2

    def test_portion_quantity_divides(self):
        ing = make_ingredient(name="Öl")
        make_portion(ing, name="Esslöffel", quantity=2.0, weight_g=30.0, rank=1)
        assert UnitGramConverter.convert_to_portion_count(1, "EL", ing) == 0.5

    def test_metric_units_keep_the_gram_path(self):
        ing = make_ingredient(name="Mehl")
        make_portion(ing, name="Esslöffel", quantity=1.0, weight_g=10.0, rank=1)
        assert UnitGramConverter.convert_to_portion_count(50, "g", ing) == 5

    def test_unrelated_portion_falls_back_to_grams(self):
        ing = make_ingredient(name="Öl", physical_density=0.9)
        make_portion(ing, name="Portion", quantity=1.0, weight_g=13.5, rank=1)
        assert UnitGramConverter.convert_to_portion_count(1, "EL", ing) == 1

    def test_unconfirmed_piece_weight_is_not_trusted(self):
        ing = make_ingredient(name="Zwiebel")
        untrusted = make_portion(
            ing, name="mittelgroße Zwiebel", quantity=1.0, weight_g=80.0, rank=1, weight_status="ai_proposed"
        )
        with patch("core.services.gemini.gemini_call", return_value=(None, None)):
            result = UnitGramConverter.convert_to_portion(1, "Stück", ing)
        # The typical piece weight (100 g) is used, never the AI-proposed 80 g.
        assert result is not None
        assert result.portion.id != untrusted.id
        assert result.count * result.portion.weight_g == 100

    def test_unknown_piece_without_trusted_portion_stays_open(self):
        ing = make_ingredient(name="Freekeh")
        make_portion(ing, name="Stück", quantity=1.0, weight_g=80.0, rank=1, weight_status="ai_proposed")
        with patch("core.services.gemini.gemini_call", return_value=(None, None)):
            assert UnitGramConverter.convert_to_portion_count(1, "Stück", ing) is None


@pytest.mark.django_db
class TestDirectPortionMatching:
    """A recipe unit that is one of the ingredient's own portions counts that portion (name or measuring unit)."""

    @pytest.mark.parametrize(
        ("unit", "portion_name"),
        [
            ("Dosen", "Dose"),
            ("Zehen", "Zehe"),
            ("Scheiben", "Scheibe"),
            ("Gläser", "Glas"),
            ("Packungen", "Packung"),
        ],
    )
    def test_plural_units_match_the_singular_portion(self, unit, portion_name):
        ing = make_ingredient(name=f"Zutat {portion_name}")
        portion = make_portion(ing, name=portion_name, quantity=1.0, weight_g=100.0, rank=2, weight_status="confirmed")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=500.0, rank=1, weight_status="confirmed")

        result = UnitGramConverter.convert_to_portion(3, unit, ing, allow_ai_estimate=False)

        assert result is not None
        assert (result.count, result.portion.id) == (3.0, portion.id)

    def test_matches_through_the_measuring_unit_name(self):
        from supply.tests import make_measuring_unit

        spoon = make_measuring_unit(name="Esslöffel", quantity=15, unit="g")
        ing = make_ingredient(name="Honig Direkt")
        portion = make_portion(
            ing,
            name="gehäufter Löffel",
            quantity=1.0,
            weight_g=25.0,
            rank=2,
            weight_status="confirmed",
            measuring_unit=spoon,
        )
        make_portion(ing, name="Glas", quantity=1.0, weight_g=500.0, rank=1, weight_status="confirmed")

        result = UnitGramConverter.convert_to_portion(2, "EL", ing, allow_ai_estimate=False)

        assert result is not None
        assert (result.count, result.portion.id) == (2.0, portion.id)


@pytest.mark.django_db
class TestImportMatchingOverhaul:
    """Rules from the Chefkoch benchmark (openspec import-ingredient-matching-overhaul)."""

    def test_teaspoon_portion_is_recognized_by_its_name(self):
        ing = make_ingredient(name="Knoblauchpulver Test")
        portion = make_portion(ing, name="1 TL (2g)", quantity=1.0, weight_g=2.0, rank=1, weight_status="imported")

        result = UnitGramConverter.convert_to_portion(1, "TL", ing, allow_ai_estimate=False)

        assert result is not None
        assert (result.count, result.portion.id) == (1.0, portion.id)

    def test_ml_portion_with_spoon_measuring_unit_is_not_a_spoon(self):
        from supply.tests import make_measuring_unit

        spoon = make_measuring_unit(name="Esslöffel", quantity=10, unit="g")
        ing = make_ingredient(name="Limettensaft Test")
        make_portion(
            ing, name="200 ml", quantity=200.0, weight_g=200.0, rank=1, weight_status="imported", measuring_unit=spoon
        )

        result = UnitGramConverter.convert_to_portion(1, "EL", ing, allow_ai_estimate=False)

        assert result is not None
        assert result.count * result.portion.weight_g == pytest.approx(15)

    def test_implausible_spoon_portion_falls_back_to_the_standard_measure(self):
        ing = make_ingredient(name="Honig Test")
        make_portion(ing, name="1 EL Honig", quantity=1.0, weight_g=10.0, rank=1, weight_status="imported")

        assert UnitGramConverter.convert_to_grams(1, "EL", ing) == pytest.approx(21)

    def test_size_selects_or_scales_piece_portions(self):
        ing = make_ingredient(name="Zwiebel Test")
        make_portion(ing, name="Stück", quantity=1.0, weight_g=100.0, rank=1, weight_status="confirmed")
        small = make_portion(ing, name="kleines Stück", quantity=1.0, weight_g=50.0, rank=2, weight_status="confirmed")

        large = UnitGramConverter.convert_to_portion(3, "", ing, size="large")
        assert large is not None
        assert large.count * large.portion.weight_g == pytest.approx(450)

        tiny = UnitGramConverter.convert_to_portion(2, "", ing, size="small")
        assert tiny is not None
        assert (tiny.count, tiny.portion.id) == (2.0, small.id)

        plain = UnitGramConverter.convert_to_portion(1, "", ing)
        assert plain is not None
        assert plain.portion.weight_g == 100

    def test_piece_weight_table_without_piece_portion(self):
        ing = make_ingredient(name="Kirschtomaten Test")
        make_portion(ing, name="100g", quantity=100.0, weight_g=100.0, rank=2, weight_status="imported")

        assert UnitGramConverter.convert_to_grams(10, "", ing) == pytest.approx(150)

    @pytest.mark.parametrize(
        ("unit", "name", "hint", "grams"),
        [
            ("Bund", "Rosmarin", "", 20),
            ("Pck.", "Backpulver", "", 16),
            ("Packung", "Blätterteig", "tk Blätterteig", 450),
            ("Stange/n", "Lauch", "", 200),
            ("Knolle", "Sellerie (Knolle)", "", 700),
            ("Glas", "Weißwein", "", 150),
        ],
    )
    def test_standard_unit_weights_without_ai(self, unit, name, hint, grams):
        ing = make_ingredient(name=name)
        with patch("core.services.gemini.gemini_call") as mocked:
            assert UnitGramConverter.convert_to_grams(1, unit, ing, hint=hint) == pytest.approx(grams)
            mocked.assert_not_called()

    def test_implausible_pinch_portion_is_replaced_by_half_a_gram(self):
        ing = make_ingredient(name="Cayennepfeffer Test")
        make_portion(ing, name="Prise", quantity=1.0, weight_g=1.0, rank=1, weight_status="confirmed")

        result = UnitGramConverter.convert_to_portion(1, "Prise", ing)

        assert result is not None
        assert result.count * result.portion.weight_g == pytest.approx(0.5)

    def test_powder_without_density_uses_the_category_density(self):
        ing = make_ingredient(name="Kartoffelpüree-Pulver Test")

        assert UnitGramConverter.convert_to_grams(4, "EL", ing) == pytest.approx(30)

    def test_tiny_amount_uses_a_readable_portion(self):
        ing = make_ingredient(name="Zucker Test")
        make_portion(ing, name="100g Zucker", quantity=100.0, weight_g=100.0, rank=1, weight_status="imported")

        result = UnitGramConverter.convert_to_portion(1, "Prise", ing)

        assert result is not None
        assert result.portion.name == "g"
        assert result.count == 0.5
