import json

import pytest
from django.contrib.auth import get_user_model

from planner.tests import make_meal, make_meal_plan
from recipe.tests import make_recipe
from supply.tests import make_ingredient, make_portion

User = get_user_model()


@pytest.mark.django_db
def test_private_recipe_detail_and_nutrition_hide_from_unrelated_user(auth_client):
    owner = User.objects.create_user(username="private-recipe-owner")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")

    assert auth_client.get(f"/api/recipes/{recipe.id}/").status_code == 404
    assert auth_client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/").status_code == 404


@pytest.mark.django_db
def test_private_recipe_cannot_be_forked_by_unrelated_user(auth_client):
    owner = User.objects.create_user(username="fork-owner")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")

    response = auth_client.post(
        f"/api/recipes/{recipe.id}/fork/",
        data=json.dumps({}),
        content_type="application/json",
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_private_ingredient_detail_and_portions_hide_from_unrelated_user(auth_client):
    owner = User.objects.create_user(username="private-ingredient-owner")
    ingredient = make_ingredient(name="Private Ingredient", status="draft", created_by=owner, owner=owner)
    make_portion(ingredient=ingredient)

    assert auth_client.get(f"/api/ingredients/{ingredient.slug}/").status_code == 404
    assert auth_client.get(f"/api/ingredients/{ingredient.slug}/portions/").status_code == 404
    assert auth_client.get(f"/api/ingredients/{ingredient.slug}/packages/").status_code == 404


@pytest.mark.django_db
def test_unreadable_recipe_cannot_be_added_to_meal_plan(auth_client):
    owner = User.objects.create_user(username="meal-recipe-owner")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")
    plan = make_meal_plan(created_by=auth_client._user, owner=auth_client._user)
    meal = make_meal(meal_plan=plan)

    response = auth_client.post(
        f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/",
        data=json.dumps({"recipe_id": recipe.id}),
        content_type="application/json",
    )

    assert response.status_code == 404
