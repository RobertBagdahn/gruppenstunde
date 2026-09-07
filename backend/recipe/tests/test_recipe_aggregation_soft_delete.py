"""Tests that recipe aggregation ignores soft-deleted portions and exchange alternatives."""

import pytest

from recipe.services.recipe_checks import get_recipe_total_weight_g, recalculate_recipe_cache
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestRecipeAggregationSoftDelete:
    def test_recalculate_cache_excludes_soft_deleted_portion(self):
        recipe = make_recipe(portions=1)
        active = make_ingredient(name="Aktive Zutat")
        deleted = make_ingredient(name="Gelöschte Zutat")
        make_recipe_item(recipe=recipe, portion=make_portion(ingredient=active, weight_g=100.0), quantity=1.0)
        item = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=deleted, weight_g=50.0), quantity=1.0)
        item.portion.soft_delete()

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        assert recipe.cached_weight_g == pytest.approx(100.0)

    def test_total_weight_fallback_excludes_soft_deleted_portion(self):
        recipe = make_recipe(portions=1)
        active = make_ingredient(name="Aktive Zutat")
        deleted = make_ingredient(name="Gelöschte Zutat")
        make_recipe_item(recipe=recipe, portion=make_portion(ingredient=active, weight_g=100.0), quantity=1.0)
        item = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=deleted, weight_g=50.0), quantity=1.0)
        item.portion.soft_delete()

        # Clear the denormalized cache so the fallback path is exercised.
        recipe.cached_weight_g = None
        recipe.save(update_fields=["cached_weight_g"])

        assert get_recipe_total_weight_g(recipe) == pytest.approx(100.0)
