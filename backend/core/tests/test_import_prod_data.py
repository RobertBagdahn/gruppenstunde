"""Tests for the production fixture import order and idempotency."""

import pytest
from django.core import serializers
from model_bakery import baker

from core.management.commands.import_prod_data import IMPORT_ORDER, Command
from planner.models import Meal, MealItem, MealPlan
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, Package, RetailSection


@pytest.mark.django_db
def test_food_import_order_loads_packages_after_ingredients():
    food_files = next(group for group in IMPORT_ORDER if group[0] == "food")[1]

    assert food_files.index("supply_ingredient") < food_files.index("supply_package")
    assert food_files.index("supply_package") < food_files.index("recipe_recipeitem")


@pytest.mark.django_db
def test_package_fixture_import_is_idempotent(tmp_path):
    data_dir = tmp_path / "data"
    food_dir = data_dir / "food"
    food_dir.mkdir(parents=True)

    retail_section = baker.make(RetailSection, name="Test")
    ingredient = baker.make(
        Ingredient,
        name="Importzutat",
        slug="importzutat",
        status="approved",
        retail_section=retail_section,
    )
    package = baker.make(Package, ingredient=ingredient, name="Packung (500g)", weight_g=500, rank=1)
    recipe = baker.make(Recipe, title="Importrezept", status="approved", portions=1)
    recipe_item = baker.make(RecipeItem, recipe=recipe, portion=package.ingredient.portions.first(), quantity=1)
    meal_plan = baker.make(MealPlan)
    meal = baker.make(Meal, meal_plan=meal_plan)
    meal_item = baker.make(MealItem, meal=meal, recipe=recipe, factor=1)

    (food_dir / "supply_ingredient.json").write_text(serializers.serialize("json", [ingredient]), encoding="utf-8")
    (food_dir / "supply_package.json").write_text(serializers.serialize("json", [package]), encoding="utf-8")
    package.weight_g = 777
    package.save(update_fields=["weight_g"])
    (food_dir / "recipe_recipe.json").write_text(serializers.serialize("json", [recipe]), encoding="utf-8")
    (food_dir / "recipe_recipeitem.json").write_text(serializers.serialize("json", [recipe_item]), encoding="utf-8")
    planner_dir = data_dir / "planner"
    planner_dir.mkdir()
    (planner_dir / "planner_mealplan.json").write_text(serializers.serialize("json", [meal_plan]), encoding="utf-8")
    (planner_dir / "planner_meal.json").write_text(serializers.serialize("json", [meal]), encoding="utf-8")
    (planner_dir / "planner_mealitem.json").write_text(serializers.serialize("json", [meal_item]), encoding="utf-8")

    command = Command()
    prefixes = ["supply_ingredient", "supply_portion", "supply_package", "recipe_recipe", "recipe_recipeitem"]
    command._import_group(data_dir, "food", prefixes)
    command._import_group(data_dir, "planner", ["planner_mealplan", "planner_meal", "planner_mealitem"])
    command._import_group(data_dir, "food", prefixes)
    command._import_group(data_dir, "planner", ["planner_mealplan", "planner_meal", "planner_mealitem"])

    assert Ingredient.objects.filter(pk=ingredient.pk).count() == 1
    assert Package.objects.filter(pk=package.pk).count() == 1
    assert Package.objects.get(pk=package.pk).weight_g == 777
    assert RecipeItem.objects.get(pk=recipe_item.pk).portion_id == recipe_item.portion_id
    assert MealItem.objects.get(pk=meal_item.pk).recipe_id == recipe.id
