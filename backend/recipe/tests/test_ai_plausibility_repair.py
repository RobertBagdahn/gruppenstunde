"""Tests for AI-based plausibility check + automatic repair of recipe quantities.

See openspec change `fix-portion-integrity-and-ai-estimate`, task group 2.
"""

from unittest.mock import patch

import pytest

from recipe.services.ai_ingredients_service import RecipeQuantityEstimationService
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestPlausibilityCheck:
    def test_is_implausible_for_huge_weight(self):
        """Regression: 'Käsespätzle' recipe #100 had 150kg for portions=1."""
        recipe = make_recipe(portions=1)
        ingredient = make_ingredient(name="frischer Apfel")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="100g Apfel", weight_g=150.0, rank=1)
        make_recipe_item(recipe=recipe, portion=portion, quantity=1000.0)  # 150_000g

        service = RecipeQuantityEstimationService()
        assert service.compute_weight_per_portion_g(recipe) == pytest.approx(150000.0)
        assert service.is_implausible(recipe) is True

    def test_is_implausible_for_tiny_weight(self):
        recipe = make_recipe(portions=1)
        ingredient = make_ingredient(name="Testzutat")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="100g Test", weight_g=100.0, rank=1)
        make_recipe_item(recipe=recipe, portion=portion, quantity=0.01)  # 1g total

        service = RecipeQuantityEstimationService()
        assert service.is_implausible(recipe) is True

    def test_is_plausible_for_realistic_weight(self):
        recipe = make_recipe(portions=1)
        ingredient = make_ingredient(name="Kartoffeln")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="100g Kartoffeln", weight_g=100.0, rank=1)
        make_recipe_item(recipe=recipe, portion=portion, quantity=2.0)  # 200g

        service = RecipeQuantityEstimationService()
        assert service.is_implausible(recipe) is False

    def test_check_and_repair_recipe_applies_estimate_for_implausible_recipe(self):
        recipe = make_recipe(portions=1)
        ingredient = make_ingredient(name="frischer Apfel")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="100g Apfel", weight_g=150.0, rank=1)
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=1000.0)

        service = RecipeQuantityEstimationService()
        fake_estimate = [
            {
                "item_id": item.id,
                "ingredient_name": "frischer Apfel",
                "quantity_per_portion": 1.0,
                "portion_id": portion.id,
                "unit": "100g Apfel",
                "grams_total": 150.0,
            },
        ]
        with patch.object(RecipeQuantityEstimationService, "estimate_quantities", return_value=fake_estimate):
            changed = service.check_and_repair_recipe(recipe)

        item.refresh_from_db()
        assert changed is True
        assert item.quantity == 1.0
        assert service.is_implausible(recipe) is False

    def test_check_and_repair_recipe_is_noop_for_plausible_recipe(self):
        recipe = make_recipe(portions=1)
        ingredient = make_ingredient(name="Kartoffeln")
        unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="100g Kartoffeln", weight_g=100.0, rank=1)
        make_recipe_item(recipe=recipe, portion=portion, quantity=2.0)

        service = RecipeQuantityEstimationService()
        with patch.object(RecipeQuantityEstimationService, "estimate_quantities") as mock_estimate:
            changed = service.check_and_repair_recipe(recipe)

        assert changed is False
        mock_estimate.assert_not_called()
