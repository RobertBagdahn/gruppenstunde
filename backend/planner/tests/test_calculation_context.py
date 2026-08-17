"""Tests for the canonical active recipe-item calculation context."""

import pytest
from model_bakery import baker

from recipe.models import RecipeItem
from supply.models import Ingredient, MeasuringUnit, Portion

from planner.services.calculation_context import active_recipe_items
from planner.tests import make_meal_item


@pytest.mark.django_db
def test_active_recipe_items_applies_exclusion_and_quantity_override():
    meal_item = make_meal_item()
    unit = baker.make(MeasuringUnit, name="EL", quantity=15)
    ingredient = baker.make(Ingredient, name="Testzutat")
    first_portion = baker.make(
        Portion,
        ingredient=ingredient,
        measuring_unit=unit,
        name="Portion eins",
        quantity=1,
        weight_g=10,
        rank=1,
    )
    second_portion = baker.make(
        Portion,
        ingredient=ingredient,
        measuring_unit=unit,
        name="Portion zwei",
        quantity=1,
        weight_g=10,
        rank=2,
    )
    first = baker.make(RecipeItem, recipe=meal_item.recipe, portion=first_portion, quantity=1)
    second = baker.make(RecipeItem, recipe=meal_item.recipe, portion=second_portion, quantity=3)
    meal_item.overrides.create(recipe_item=first, excluded=True)
    meal_item.overrides.create(recipe_item=second, quantity_override=2)

    active = active_recipe_items(meal_item)

    assert first.id not in {item.recipe_item.id for item in active}
    overridden = next(item for item in active if item.recipe_item.id == second.id)
    assert overridden.quantity == 2


@pytest.mark.django_db
def test_active_recipe_items_ignores_soft_deleted_portions():
    meal_item = make_meal_item()
    unit = baker.make(MeasuringUnit, name="EL", quantity=15)
    ingredient = baker.make(Ingredient, name="Testzutat")
    portion = baker.make(
        Portion,
        ingredient=ingredient,
        measuring_unit=unit,
        name="Portion",
        quantity=1,
        weight_g=10,
    )
    deleted_item = baker.make(RecipeItem, recipe=meal_item.recipe, portion=portion, quantity=1)
    deleted_item.portion.soft_delete()

    active = active_recipe_items(meal_item)

    assert deleted_item.id not in {item.recipe_item.id for item in active}
