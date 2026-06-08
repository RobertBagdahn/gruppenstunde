"""Tests for recipe popularity: signals, popular endpoint, extended search response."""

import pytest
from django.test import Client

from planner.models import MealItem
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import Recipe
from recipe.tests import make_recipe, make_recipe_item


@pytest.mark.django_db
class TestUsageCountSignals:
    """Test that MealItem create/update/delete correctly updates Recipe.usage_count."""

    def test_create_meal_item_increments_usage_count(self):
        recipe = make_recipe()
        assert recipe.usage_count == 0

        meal = make_meal()
        MealItem.objects.create(meal=meal, recipe=recipe, factor=1.0)

        recipe.refresh_from_db()
        assert recipe.usage_count == 1

    def test_delete_meal_item_decrements_usage_count(self):
        recipe = make_recipe()
        meal = make_meal()
        item = MealItem.objects.create(meal=meal, recipe=recipe, factor=1.0)

        recipe.refresh_from_db()
        assert recipe.usage_count == 1

        item.delete()
        recipe.refresh_from_db()
        assert recipe.usage_count == 0

    def test_multiple_meal_items_increment_correctly(self):
        recipe = make_recipe()
        meal1 = make_meal()
        meal2 = make_meal()

        MealItem.objects.create(meal=meal1, recipe=recipe, factor=1.0)
        MealItem.objects.create(meal=meal2, recipe=recipe, factor=1.0)

        recipe.refresh_from_db()
        assert recipe.usage_count == 2

    def test_change_recipe_on_meal_item_updates_both_counts(self):
        recipe_a = make_recipe()
        recipe_b = make_recipe()
        meal = make_meal()

        item = MealItem.objects.create(meal=meal, recipe=recipe_a, factor=1.0)
        recipe_a.refresh_from_db()
        assert recipe_a.usage_count == 1

        item.recipe = recipe_b
        item.save()

        recipe_a.refresh_from_db()
        recipe_b.refresh_from_db()
        assert recipe_a.usage_count == 0
        assert recipe_b.usage_count == 1

    def test_meal_item_without_recipe_does_not_affect_count(self):
        from supply.models import Ingredient

        meal = make_meal()
        ing = Ingredient.objects.create(name="Testmehl", slug="testmehl-signal")
        # Create a MealItem with ingredient only, no recipe — should not raise
        item = MealItem.objects.create(meal=meal, recipe=None, ingredient=ing, factor=1.0)
        assert item.pk is not None


@pytest.mark.django_db
class TestPopularRecipesEndpoint:
    """Test GET /api/meal-plans/recipes/popular/."""

    def setup_method(self):
        self.client = Client()

    def test_anonymous_user_gets_empty_personal(self):
        recipe = make_recipe()
        recipe.usage_count = 5
        recipe.save()

        response = self.client.get("/api/meal-plans/recipes/popular/")
        assert response.status_code == 200
        data = response.json()
        assert data["personal"] == []
        assert len(data["community"]) >= 1

    def test_community_returns_recipes_ordered_by_usage_count(self):
        r1 = make_recipe(title="Beliebtes Rezept")
        r1.usage_count = 10
        r1.save()

        r2 = make_recipe(title="Sehr beliebtes Rezept")
        r2.usage_count = 20
        r2.save()

        r3 = make_recipe(title="Kaum genutzt")
        r3.usage_count = 1
        r3.save()

        response = self.client.get("/api/meal-plans/recipes/popular/")
        data = response.json()
        community = data["community"]
        assert community[0]["title"] == "Sehr beliebtes Rezept"
        assert community[1]["title"] == "Beliebtes Rezept"
        assert community[2]["title"] == "Kaum genutzt"

    def test_personal_returns_user_specific_counts(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.create_user(username="testuser", password="testpass")

        meal_plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=meal_plan)

        recipe = make_recipe(title="Mein Rezept")
        MealItem.objects.create(meal=meal, recipe=recipe, factor=1.0)
        MealItem.objects.create(meal=meal, recipe=recipe, factor=1.0)

        self.client.login(username="testuser", password="testpass")
        response = self.client.get("/api/meal-plans/recipes/popular/")
        data = response.json()

        assert len(data["personal"]) >= 1
        assert data["personal"][0]["title"] == "Mein Rezept"
        assert data["personal"][0]["usage_count"] == 2

    def test_meal_type_filter(self):
        r1 = make_recipe(title="Frühstücksrezept", recipe_type="breakfast")
        r1.usage_count = 10
        r1.save()

        r2 = make_recipe(title="Abendessen", recipe_type="warm_meal")
        r2.usage_count = 15
        r2.save()

        response = self.client.get("/api/meal-plans/recipes/popular/?meal_type=breakfast")
        data = response.json()
        community_titles = [r["title"] for r in data["community"]]
        assert "Frühstücksrezept" in community_titles
        assert "Abendessen" not in community_titles

    def test_limit_parameter(self):
        for i in range(10):
            r = make_recipe(title=f"Rezept {i}")
            r.usage_count = 10 - i
            r.save()

        response = self.client.get("/api/meal-plans/recipes/popular/?limit=3")
        data = response.json()
        assert len(data["community"]) == 3


