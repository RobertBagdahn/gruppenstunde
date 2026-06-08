"""Tests for recipe allergen sync service, signals, and management command."""

import pytest
from django.core.management import call_command
from model_bakery import baker

from recipe.models import Recipe
from recipe.services.recipe_checks import sync_recipe_allergen_tags
from recipe.tests import make_recipe, make_recipe_item
from supply.models.reference import NutritionalTag
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestRecipeAllergenSync:
    def test_sync_recipe_allergen_tags_union(self):
        # Create recipe and non-dangerous tag
        recipe = make_recipe()
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        recipe.nutritional_tags.add(tag_vegan)

        # Create ingredient with dangerous allergen tag
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        ingredient = make_ingredient()
        ingredient.nutritional_tags.add(tag_peanuts)

        # Add item to recipe
        portion = make_portion(ingredient=ingredient)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        # Signal should have triggered sync
        recipe.refresh_from_db()
        assert set(recipe.nutritional_tags.all()) == {tag_vegan, tag_peanuts}

        # Remove item and verify allergen is removed but non-dangerous remains
        item.delete()
        recipe.refresh_from_db()
        assert set(recipe.nutritional_tags.all()) == {tag_vegan}

    def test_sync_clears_allergens_for_no_items(self):
        recipe = make_recipe()
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        recipe.nutritional_tags.add(tag_peanuts)

        # Trigger sync directly with no items
        sync_recipe_allergen_tags(recipe)

        recipe.refresh_from_db()
        assert tag_peanuts not in recipe.nutritional_tags.all()

    def test_sync_management_command(self):
        recipe = make_recipe()
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        ingredient = make_ingredient()
        ingredient.nutritional_tags.add(tag_peanuts)
        portion = make_portion(ingredient=ingredient)

        # Temporarily bypass signal by disconnecting or deleting m2m manually to set up desync
        # Actually, let's create the item without django signals by bulk_create or simply manually clear recipe's tags
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)
        recipe.nutritional_tags.clear()

        # At this point, the recipe has an item with an allergen, but the recipe has 0 tags (desynced)
        assert tag_peanuts not in recipe.nutritional_tags.all()

        # Run dry run first
        call_command("sync_recipe_allergen_tags", dry_run=True)
        recipe.refresh_from_db()
        assert tag_peanuts not in recipe.nutritional_tags.all()

        # Run actual sync
        call_command("sync_recipe_allergen_tags")
        recipe.refresh_from_db()
        assert tag_peanuts in recipe.nutritional_tags.all()
