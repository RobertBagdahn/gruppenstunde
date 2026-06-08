"""Tests for nutrition contribution computation (tasks 5.4–5.6)."""

import pytest
from django.test import Client

from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestNutritionContributions:
    def _make_recipe_with_items(self):
        """Create a recipe with 3 items for contribution testing."""
        recipe = make_recipe()

        # Ingredient 1: Nudeln — high carbs
        nudeln = make_ingredient(
            name="Nudeln",
            energy_kcal=359, protein_g=12.0, fat_g=2.0, fat_sat_g=0.5,
            carbohydrate_g=70.0, sugar_g=2.0, fibre_g=3.0, salt_g=0.01,
        )
        p_nudeln = make_portion(ingredient=nudeln, name="200g Nudeln", weight_g=200.0)
        make_recipe_item(recipe=recipe, portion=p_nudeln, quantity=1.0)

        # Ingredient 2: Tomatensoße — moderate salt
        tomaten = make_ingredient(
            name="Tomatensoße",
            energy_kcal=48, protein_g=1.5, fat_g=0.5, fat_sat_g=0.1,
            carbohydrate_g=8.0, sugar_g=6.0, fibre_g=1.5, salt_g=1.2,
        )
        p_tomaten = make_portion(ingredient=tomaten, name="150g Soße", weight_g=150.0)
        make_recipe_item(recipe=recipe, portion=p_tomaten, quantity=1.0)

        # Ingredient 3: Käse — high fat
        kaese = make_ingredient(
            name="Käse",
            energy_kcal=382, protein_g=25.0, fat_g=30.0, fat_sat_g=18.0,
            carbohydrate_g=0.5, sugar_g=0.5, fibre_g=0.0, salt_g=1.8,
        )
        p_kaese = make_portion(ingredient=kaese, name="50g Käse", weight_g=50.0)
        make_recipe_item(recipe=recipe, portion=p_kaese, quantity=1.0)

        return recipe

    def test_contributions_sum_approximately_100(self):
        """Sum of percent_of_recipe across items for each parameter should ≈ 100."""
        recipe = self._make_recipe_with_items()
        client = Client()
        resp = client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        assert resp.status_code == 200
        data = resp.json()

        # Group contributions by parameter
        param_sums: dict[str, float] = {}
        for item in data["items"]:
            for contrib in item["contributions"]:
                param = contrib["parameter"]
                param_sums[param] = param_sums.get(param, 0.0) + contrib["percent_of_recipe"]

        for param, total in param_sums.items():
            assert 99.0 <= total <= 101.0, f"{param}: sum={total}"

    def test_sugar_free_items_have_zero_sugar_contribution(self):
        """Items with no sugar should have 0 sugar contribution."""
        recipe = make_recipe()
        ing = make_ingredient(
            name="Wasser",
            energy_kcal=0, protein_g=0.0, fat_g=0.0, fat_sat_g=0.0,
            carbohydrate_g=0.0, sugar_g=0.0, fibre_g=0.0, salt_g=0.0,
        )
        portion = make_portion(ingredient=ing, weight_g=500.0)
        make_recipe_item(recipe=recipe, portion=portion, quantity=1.0)

        client = Client()
        resp = client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        assert resp.status_code == 200
        data = resp.json()

        for item in data["items"]:
            sugar_contribs = [c for c in item["contributions"] if c["parameter"] == "sugar"]
            assert len(sugar_contribs) == 1
            assert sugar_contribs[0]["absolute"] == 0.0
            assert sugar_contribs[0]["percent_of_recipe"] == 0.0

    def test_absolute_values_consistent(self):
        """Contribution absolute values should match item nutrition fields."""
        recipe = self._make_recipe_with_items()
        client = Client()
        resp = client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        assert resp.status_code == 200
        data = resp.json()

        field_map = {
            "energy": "energy_kcal",
            "protein": "protein_g",
            "fat": "fat_g",
            "sat_fat": "fat_sat_g",
            "carbs": "carbohydrate_g",
            "sugar": "sugar_g",
            "salt": "salt_g",
            "fiber": "fibre_g",
        }

        for item in data["items"]:
            for contrib in item["contributions"]:
                field = field_map[contrib["parameter"]]
                # Both rounded to 1 decimal
                assert abs(contrib["absolute"] - item[field]) < 0.15, (
                    f"Item {item['ingredient_name']}, param {contrib['parameter']}: "
                    f"contribution={contrib['absolute']}, field={item[field]}"
                )

    def test_positive_traits_in_breakdown_response(self):
        """Breakdown response should include positive_traits field."""
        recipe = self._make_recipe_with_items()
        client = Client()
        resp = client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        assert resp.status_code == 200
        data = resp.json()
        assert "positive_traits" in data
        assert isinstance(data["positive_traits"], list)
