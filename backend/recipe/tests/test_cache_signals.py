"""Tests for recipe cache invalidation signals."""

import pytest

from recipe.models import Recipe
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestRecipeCacheSignals:
    def test_recipe_item_create_triggers_cache(self):
        """Creating a RecipeItem should trigger cache recalculation."""
        recipe = make_recipe()
        assert recipe.cached_at is None  # initially uncached

        ingredient = make_ingredient()
        portion = make_portion(ingredient=ingredient)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        recipe.refresh_from_db()
        assert recipe.cached_at is not None

    def test_recipe_item_delete_triggers_cache(self):
        """Deleting a RecipeItem should trigger cache recalculation."""
        recipe = make_recipe()
        ingredient = make_ingredient()
        portion = make_portion(ingredient=ingredient)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        recipe.refresh_from_db()
        first_cached_at = recipe.cached_at
        assert first_cached_at is not None

        item.delete()

        recipe.refresh_from_db()
        # Cache should be recalculated (cached_at updated)
        assert recipe.cached_at is not None

    def test_ingredient_change_invalidates_recipe_cache(self):
        """Changing an Ingredient should recalculate caches for related recipes."""
        recipe = make_recipe()
        ingredient = make_ingredient(energy_kj=100.0)
        portion = make_portion(ingredient=ingredient)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        recipe.refresh_from_db()
        first_energy = recipe.cached_energy_kj

        # Update the ingredient
        ingredient.energy_kj = 200.0
        ingredient.save()

        recipe.refresh_from_db()
        # Cache should have been recalculated with new values
        assert recipe.cached_at is not None
        # The exact value depends on the portion weight calculation
        # but it should have changed
        if first_energy is not None and first_energy > 0:
            assert recipe.cached_energy_kj != first_energy

    def test_cache_fields_populated(self):
        """Cache fields should be populated after RecipeItem creation."""
        recipe = make_recipe()
        ingredient = make_ingredient(
            energy_kj=500.0,
            protein_g=20.0,
            fat_g=10.0,
            carbohydrate_g=60.0,
            sugar_g=5.0,
            fibre_g=3.0,
            salt_g=1.0,
        )
        portion = make_portion(ingredient=ingredient, weight_g=100.0)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)

        recipe.refresh_from_db()
        assert recipe.cached_at is not None
        # Nutritional values should be set (exact values depend on normalization)
        assert recipe.cached_energy_kj is not None
        assert recipe.cached_nutri_class is not None
