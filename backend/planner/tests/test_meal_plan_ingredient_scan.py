"""Tests for MealPlan nutritional tags, validation, and ingredient scan."""

import pytest
from django.test import Client
from model_bakery import baker

from planner.tests import make_meal_plan
from supply.models.reference import NutritionalTag


@pytest.mark.django_db
class TestMealPlanNutritionalTags:
    def test_create_meal_plan_with_nutritional_tags(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)

        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)

        client = Client()
        client.force_login(user)

        response = client.post(
            "/api/meal-plans/",
            {
                "name": "Tag Plan",
                "description": "Ein cooler Plan",
                "norm_portions": 15,
                "reserve_factor": 1.2,
                "start_datetime": "2026-07-10T08:00:00",
                "nutritional_tag_ids": [tag_peanuts.id, tag_vegan.id],
            },
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert set(data["nutritional_tag_ids"]) == {tag_peanuts.id, tag_vegan.id}
        assert set(data["nutritional_tag_names"]) == {"Erdnuss", "Vegan"}

    def test_create_meal_plan_with_non_dangerous_tag_succeeds(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)

        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)

        client = Client()
        client.force_login(user)

        response = client.post(
            "/api/meal-plans/",
            {
                "name": "Veganer Plan",
                "start_datetime": "2026-07-10T08:00:00",
                "nutritional_tag_ids": [tag_vegan.id],
            },
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["nutritional_tag_ids"] == [tag_vegan.id]

    def test_update_meal_plan_nutritional_tags(self):
        plan = make_meal_plan()
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)

        client = Client()
        client.force_login(plan.created_by)

        response = client.patch(
            f"/api/meal-plans/{plan.id}/",
            {"nutritional_tag_ids": [tag_peanuts.id]},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["nutritional_tag_ids"] == [tag_peanuts.id]

        response = client.patch(
            f"/api/meal-plans/{plan.id}/",
            {"nutritional_tag_ids": [tag_vegan.id]},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["nutritional_tag_ids"] == [tag_vegan.id]

    def test_get_meal_plan_returns_detailed_nutritional_tags(self):
        plan = make_meal_plan()
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        plan.nutritional_tags.add(tag_peanuts)

        client = Client()
        client.force_login(plan.created_by)

        response = client.get(f"/api/meal-plans/{plan.id}/")
        assert response.status_code == 200
        data = response.json()
        assert data["nutritional_tag_ids"] == [tag_peanuts.id]
        assert len(data["nutritional_tags"]) == 1
        assert data["nutritional_tags"][0]["id"] == tag_peanuts.id
        assert data["nutritional_tags"][0]["name"] == "Erdnuss"


@pytest.mark.django_db
class TestMealPlanIngredientScanner:
    def test_scanner_requires_auth(self):
        plan = make_meal_plan()
        client = Client()
        response = client.get(f"/api/meal-plans/{plan.id}/ingredient-scan/")
        assert response.status_code == 403
        assert response.json()["detail"] == "Sitzung nicht gefunden. Bitte erneut anmelden."

    def test_scanner_not_found_for_unauthorized_user(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        other_user = baker.make(User)
        plan = make_meal_plan()

        client = Client()
        client.force_login(other_user)
        response = client.get(f"/api/meal-plans/{plan.id}/ingredient-scan/")
        assert response.status_code == 404
        assert response.json()["detail"] == "Essensplan nicht gefunden"

    def test_scanner_detects_violations_and_aggregates_summary(self):
        from planner.tests import make_meal, make_meal_item
        from recipe.tests import make_recipe

        plan = make_meal_plan()
        client = Client()
        client.force_login(plan.created_by)

        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        tag_milk = baker.make(NutritionalTag, name="Milch", is_dangerous=True)
        plan.nutritional_tags.add(tag_peanuts, tag_milk)

        recipe_peanut = make_recipe(title="Satay Sauce")
        recipe_peanut.nutritional_tags.add(tag_peanuts)

        recipe_milk = make_recipe(title="Milchreis")
        recipe_milk.nutritional_tags.add(tag_milk)

        recipe_safe = make_recipe(title="Reispfanne")

        meal_1 = make_meal(meal_plan=plan, meal_type="lunch")
        make_meal_item(meal=meal_1, recipe=recipe_peanut)
        make_meal_item(meal=meal_1, recipe=recipe_safe)

        meal_2 = make_meal(meal_plan=plan, meal_type="dinner")
        make_meal_item(meal=meal_2, recipe=recipe_milk)

        response = client.get(f"/api/meal-plans/{plan.id}/ingredient-scan/")
        assert response.status_code == 200
        data = response.json()

        assert len(data["nutritional_tags"]) == 2
        returned_tag_ids = {t["id"] for t in data["nutritional_tags"]}
        assert returned_tag_ids == {tag_peanuts.id, tag_milk.id}

        violations = data["violations"]
        assert len(violations) == 2

        v_peanut = next(v for v in violations if v["recipe_title"] == "Satay Sauce")
        assert v_peanut["meal_id"] == meal_1.id
        assert v_peanut["meal_type"] == "lunch"
        assert v_peanut["recipe_id"] == recipe_peanut.id
        assert v_peanut["nutritional_tag"]["id"] == tag_peanuts.id
        assert v_peanut["source"] == "recipe_tag"

        v_milk = next(v for v in violations if v["recipe_title"] == "Milchreis")
        assert v_milk["meal_id"] == meal_2.id
        assert v_milk["meal_type"] == "dinner"
        assert v_milk["recipe_id"] == recipe_milk.id
        assert v_milk["nutritional_tag"]["id"] == tag_milk.id
        assert v_milk["source"] == "recipe_tag"

        summary = data["summary"]
        assert summary["total_violations"] == 2
        assert summary["affected_meals"] == 2
        assert summary["unique_tags"] == 2

    def test_scanner_no_violations(self):
        plan = make_meal_plan()
        client = Client()
        client.force_login(plan.created_by)

        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        plan.nutritional_tags.add(tag_peanuts)

        from planner.tests import make_meal, make_meal_item
        from recipe.tests import make_recipe

        recipe_safe = make_recipe(title="Sichere Nudeln")
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe_safe)

        response = client.get(f"/api/meal-plans/{plan.id}/ingredient-scan/")
        assert response.status_code == 200
        data = response.json()

        assert len(data["violations"]) == 0
        assert data["summary"]["total_violations"] == 0
        assert data["summary"]["affected_meals"] == 0
        assert data["summary"]["unique_tags"] == 0

    def test_scanner_detects_non_dangerous_tag_violations(self):
        from planner.tests import make_meal, make_meal_item
        from recipe.tests import make_recipe

        plan = make_meal_plan()
        client = Client()
        client.force_login(plan.created_by)

        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        plan.nutritional_tags.add(tag_vegan)

        recipe = make_recipe(title="Vegane Suppe")
        recipe.nutritional_tags.add(tag_vegan)

        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)

        response = client.get(f"/api/meal-plans/{plan.id}/ingredient-scan/")
        assert response.status_code == 200
        data = response.json()
        assert len(data["violations"]) == 1
        assert data["violations"][0]["nutritional_tag"]["id"] == tag_vegan.id

    def test_scanner_detects_standalone_ingredient_violations(self):
        from planner.models import MealItem
        from planner.tests import make_meal
        from supply.tests import make_ingredient

        plan = make_meal_plan()
        client = Client()
        client.force_login(plan.created_by)

        tag_lactose = baker.make(NutritionalTag, name="Laktose", is_dangerous=True)
        plan.nutritional_tags.add(tag_lactose)

        ingredient = make_ingredient(name="Milch")
        ingredient.nutritional_tags.add(tag_lactose)

        meal = make_meal(meal_plan=plan)
        baker.make(MealItem, meal=meal, ingredient=ingredient, recipe=None, factor=1.0)

        response = client.get(f"/api/meal-plans/{plan.id}/ingredient-scan/")
        assert response.status_code == 200
        data = response.json()
        assert len(data["violations"]) == 1
        assert data["violations"][0]["nutritional_tag"]["id"] == tag_lactose.id
        assert data["violations"][0]["recipe_title"] == "Milch"
        assert data["violations"][0]["source"] == "ingredient_tag"

    def test_scanner_detects_ingredient_tags_via_recipe_sync(self):
        from planner.tests import make_meal, make_meal_item
        from recipe.tests import make_recipe, make_recipe_item
        from supply.tests import make_ingredient, make_portion

        plan = make_meal_plan()
        client = Client()
        client.force_login(plan.created_by)

        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        plan.nutritional_tags.add(tag_vegan)

        ingredient = make_ingredient(name="Tofu")
        ingredient.nutritional_tags.add(tag_vegan)
        portion = make_portion(ingredient=ingredient)

        recipe = make_recipe(title="Tofu Pfanne")
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        # Sync should propagate ingredient tags to recipe
        from recipe.services.recipe_checks import sync_recipe_nutritional_tags

        sync_recipe_nutritional_tags(recipe)
        recipe.refresh_from_db()
        assert tag_vegan in recipe.nutritional_tags.all()

        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)

        response = client.get(f"/api/meal-plans/{plan.id}/ingredient-scan/")
        assert response.status_code == 200
        data = response.json()
        assert len(data["violations"]) >= 1
        matching = [v for v in data["violations"] if v["nutritional_tag"]["id"] == tag_vegan.id]
        assert len(matching) >= 1


