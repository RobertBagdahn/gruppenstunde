"""Tests for standalone ingredient simplification.

Tests the migration from dummy recipes to ingredient-based MealItems,
signal removal, and search endpoint updates.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client
from model_bakery import baker

from planner.tests import make_meal, make_meal_plan
from recipe.models import Recipe
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion

User = get_user_model()


@pytest.mark.django_db
class TestStandaloneIngredientSignalRemoval:
    """Test that the dummy recipe creation signal has been removed."""

    def test_no_dummy_recipe_created_for_standalone_ingredient(self):
        """Creating standalone food no longer creates a dummy recipe."""
        # Create standalone ingredient
        ingredient = make_ingredient(is_standalone_food=True)

        # Should NOT have created a dummy recipe with recipe_type='ingredient'
        dummy_recipes = Recipe.objects.filter(
            recipe_type="ingredient",
            title=ingredient.name,
        )
        assert dummy_recipes.count() == 0, "Signal should not create dummy recipes"


@pytest.mark.django_db
class TestMigrateStandaloneToIngredientItems:
    """Test the management command that migrates old dummy recipes to ingredient items."""

    def test_migration_command_converts_dummy_recipe_meal_items(self):
        """Management command converts MealItems with dummy recipes to ingredient items."""
        # Setup: create a dummy recipe (simulating legacy data)
        ingredient = make_ingredient(
            name="Tomato",
            is_standalone_food=True,
            energy_kcal=18.0,
            protein_g=0.9,
        )
        portion = make_portion(ingredient=ingredient, weight_g=100.0)

        # Create a dummy recipe
        dummy_recipe = make_recipe(
            title="Tomato",
            recipe_type="ingredient",
            portions=1,
        )

        # Add ingredient to dummy recipe via RecipeItem
        make_recipe_item(recipe=dummy_recipe, portion=portion, ingredient=ingredient)

        # Create a meal with this dummy recipe
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        from planner.models import MealItem as MI

        meal_item = MI.objects.create(
            meal=meal,
            recipe=dummy_recipe,
            factor=1.0,
        )

        # Run migration command
        call_command("migrate_standalone_to_ingredient_items")

        # Verify: MealItem now points to ingredient instead of recipe
        meal_item.refresh_from_db()
        assert meal_item.ingredient == ingredient
        assert meal_item.recipe is None

    def test_migration_is_idempotent(self):
        """Running migration multiple times is safe."""
        ingredient = make_ingredient(
            name="Apple",
            is_standalone_food=True,
        )
        portion = make_portion(ingredient=ingredient, weight_g=100.0)
        dummy_recipe = make_recipe(
            title="Apple",
            recipe_type="ingredient",
            portions=1,
        )
        make_recipe_item(recipe=dummy_recipe, portion=portion, ingredient=ingredient)

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        from planner.models import MealItem as MI

        meal_item = MI.objects.create(
            meal=meal,
            recipe=dummy_recipe,
            factor=1.0,
        )

        # Run migration twice
        call_command("migrate_standalone_to_ingredient_items")
        meal_item.refresh_from_db()
        first_ingredient = meal_item.ingredient

        call_command("migrate_standalone_to_ingredient_items")
        meal_item.refresh_from_db()
        second_ingredient = meal_item.ingredient

        # Should be the same both times
        assert first_ingredient == second_ingredient == ingredient

    def test_migration_deletes_orphaned_dummy_recipes(self):
        """Dummy recipes with no MealItems are deleted."""
        ingredient = make_ingredient(name="Orange", is_standalone_food=True)
        portion = make_portion(ingredient=ingredient)
        dummy_recipe = make_recipe(
            title="Orange",
            recipe_type="ingredient",
            portions=1,
        )
        make_recipe_item(recipe=dummy_recipe, portion=portion, ingredient=ingredient)

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        from planner.models import MealItem as MI

        meal_item = MI.objects.create(
            meal=meal,
            recipe=dummy_recipe,
            factor=1.0,
        )

        dummy_id = dummy_recipe.id

        # Run migration
        call_command("migrate_standalone_to_ingredient_items")

        # Dummy recipe should be deleted
        assert not Recipe.objects.filter(id=dummy_id).exists()


@pytest.mark.django_db
class TestSearchEndpointStandaloneType:
    """Test that standalone_type has been removed from search endpoint."""

    def test_search_endpoint_returns_standalone_ingredients_without_type(self):
        """Search endpoint returns standalone ingredients in results."""
        user = baker.make(User)
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)

        # Create standalone ingredients
        ingredient1 = make_ingredient(
            name="Banana",
            is_standalone_food=True,
        )
        ingredient2 = make_ingredient(
            name="Carrot",
            is_standalone_food=False,  # Should NOT appear
        )

        client = Client()
        client.force_login(user)
        response = client.get(
            "/api/meal-plans/recipes/search/",
            {"q": ""},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have ingredients list
        assert "ingredients" in data
        ing_ids = [i["id"] for i in data["ingredients"]]

        # Standalone should be included
        assert ingredient1.id in ing_ids
        # Non-standalone should NOT be included
        assert ingredient2.id not in ing_ids

        # Ingredients should NOT have standalone_type field
        for ing in data["ingredients"]:
            assert "standalone_type" not in ing, "standalone_type should be removed from API response"

    def test_search_endpoint_filters_only_by_is_standalone_food(self):
        """Search only includes is_standalone_food=True ingredients."""
        user = baker.make(User)
        plan = make_meal_plan()

        standalone = make_ingredient(name="Mango", is_standalone_food=True)
        non_standalone = make_ingredient(name="Milk", is_standalone_food=False)

        client = Client()
        client.force_login(user)
        response = client.get(
            "/api/meal-plans/recipes/search/",
            {"q": ""},
        )

        data = response.json()
        ing_ids = [i["id"] for i in data.get("ingredients", [])]

        assert standalone.id in ing_ids
        assert non_standalone.id not in ing_ids


@pytest.mark.django_db
class TestMealWithIngredientItems:
    """Integration tests: meals with ingredient items work correctly."""

    def test_ingredient_meal_item_calculation(self):
        """Ingredient MealItems calculate nutrition/cost correctly."""
        from planner.schemas.meal_plan import MealOut
        from supply.models import MeasuringUnit

        plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=plan)

        # Create ingredient with nutrition
        ingredient = make_ingredient(
            name="Tomato",
            is_standalone_food=True,
            energy_kcal=18.0,
            protein_g=0.9,
            price_per_kg=2.0,
        )

        g_unit = MeasuringUnit.objects.get(name="g")
        make_portion(ingredient=ingredient, measuring_unit=g_unit, weight_g=1.0)

        # Create ingredient-based MealItem: 250g
        from model_bakery import baker

        from planner.models import MealItem as MI

        mi = baker.make(
            MI,
            meal=meal,
            recipe=None,
            ingredient=ingredient,
            quantity=250,
            measuring_unit=g_unit,
            factor=1.0,
        )

        # Check calculation: 250g × 18 kcal/100g = 45 kcal
        energy = MealOut.resolve_total_energy_kcal(meal)
        assert energy == pytest.approx(45.0)

        # Check cost: 250g × 2€/kg = 0.5€
        cost = MealOut.resolve_total_cost_eur(meal)
        assert cost == pytest.approx(0.5)
