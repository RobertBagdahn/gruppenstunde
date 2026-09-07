"""Tests for structured and fallback recipe URL parsing."""

from unittest.mock import patch

import pytest
from bs4 import BeautifulSoup

from recipe.services.import_service import (
    _json_ld_to_recipe,
    _parse_chefkoch,
    _parse_ingredient_string,
    _parse_microdata,
)


def test_json_ld_recipe_maps_servings_ingredients_steps_image_and_durations():
    recipe = _json_ld_to_recipe(
        {
            "@type": "Recipe",
            "name": "Kartoffelsuppe",
            "description": "Eine einfache Suppe.",
            "recipeYield": "4 Portionen",
            "image": {"url": "https://example.test/soup.jpg"},
            "recipeIngredient": ["500 g Kartoffeln", "2 EL Öl"],
            "recipeInstructions": [{"@type": "HowToStep", "text": "Kartoffeln kochen."}],
            "prepTime": "PT15M",
            "cookTime": "PT1H10M",
        },
        "https://example.test/soup",
    )

    assert recipe.servings == 4
    assert recipe.ingredients[0].name == "Kartoffeln"
    assert recipe.ingredients[1].quantity == "2"
    assert recipe.steps == ["Kartoffeln kochen."]
    assert recipe.image_url == "https://example.test/soup.jpg"
    assert recipe.prep_time_minutes == 15
    assert recipe.cook_time_minutes == 70


def test_chefkoch_fallback_extracts_complete_microdata_recipe():
    soup = BeautifulSoup(
        """
        <article>
          <h1>Pfannkuchen</h1>
          <span itemprop="recipeYield">8 Stück</span>
          <span itemprop="recipeIngredient">250 g Mehl</span>
          <span itemprop="recipeIngredient">2 Eier</span>
          <div itemprop="recipeInstructions">Teig verrühren.</div>
          <time itemprop="prepTime" datetime="PT10M"></time>
        </article>
        """,
        "html.parser",
    )

    recipe = _parse_chefkoch(soup, "https://www.chefkoch.de/rezepte/test")

    assert recipe is not None
    assert recipe.title == "Pfannkuchen"
    assert recipe.servings == 8
    assert len(recipe.ingredients) == 2
    assert recipe.steps == ["Teig verrühren."]
    assert recipe.prep_time_minutes == 10


def test_microdata_parser_extracts_steps_and_servings():
    soup = BeautifulSoup(
        """
        <div itemscope itemtype="https://schema.org/Recipe">
          <span itemprop="name">Salat</span>
          <span itemprop="recipeYield">2 Portionen</span>
          <span itemprop="recipeIngredient">1 Gurke</span>
          <div itemprop="recipeInstructions">Alles mischen.</div>
        </div>
        """,
        "html.parser",
    )

    recipe = _parse_microdata(soup, "https://example.test/salad")

    assert recipe is not None
    assert recipe.servings == 2
    assert recipe.steps == ["Alles mischen."]


def test_ingredient_parser_handles_german_units_and_adjectives():
    assert _parse_ingredient_string("2 Stück").name == "Stück"
    assert _parse_ingredient_string("2 Stück").unit == "Stück"
    assert _parse_ingredient_string("2 große Tomaten").name == "große Tomaten"
    assert _parse_ingredient_string("2 große Tomaten").unit == ""


def test_json_ld_parser_prefers_complete_recipe_node():
    soup = BeautifulSoup(
        '<script type="application/ld+json">'
        '[{"@type":"Recipe","name":"Kurz"},'
        '{"@type":"Recipe","name":"Vollständig","recipeIngredient":["2 Stück Äpfel"],"recipeInstructions":["Backen."]}]'
        "</script>",
        "html.parser",
    )

    from recipe.services.import_service import _parse_json_ld

    recipe = _parse_json_ld(soup, "https://example.test/recipe")
    assert recipe is not None
    assert recipe.title == "Vollständig"
    assert recipe.ingredients[0].unit == "Stück"


def test_import_rejects_private_hosts():
    from recipe.services.import_service import import_from_url

    with patch(
        "recipe.services.import_service.socket.getaddrinfo", return_value=[(None, None, None, None, ("127.0.0.1", 0))]
    ):
        with pytest.raises(ValueError):
            import_from_url("https://example.test/recipe")
