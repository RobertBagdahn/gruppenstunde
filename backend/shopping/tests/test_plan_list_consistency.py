"""The saved shopping list must show the same amounts as the plan's shopping tab (spec shopping-list)."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from shopping.tests.trip_helpers import materialize_detail
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
def test_saved_list_matches_plan_shopping_tab():
    user = get_user_model().objects.create_user(username="planner", email="p@example.com", password="x")
    plan = make_meal_plan(created_by=user, norm_portions=10)
    meal = make_meal(meal_plan=plan)
    recipe = make_recipe(title="Kartoffelpfanne")

    unit = make_measuring_unit(name="Gramm")
    potato = make_ingredient(name="Kartoffeln QA")
    standard = make_portion(
        ingredient=potato,
        name="mittelgroße (150g)",
        quantity=1,
        weight_g=150,
        rank=1,
        measuring_unit=unit,
        weight_status="confirmed",
    )
    make_portion(
        ingredient=potato,
        name="1 kg",
        quantity=1,
        weight_g=1000,
        rank=4,
        measuring_unit=unit,
        weight_status="confirmed",
    )
    make_recipe_item(recipe=recipe, portion=standard, quantity=1)
    make_meal_item(meal=meal, recipe=recipe)

    client = Client()
    client.force_login(user)
    tab = client.get(f"/api/meal-plans/{plan.id}/shopping-list/").json()
    saved = materialize_detail(client, user, plan)["items"]

    tab_item = next(row for row in tab if row["ingredient_name"] == "Kartoffeln QA")
    saved_item = next(row for row in saved if row["name"] == "Kartoffeln QA")

    assert saved_item["quantity"] == tab_item["quantity"]
    assert saved_item["unit"] == tab_item["unit"]
    assert saved_item["start_unit"] == tab_item["start_unit"]


@pytest.mark.django_db
def test_list_can_be_created_when_a_portion_weight_is_unknown():
    """Regression: items without a gram weight used to crash the creation with an AttributeError."""
    user = get_user_model().objects.create_user(username="planner2", email="p2@example.com", password="x")
    plan = make_meal_plan(created_by=user, norm_portions=4)
    meal = make_meal(meal_plan=plan)
    recipe = make_recipe(title="Stückgericht")
    unit = make_measuring_unit(name="Stück")
    ingredient = make_ingredient(name="Seltsame Zutat QA")
    portion = make_portion(
        ingredient=ingredient, name="1 Stück", quantity=1, weight_g=None, rank=1, measuring_unit=unit
    )
    make_recipe_item(recipe=recipe, portion=portion, quantity=2)
    make_meal_item(meal=meal, recipe=recipe)

    client = Client()
    client.force_login(user)
    detail = materialize_detail(client, user, plan)

    assert detail["items"]