@pytest.mark.django_db
class TestRecipeSearchNutritionalTagExclusion:
    def test_search_recipes_with_nutritional_tag_exclusion(self):
        from django.contrib.auth import get_user_model

        from recipe.tests import make_recipe
        from supply.models import Ingredient

        User = get_user_model()
        user = baker.make(User)

        client = Client()
        client.force_login(user)

        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        tag_milk = baker.make(NutritionalTag, name="Milch", is_dangerous=True)

        recipe_peanut = make_recipe(title="Satay Sauce")
        recipe_peanut.nutritional_tags.add(tag_peanuts)

        recipe_milk = make_recipe(title="Milchreis")
        recipe_milk.nutritional_tags.add(tag_milk)

        recipe_safe = make_recipe(title="Tomatensuppe")

        ing_peanut = baker.make(Ingredient, name="Erdnussbutter", is_standalone_food=True)
        ing_peanut.nutritional_tags.add(tag_peanuts)

        ing_safe = baker.make(Ingredient, name="Tomate", is_standalone_food=True)

        response = client.get("/api/meal-plans/recipes/search/")
        assert response.status_code == 200
        data = response.json()
        recipe_ids = {r["id"] for r in data.get("recipes", [])}
        assert recipe_peanut.id in recipe_ids
        assert recipe_milk.id in recipe_ids
        assert recipe_safe.id in recipe_ids

        response = client.get(f"/api/meal-plans/recipes/search/?exclude_nutritional_tag_ids={tag_peanuts.id}")
        assert response.status_code == 200
        data = response.json()

        recipe_ids = {r["id"] for r in data.get("recipes", [])}
        assert recipe_peanut.id not in recipe_ids
        assert recipe_milk.id in recipe_ids
        assert recipe_safe.id in recipe_ids

        ing_ids = {i["id"] for i in data.get("standalone_ingredients", [])}
        assert ing_peanut.id not in ing_ids

        response = client.get(
            f"/api/meal-plans/recipes/search/?exclude_nutritional_tag_ids={tag_peanuts.id},{tag_milk.id}"
        )
        assert response.status_code == 200
        data = response.json()

        recipe_ids = {r["id"] for r in data.get("recipes", [])}
        assert recipe_peanut.id not in recipe_ids
        assert recipe_milk.id not in recipe_ids
        assert recipe_safe.id in recipe_ids
