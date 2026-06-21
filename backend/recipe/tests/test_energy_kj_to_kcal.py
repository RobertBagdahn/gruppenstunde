import pytest
from django.core.management import call_command

from recipe.models import Rule
from recipe.services.recipe_checks import evaluate_recipe_rules, recalculate_recipe_cache
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestEnergyInKcal:
    def test_recipe_energy_cached_in_kcal(self):
        """Energy values are stored directly in kcal (no kJ conversion)."""
        recipe = make_recipe(portions=1)
        ing = make_ingredient(
            name="Energieriegel",
            energy_kcal=430,
            protein_g=10.0,
            fat_g=5.0,
            fat_sat_g=1.0,
            carbohydrate_g=40.0,
            sugar_g=10.0,
            fibre_g=2.0,
            salt_g=0.1,
        )
        portion = make_portion(ingredient=ing, quantity=100.0, weight_g=100.0, name="100g")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        recalculate_recipe_cache(recipe)

        recipe.refresh_from_db()
        assert recipe.cached_energy_kcal == 430.0

    def test_rule_evaluates_kcal_directly(self):
        """Rules evaluate kcal values directly (no conversion needed)."""
        recipe = make_recipe(portions=1)
        ing = make_ingredient(
            name="Energieriegel",
            energy_kcal=430,
            protein_g=10.0,
            fat_g=5.0,
            fat_sat_g=1.0,
            carbohydrate_g=40.0,
            sugar_g=10.0,
            fibre_g=2.0,
            salt_g=0.1,
        )
        portion = make_portion(ingredient=ing, quantity=100.0, weight_g=100.0, name="100g")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        recalculate_recipe_cache(recipe)

        rule = Rule.objects.create(
            name="Energie (Rezept)",
            parameter="energy_kcal",
            scope="recipe",
            min_green=430.0,
            min_yellow=287.0,
            max_green=1004.0,
            max_yellow=1243.0,
            unit="kcal",
            is_active=True,
        )

        results = evaluate_recipe_rules(recipe)
        match = next((r for r in results["items"] if r["rule_id"] == rule.id), None)
        assert match is not None
        # Value should be 430.0 (already in kcal, no conversion)
        assert round(match["value_per_serving"], 1) == 430.0
        assert match["status"] == "green"
        assert match["unit"] == "kcal"

    def test_seed_rules_creates_kcal_rules(self):
        Rule.objects.all().delete()
        call_command("seed_rules")

        energy_rules = Rule.objects.filter(parameter="energy_kcal")
        assert energy_rules.exists()
        for rule in energy_rules:
            assert rule.unit == "kcal"
            assert "kJ" not in rule.tip_text
