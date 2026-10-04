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
        make_portion(ing, name="Portion", quantity=1.0, weight_g=130.0, rank=1)
        assert UnitGramConverter.convert_to_portion_count(1, "EL", ing) == 0.12


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
        make_portion(ing, name="mittelgroße Zwiebel", quantity=1.0, weight_g=80.0, rank=1, weight_status="ai_proposed")
        with patch("core.services.gemini.gemini_call", return_value=(None, None)):
            assert UnitGramConverter.convert_to_portion_count(1, "Stück", ing) is None
