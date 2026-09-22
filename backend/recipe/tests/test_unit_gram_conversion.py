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
