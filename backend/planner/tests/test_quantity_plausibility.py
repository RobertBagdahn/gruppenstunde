"""Tests for planner/services/quantity_plausibility.py and its callers."""

import json

import pytest

from planner.models import MealItem
from planner.services.quantity_plausibility import MAX_GRAMS_PER_PERSON, MAX_PIECES_PER_PERSON, check, check_item
from planner.tests import make_meal, make_meal_plan
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.fixture
def gram_unit(db):
    return make_measuring_unit(name="Gramm", unit="g", quantity=1.0)


@pytest.fixture
def piece_unit(db):
    return make_measuring_unit(name="Stück", unit="stk", quantity=1.0)


@pytest.mark.django_db
class TestQuantityPlausibility:
    def test_warns_on_piece_count_over_threshold(self, piece_unit):
        ingredient = make_ingredient(name="Brötchen")
        make_portion(ingredient=ingredient, name="Stück", measuring_unit=piece_unit, weight_g=50, rank=1)
        meal = make_meal(override_portions=10)
        item = MealItem.objects.create(
            meal=meal, ingredient=ingredient, quantity=800, measuring_unit=piece_unit, factor=1.0
        )

        warning = check_item(item, portions=10)
        assert warning is not None
        assert warning.per_person_unit == "Stück"
        assert warning.per_person_value == 800
        assert "Brötchen" in warning.message
        assert "800 Stück pro Person" in warning.message
        assert "8000 insgesamt" in warning.message

    def test_no_warning_for_plausible_gram_amount(self, gram_unit):
        ingredient = make_ingredient(name="Kartoffeln")
        meal = make_meal(override_portions=10)
        item = MealItem.objects.create(
            meal=meal, ingredient=ingredient, quantity=400, measuring_unit=gram_unit, factor=1.0
        )

        assert check_item(item, portions=10) is None

    def test_warns_over_gram_threshold(self, gram_unit):
        ingredient = make_ingredient(name="Kartoffeln")
        meal = make_meal(override_portions=1)
        item = MealItem.objects.create(
            meal=meal,
            ingredient=ingredient,
            quantity=MAX_GRAMS_PER_PERSON + 1,
            measuring_unit=gram_unit,
            factor=1.0,
        )

        warning = check_item(item, portions=1)
        assert warning is not None
        assert warning.per_person_unit == "g"

    def test_no_warning_at_exact_threshold(self, gram_unit):
        ingredient = make_ingredient(name="Reis")
        meal = make_meal(override_portions=1)
        item = MealItem.objects.create(
            meal=meal, ingredient=ingredient, quantity=MAX_GRAMS_PER_PERSON, measuring_unit=gram_unit, factor=1.0
        )
        assert check_item(item, portions=1) is None

    def test_no_warning_at_exact_piece_threshold(self, piece_unit):
        ingredient = make_ingredient(name="Brötchen")
        meal = make_meal(override_portions=1)
        item = MealItem.objects.create(
            meal=meal,
            ingredient=ingredient,
            quantity=MAX_PIECES_PER_PERSON,
            measuring_unit=piece_unit,
            factor=1.0,
        )
        assert check_item(item, portions=1) is None

    def test_recipe_items_are_skipped(self, gram_unit):
        from recipe.tests import make_recipe

        recipe = make_recipe()
        meal = make_meal(override_portions=1)
        item = MealItem.objects.create(meal=meal, recipe=recipe, factor=1.0)
        assert check_item(item, portions=1) is None

    def test_check_collects_multiple_items(self, gram_unit, piece_unit):
        ingredient1 = make_ingredient(name="Kartoffeln")
        ingredient2 = make_ingredient(name="Brötchen")
        make_portion(ingredient=ingredient2, name="Stück", measuring_unit=piece_unit, weight_g=50, rank=1)
        meal = make_meal(override_portions=10)
        item1 = MealItem.objects.create(
            meal=meal, ingredient=ingredient1, quantity=400, measuring_unit=gram_unit, factor=1.0
        )
        item2 = MealItem.objects.create(
            meal=meal, ingredient=ingredient2, quantity=800, measuring_unit=piece_unit, factor=1.0
        )

        warnings = check([item1, item2], portions=10)
        assert len(warnings) == 1
        assert warnings[0].meal_item_id == item2.id


@pytest.mark.django_db
class TestWizardItemsWarnings:
    def test_wizard_items_returns_warnings(self, auth_client, piece_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=10)
        ingredient = make_ingredient(name="Brötchen")
        make_portion(ingredient=ingredient, name="Stück", measuring_unit=piece_unit, weight_g=50, rank=1)

        resp = auth_client.post(
            f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/wizard-items/",
            data=json.dumps(
                {"items": [{"ingredient_id": ingredient.id, "quantity": 800, "measuring_unit_id": piece_unit.id}]}
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert len(resp.json()["warnings"]) == 1
        assert "Brötchen" in resp.json()["warnings"][0]["message"]

    def test_wizard_items_no_warning_for_plausible_amount(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=10)
        ingredient = make_ingredient(name="Kartoffeln")

        resp = auth_client.post(
            f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/wizard-items/",
            data=json.dumps(
                {"items": [{"ingredient_id": ingredient.id, "quantity": 400, "measuring_unit_id": gram_unit.id}]}
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["warnings"] == []


@pytest.mark.django_db
class TestShoppingListWarnings:
    def test_shopping_list_from_plan_includes_warnings(self, auth_client, piece_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=10)
        ingredient = make_ingredient(name="Brötchen")
        make_portion(ingredient=ingredient, name="Stück", measuring_unit=piece_unit, weight_g=50, rank=1)
        MealItem.objects.create(meal=meal, ingredient=ingredient, quantity=800, measuring_unit=piece_unit, factor=1.0)

        resp = auth_client.post(f"/api/shopping-lists/from-meal-plan/{meal_plan.id}/")
        assert resp.status_code == 200
        assert len(resp.json()["warnings"]) == 1

    def test_shopping_list_no_warnings_when_plausible(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=10)
        ingredient = make_ingredient(name="Kartoffeln")
        MealItem.objects.create(meal=meal, ingredient=ingredient, quantity=400, measuring_unit=gram_unit, factor=1.0)

        resp = auth_client.post(f"/api/shopping-lists/from-meal-plan/{meal_plan.id}/")
        assert resp.status_code == 200
        assert resp.json()["warnings"] == []
