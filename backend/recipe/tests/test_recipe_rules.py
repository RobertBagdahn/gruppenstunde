import pytest
from django.test import Client

from recipe.models import Rule, Recipe
from recipe.services.recipe_checks import evaluate_recipe_rules, recalculate_recipe_cache
from recipe.tests import make_recipe, make_recipe_item, make_rule, make_recipe_hint
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestRecipeRulesService:
    """Verify evaluate_recipe_rules service logic."""

    def _setup_recipe(self) -> Recipe:
        recipe = make_recipe(servings=1)
        # Ingredient 1: Brokkoli
        ing = make_ingredient(
            name="Brokkoli",
            energy_kj=100.0,
            protein_g=4.0,
            fat_g=0.0,
            fat_sat_g=0.0,
            carbohydrate_g=3.0,
            sugar_g=1.0,
            fibre_g=3.0,
            salt_g=0.1,
        )
        portion = make_portion(ingredient=ing, quantity=200.0, weight_g=200.0, name="200g Brokkoli")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        return recipe

    def test_evaluate_recipe_rules_mixed_results(self):
        recipe = self._setup_recipe()

        # Rule 1: Protein min target of 3g (green)
        # 200g brokkoli total weight = 200g. Each recipe = 1 Normportion.
        # Factor = 200 / 100 = 2.0.
        # Brokkoli protein = 4g/100g. 4 * 2.0 = 8.0g per Normportion.
        make_recipe_hint(
            name="Protein Regel",
            parameter="protein_g",
            min_green=3.0,
            min_yellow=2.0,
            unit="g",
            sort_order=1,
        )

        # Rule 2: Sugar max target of 0.2g (red)
        # Brokkoli sugar = 1.0g/100g. 1.0 * 2.0 = 2.0g per Normportion.
        make_recipe_hint(
            name="Zucker Regel",
            parameter="sugar_g",
            max_green=0.2,
            max_yellow=0.5,
            unit="g",
            sort_order=2,
        )

        # Rule 3: Fiber min target of 7.0g (yellow)
        # Brokkoli fiber = 3.0g/100g. 3.0 * 2.0 = 6.0g per Normportion.
        make_recipe_hint(
            name="Ballaststoff Regel",
            parameter="fibre_g",
            min_green=7.0,
            min_yellow=4.0,
            unit="g",
            sort_order=3,
        )

        result = evaluate_recipe_rules(recipe)

        assert result["green_count"] == 1
        assert result["yellow_count"] == 1
        assert result["red_count"] == 1
        assert len(result["items"]) == 3

        # Check order (sort_order)
        assert result["items"][0]["name"] == "Protein Regel"
        assert result["items"][1]["name"] == "Zucker Regel"
        assert result["items"][2]["name"] == "Ballaststoff Regel"

        # Check values
        protein_item = result["items"][0]
        assert protein_item["status"] == "green"
        assert protein_item["value_per_serving"] == 8.0
        assert protein_item["threshold"] == 3.0
        assert protein_item["threshold_direction"] == "min"

    def test_recipe_rules_apply_to_cold_meal(self):
        recipe = self._setup_recipe()
        recipe.recipe_type = "cold_meal"
        recipe.save(update_fields=["recipe_type"])

        make_recipe_hint(
            name="Protein Regel",
            parameter="protein_g",
            min_green=3.0,
            min_yellow=2.0,
            unit="g",
        )

        result = evaluate_recipe_rules(recipe)

        assert result["is_applicable"] is True
        assert len(result["items"]) == 1

    def test_recipe_rules_not_applicable_to_breakfast(self):
        recipe = self._setup_recipe()
        recipe.recipe_type = "breakfast"
        recipe.save(update_fields=["recipe_type"])

        make_recipe_hint(
            name="Protein Regel",
            parameter="protein_g",
            min_green=3.0,
            min_yellow=2.0,
            unit="g",
        )

        result = evaluate_recipe_rules(recipe)

        assert result["is_applicable"] is False
        assert result["message"]
        assert result["items"] == []
        assert result["green_count"] == 0
        assert result["yellow_count"] == 0
        assert result["red_count"] == 0

    def test_inactive_rules_ignored(self):
        recipe = self._setup_recipe()
        make_recipe_hint(
            name="Inaktive Regel",
            parameter="protein_g",
            min_green=1.0,
            is_active=False,
        )

        result = evaluate_recipe_rules(recipe)
        assert len(result["items"]) == 0

    def test_nutri_class_display_value(self):
        recipe = self._setup_recipe()
        # Set cached nutri class to 2 (B)
        recipe.cached_nutri_class = "2"
        recipe.save()

        make_recipe_hint(
            name="Nutri Regel",
            parameter="nutri_class",
            max_green=1,
            max_yellow=3,
        )

        result = evaluate_recipe_rules(recipe)
        assert len(result["items"]) == 1
        nutri_item = result["items"][0]
        assert nutri_item["status"] == "yellow"
        assert nutri_item["display_value"] == "B"
        assert nutri_item["unit"] == ""

    def test_evaluate_recipe_rules_with_normportion_scaling(self):
        recipe = make_recipe(servings=1)
        ing = make_ingredient(
            name="Brokkoli",
            protein_g=10.0,
        )
        portion = make_portion(ingredient=ing, quantity=200.0, weight_g=200.0, name="200g Brokkoli")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        # 200g total weight, factor = 200 / 100 = 2.0.
        # Protein 10g/100g * 2.0 = 20.0g per Normportion.
        make_recipe_hint(
            name="Protein Regel",
            parameter="protein_g",
            min_green=25.0,
            min_yellow=15.0,
            unit="g",
        )

        result = evaluate_recipe_rules(recipe)
        assert len(result["items"]) == 1
        item = result["items"][0]
        assert item["status"] == "yellow"
        assert item["value_per_serving"] == 20.0

    def test_price_and_weight_rules_use_normportion_values(self):
        recipe = make_recipe(servings=1)
        ing = make_ingredient(name="Reis", price_per_kg=4.00)
        portion = make_portion(ingredient=ing, quantity=800.0, weight_g=800.0, name="800g Reis")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        # price_total = 800g * 4.00€/kg = 3.20€ (Normportion total).
        # weight_g = 800g (Normportion total).
        make_recipe_hint(
            name="Preis Regel",
            parameter="price_total",
            max_green=4.0,
            max_yellow=5.0,
            unit="€",
            sort_order=1,
        )
        make_recipe_hint(
            name="Gewicht Regel",
            parameter="weight_g",
            min_green=600.0,
            min_yellow=400.0,
            max_green=900.0,
            max_yellow=1000.0,
            unit="g",
            sort_order=2,
        )

        result = evaluate_recipe_rules(recipe)

        assert result["items"][0]["value_per_serving"] == 3.2
        assert result["items"][0]["status"] == "green"
        assert result["items"][1]["value_per_serving"] == 800.0
        assert result["items"][1]["status"] == "green"


@pytest.mark.django_db
class TestRecipeRulesAPI:
    """Verify the recipe rules API endpoint."""

    def test_get_recipe_rules_endpoint_success(self, auth_client: Client):
        recipe = make_recipe(servings=1)
        resp = auth_client.get(f"/api/recipes/{recipe.id}/rules/")
        assert resp.status_code == 200
        data = resp.json()
        assert "green_count" in data
        assert "items" in data

    def test_get_recipe_rules_endpoint_404(self, auth_client: Client):
        resp = auth_client.get("/api/recipes/999999/rules/")
        assert resp.status_code == 404
