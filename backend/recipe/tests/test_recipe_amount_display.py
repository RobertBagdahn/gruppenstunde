"""Parity tests: recipe amounts match frontend-food formatScaledRecipeAmount / formatQuantity."""

import pytest

from recipe.services.recipe_amount_display import (
    RecipeAmount,
    format_amount_label,
    format_display_quantity,
    format_scaled_recipe_amount,
)


@pytest.mark.parametrize(
    ("grams", "viscosity", "density", "expected"),
    [
        (0.25, "solid", 1.0, "250 mg"),
        (17.5, "solid", 1.0, "18 g"),
        (73, "solid", 1.0, "75 g"),
        (1234, "solid", 1.0, "1,3 kg"),
        (2000, "solid", 1.0, "2 kg"),
        (515, "beverage", 1.03, "500 ml"),
        (1500, "beverage", 1.0, "1,5 l"),
        (500, "liquid", 1.0, "500 g"),
        (500, "beverage", 0, "500 g"),
        (0, "beverage", 1.0, "0 g"),
    ],
)
def test_format_display_quantity_matches_frontend_format_quantity(grams, viscosity, density, expected):
    assert format_display_quantity(grams, viscosity, density) == expected


def test_portion_item_reads_as_portion_count_with_grams():
    amount = format_scaled_recipe_amount(quantity=0.35, weight_g=17.5, portion_name="Portion", unit_short="Portion")
    assert amount == RecipeAmount("0,35 Portion", "18 g")


def test_spoon_portion_is_abbreviated_and_scaled():
    amount = format_scaled_recipe_amount(quantity=1, weight_g=13.8, portion_name="Esslöffel", scale=2)
    assert amount == RecipeAmount("2 EL", "28 g")


def test_named_count_portion_multiplies_the_count():
    amount = format_scaled_recipe_amount(quantity=1.5, weight_g=None, portion_name="2 Scheiben")
    assert amount == RecipeAmount("3 Scheiben", None)


def test_metric_portion_shows_only_its_weight():
    amount = format_scaled_recipe_amount(quantity=2, weight_g=200, portion_name="100g Reis")
    assert amount == RecipeAmount("200 g", None)


def test_direct_gram_item_without_weight_falls_back_to_unit():
    amount = format_scaled_recipe_amount(quantity=1500, weight_g=None, portion_name=None, unit_short="g")
    assert amount == RecipeAmount("1.500 g", None)


def test_label_omits_missing_amount():
    assert format_amount_label(RecipeAmount("—", None), "Salz") == "Salz"
    assert format_amount_label(RecipeAmount("0,35 Portion", "18 g"), "Soja") == "0,35 Portion (18 g) Soja"
