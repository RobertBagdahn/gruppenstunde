"""Regression tests for merging parser and model ingredient data.

The observed defect: `_call_gemini_for_metadata` passed ingredients as one
concatenated string, so the model echoed "300 g Hähnchenbrustfilet(s)" as
`original_name`. The name-based merge never matched, and a source recipe with
10 ingredients produced 17 recipe items.
"""

import pytest

from recipe.services.import_service import ImportedIngredient
from recipe.services.url_import_service import (
    GeminiIngredientMatch,
    _ingredient_key,
    _merge_ingredient_sources,
)

CHEFKOCH_SOURCE = [
    ImportedIngredient(name="Hähnchenbrustfilet(s)", quantity="300", unit="g"),
    ImportedIngredient(name="m.-große Möhre(n)", quantity="4", unit=""),
    ImportedIngredient(name="Crème fraîche", quantity="3", unit="EL"),
    ImportedIngredient(name="Petersilie (gehackte)", quantity="1", unit="EL"),
    ImportedIngredient(name="Nudeln (Sorte nach Wahl)", quantity="200", unit="g"),
    ImportedIngredient(name="Öl", quantity="1", unit="EL"),
    ImportedIngredient(name="Salz und Pfeffer", quantity="", unit=""),
    ImportedIngredient(name="Orangensaft", quantity="50", unit="ml"),
    ImportedIngredient(name="Korianderpulver", quantity="", unit=""),
    ImportedIngredient(name="Currypulver", quantity="", unit=""),
]


def _model_entry(index: int, name: str, quantity: float, unit: str) -> GeminiIngredientMatch:
    return GeminiIngredientMatch(
        source_index=index,
        original_name=name,
        quantity=quantity,
        unit=unit,
        note="",
        estimated_portion_weight_g=100,
    )


class TestMergeIngredientSources:
    def test_produces_one_item_per_source_ingredient(self):
        """Ten source ingredients must never become more than ten entries."""
        model_output = [
            _model_entry(index, source.name, 1.0, source.unit) for index, source in enumerate(CHEFKOCH_SOURCE)
        ]

        merged = _merge_ingredient_sources(CHEFKOCH_SOURCE, model_output)

        assert len(merged) == len(CHEFKOCH_SOURCE) == 10

    def test_quantity_prefix_in_model_name_does_not_duplicate(self):
        """The exact failure mode observed with the real Chefkoch import."""
        model_output = [
            _model_entry(index, f"{source.quantity} {source.unit} {source.name}".strip(), 1.0, source.unit)
            for index, source in enumerate(CHEFKOCH_SOURCE)
        ]

        merged = _merge_ingredient_sources(CHEFKOCH_SOURCE, model_output)

        assert len(merged) == 10
        # IngredientMatcher must never receive a quantity prefix.
        assert [entry.original_name for entry in merged] == [s.name for s in CHEFKOCH_SOURCE]

    def test_missing_source_index_falls_back_to_name(self):
        """Degraded responses without an index still merge via the name."""
        model_output = [_model_entry(-1, source.name, 1.0, source.unit) for source in CHEFKOCH_SOURCE]

        merged = _merge_ingredient_sources(CHEFKOCH_SOURCE, model_output)

        assert len(merged) == 10
        assert [entry.original_name for entry in merged] == [s.name for s in CHEFKOCH_SOURCE]

    def test_model_omitting_ingredients_is_filled_from_parser(self):
        """Ingredients the model dropped are recovered from the parser."""
        model_output = [_model_entry(0, "Hähnchenbrustfilet(s)", 300.0, "g")]

        merged = _merge_ingredient_sources(CHEFKOCH_SOURCE, model_output)

        assert len(merged) == 10
        assert merged[2].original_name == "Crème fraîche"
        assert merged[2].unit == "EL"
        assert merged[2].quantity == 3.0

    def test_parser_fills_values_the_model_left_empty(self):
        model_output = [_model_entry(0, "Hähnchenbrustfilet(s)", 0.0, "")]

        merged = _merge_ingredient_sources(CHEFKOCH_SOURCE, model_output)

        assert merged[0].unit == "g"
        assert merged[0].quantity == 300.0

    def test_duplicate_source_index_does_not_overwrite(self):
        """Two entries claiming the same index must not drop an ingredient."""
        model_output = [
            _model_entry(0, "Hähnchenbrustfilet(s)", 300.0, "g"),
            _model_entry(0, "m.-große Möhre(n)", 4.0, "Stück"),
        ]

        merged = _merge_ingredient_sources(CHEFKOCH_SOURCE, model_output)

        assert len(merged) == 10
        assert merged[1].original_name == "m.-große Möhre(n)"


class TestIngredientKey:
    @pytest.mark.parametrize(
        ("raw", "expected_same_as"),
        [
            ("300 g Hähnchenbrustfilet(s)", "Hähnchenbrustfilet(s)"),
            ("3 EL Crème fraîche", "Crème fraîche"),
            ("50 ml Orangensaft", "Orangensaft"),
            ("  Currypulver  ", "Currypulver"),
        ],
    )
    def test_strips_quantity_and_unit_prefix(self, raw, expected_same_as):
        assert _ingredient_key(raw) == _ingredient_key(expected_same_as)

    def test_distinct_ingredients_keep_distinct_keys(self):
        assert _ingredient_key("Orangensaft") != _ingredient_key("Currypulver")