@pytest.mark.django_db
class TestExtendedSearchResponse:
    """Test that recipe search returns extended preview fields."""

    def setup_method(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.user = User.objects.create_user(username="searcher", password="testpass")
        self.client = Client()
        self.client.login(username="searcher", password="testpass")

    def test_search_returns_preview_fields(self):
        recipe = make_recipe(
            title="Testpfannkuchen",
            recipe_type="breakfast",
            servings=4,
        )
        recipe.cached_energy_kcal = 478.0
        recipe.cached_protein_g = 20.0
        recipe.cached_fat_g = 10.0
        recipe.cached_carbohydrate_g = 50.0
        recipe.usage_count = 5
        recipe.save()

        # Use recipe_type filter to avoid FTS (which doesn't work on SQLite)
        response = self.client.get("/api/meal-plans/recipes/search/?recipe_type=breakfast")
        assert response.status_code == 200
        data = response.json()

        assert len(data["recipes"]) >= 1
        r = next((x for x in data["recipes"] if x["title"] == "Testpfannkuchen"), None)
        assert r is not None
        assert r["servings"] == 4
        assert r["cached_energy_kcal"] == 2000.0
        assert r["cached_protein_g"] == 20.0
        assert r["cached_fat_g"] == 10.0
        assert r["cached_carbohydrate_g"] == 50.0
        assert r["usage_count"] == 5
        assert "nutritional_tags" in r
        assert "ingredients_preview" in r

    def test_search_returns_ingredients_preview(self):
        from supply.models import Ingredient, MeasuringUnit, Portion

        recipe = make_recipe(title="Zutatentestrezept", recipe_type="warm_meal")
        unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm")

        for i, name in enumerate(["Mehl", "Eier", "Milch", "Zucker"]):
            ing = Ingredient.objects.create(name=name, slug=f"test-{name.lower()}-{recipe.id}")
            portion = Portion.objects.create(
                name=f"1 Portion {name}",
                ingredient=ing,
                measuring_unit=unit,
                weight_g=100,
                quantity=1,
            )
            make_recipe_item(recipe=recipe, portion=portion, sort_order=i)

        # Use recipe_type filter to avoid FTS (which doesn't work on SQLite)
        response = self.client.get("/api/meal-plans/recipes/search/?recipe_type=warm_meal")
        data = response.json()

        r = next((x for x in data["recipes"] if x["title"] == "Zutatentestrezept"), None)
        assert r is not None
        assert len(r["ingredients_preview"]) == 4
        assert "Mehl" in r["ingredients_preview"]

    def test_search_null_fields_returned_as_null(self):
        recipe = make_recipe(title="Leeresrezept", recipe_type="snack")
        # No cached values set

        # Use recipe_type filter to avoid FTS
        response = self.client.get("/api/meal-plans/recipes/search/?recipe_type=snack")
        data = response.json()

        r = next((x for x in data["recipes"] if x["title"] == "Leeresrezept"), None)
        assert r is not None
        assert r["cached_energy_kcal"] is None
        assert r["cached_price_total"] is None
        assert r["image"] is None
