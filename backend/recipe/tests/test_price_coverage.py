"""Contract tests for price coverage across recipe cache and meal-plan cost responses."""

import pytest

from recipe.services.recipe_checks import recalculate_recipe_cache
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestRecipePriceCoverage:
    def _build_recipe(self, prices: list):
        """Build a recipe with one item per price; None/0 counts as missing."""
        recipe = make_recipe(title="Abdeckungstest", slug="abdeckungstest")
        for idx, price in enumerate(prices):
            ingredient = make_ingredient(
                name=f"Zutat {idx}",
                slug=f"zutat-{idx}",
                price_per_kg=price,
            )
            make_recipe_item(recipe=recipe, ingredient=ingredient, quantity=100)
        return recipe

    def test_partial_coverage(self, db):
        prices = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 0, None]
        recipe = self._build_recipe(prices)

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        assert recipe.cached_price_ingredient_count == 9
        assert recipe.cached_price_priced_count == 7
        assert recipe.cached_price_missing_count == 2
        # Known subtotal: (2+3+4+5+6+7+8) * 0.1 = 3.50
        assert float(recipe.cached_price_total) == pytest.approx(3.50, abs=0.01)

    def test_complete_coverage(self, db):
        recipe = self._build_recipe([1.0, 2.0, 3.0])

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        assert recipe.cached_price_ingredient_count == 3
        assert recipe.cached_price_priced_count == 3
        assert recipe.cached_price_missing_count == 0
        assert float(recipe.cached_price_total) == pytest.approx(0.60, abs=0.01)

    def test_absent_coverage(self, db):
        recipe = self._build_recipe([None, 0])

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        assert recipe.cached_price_ingredient_count == 2
        assert recipe.cached_price_priced_count == 0
        assert recipe.cached_price_missing_count == 2
        assert recipe.cached_price_total is None


@pytest.mark.django_db
class TestRecipeSchemaCoverage:
    def test_detail_exposes_coverage(self, client, db):
        priced = make_ingredient(name="Mehl", slug="mehl", price_per_kg=2.0)
        unpriced = make_ingredient(name="Wasser", slug="wasser", price_per_kg=None)
        recipe = make_recipe(title="Teig", slug="teig")
        make_recipe_item(recipe=recipe, ingredient=priced, quantity=100)
        make_recipe_item(recipe=recipe, ingredient=unpriced, quantity=100)
        recalculate_recipe_cache(recipe)

        res = client.get("/api/recipes/by-slug/teig/")

        assert res.status_code == 200, res.content
        data = res.json()
        coverage = data.get("price_coverage")
        assert coverage is not None
        assert coverage["total_ingredients"] == 2
        assert coverage["priced_ingredients"] == 1
        assert coverage["missing_ingredients"] == 1
        assert coverage["coverage"] == 0.5


@pytest.mark.django_db
class TestMealPlanCostCoverage:
    def test_meal_plan_exposes_coverage(self, client, db):
        from django.contrib.auth import get_user_model
        from django.test import Client

        from planner.models import MealItem
        from recipe.services.recipe_checks import recalculate_recipe_cache

        user = get_user_model().objects.create_user(username="planer", password="planerpass123")
        priced = make_ingredient(name="Mehl", slug="mehl", price_per_kg=2.0)
        unpriced = make_ingredient(name="Wasser", slug="wasser", price_per_kg=0)
        recipe = make_recipe(title="Teig", slug="teig")
        make_recipe_item(recipe=recipe, ingredient=priced, quantity=100)
        make_recipe_item(recipe=recipe, ingredient=unpriced, quantity=100)
        recalculate_recipe_cache(recipe)

        from planner.tests import make_meal, make_meal_plan

        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan)
        MealItem.objects.create(meal=meal, recipe=recipe, factor=1.0)

        api_client = Client()
        api_client.force_login(user)

        res = api_client.get(f"/api/meal-plans/{plan.id}/")
        assert res.status_code == 200
        data = res.json()
        meals = data.get("meals", [])
        assert meals
        coverage = meals[0].get("price_coverage")
        assert coverage is not None
        assert coverage["total_ingredients"] == 2
        assert coverage["priced_ingredients"] == 1
        assert coverage["missing_ingredients"] == 1
