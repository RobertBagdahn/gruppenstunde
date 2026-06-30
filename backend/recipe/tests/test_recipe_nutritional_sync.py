"""Tests for recipe nutritional tag sync service, signals, and management command."""

import pytest
from django.core.management import call_command
from model_bakery import baker

from recipe.services.recipe_checks import sync_recipe_nutritional_tags
from recipe.tests import make_recipe, make_recipe_item
from supply.models.reference import NutritionalTag
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestRecipeNutritionalTagSync:
    def test_sync_sets_tags_from_ingredients(self):
        recipe = make_recipe()
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        ingredient = make_ingredient()
        ingredient.nutritional_tags.add(tag_peanuts)

        portion = make_portion(ingredient=ingredient)
        item = make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        recipe.refresh_from_db()
        assert set(recipe.nutritional_tags.all()) == {tag_peanuts}

        item.delete()
        recipe.refresh_from_db()
        assert set(recipe.nutritional_tags.all()) == set()

    def test_sync_intersection_only(self):
        recipe = make_recipe()
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        tag_vegetarian = baker.make(NutritionalTag, name="Vegetarisch", is_dangerous=False)
        ingredient_a = make_ingredient()
        ingredient_a.nutritional_tags.add(tag_vegan, tag_vegetarian)
        ingredient_b = make_ingredient()
        ingredient_b.nutritional_tags.add(tag_vegetarian)

        portion_a = make_portion(ingredient=ingredient_a)
        make_recipe_item(recipe=recipe, portion=portion_a, ingredient=ingredient_a)
        portion_b = make_portion(ingredient=ingredient_b)
        make_recipe_item(recipe=recipe, portion=portion_b, ingredient=ingredient_b)

        recipe.refresh_from_db()
        # AND logic: only tag_vegetarian is on ALL ingredients
        assert set(recipe.nutritional_tags.all()) == {tag_vegetarian}

    def test_manual_tags_preserved_on_sync(self):
        recipe = make_recipe()
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        recipe.manual_nutritional_tags.add(tag_vegan)

        ingredient = make_ingredient()
        portion = make_portion(ingredient=ingredient)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        recipe.refresh_from_db()
        assert tag_vegan in recipe.manual_nutritional_tags.all()
        # nutritional_tags (auto-synced) should be empty — ingredient has no tags
        assert tag_vegan not in recipe.nutritional_tags.all()

    def test_manual_tags_survive_ingredient_change(self):
        recipe = make_recipe()
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        recipe.manual_nutritional_tags.add(tag_vegan)

        # Add an ingredient that does NOT have vegan
        ingredient = make_ingredient()
        portion = make_portion(ingredient=ingredient)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        recipe.refresh_from_db()
        # Manual tag should remain even though no ingredient supports it
        assert tag_vegan in recipe.manual_nutritional_tags.all()

    def test_sync_clears_tags_for_no_items(self):
        recipe = make_recipe()
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        recipe.nutritional_tags.add(tag_peanuts)

        sync_recipe_nutritional_tags(recipe)

        recipe.refresh_from_db()
        assert tag_peanuts not in recipe.nutritional_tags.all()

    def test_resolve_nutritional_tags_merges_both_sources(self):
        recipe = make_recipe()
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)

        # Set up: vegan as manual, peanuts as auto-synced (from ingredient)
        recipe.manual_nutritional_tags.add(tag_vegan)

        ingredient = make_ingredient()
        ingredient.nutritional_tags.add(tag_peanuts)
        portion = make_portion(ingredient=ingredient)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        recipe.refresh_from_db()

        from recipe.schemas.recipes import RecipeDetailOut

        resolved = RecipeDetailOut.resolve_nutritional_tags(recipe)
        resolved_ids = {t["id"] for t in resolved}
        assert tag_vegan.id in resolved_ids
        assert tag_peanuts.id in resolved_ids

    def test_sync_management_command(self):
        recipe = make_recipe()
        tag_peanuts = baker.make(NutritionalTag, name="Erdnuss", is_dangerous=True)
        ingredient = make_ingredient()
        ingredient.nutritional_tags.add(tag_peanuts)
        portion = make_portion(ingredient=ingredient)

        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        # Verify tag is present (via sync signal)
        recipe.refresh_from_db()
        assert tag_peanuts in recipe.nutritional_tags.all()

        # Simulate desync: bypass signals by removing tags directly in DB
        recipe.nutritional_tags.clear()
        recipe.refresh_from_db()
        assert tag_peanuts not in recipe.nutritional_tags.all()

        # Dry run should not re-sync
        call_command("sync_recipe_nutritional_tags", dry_run=True)
        recipe.refresh_from_db()
        assert tag_peanuts not in recipe.nutritional_tags.all()

        # Actual run should re-sync
        call_command("sync_recipe_nutritional_tags")
        recipe.refresh_from_db()
        assert tag_peanuts in recipe.nutritional_tags.all()

    def test_sync_does_not_touch_manual_tags(self):
        recipe = make_recipe()
        tag_vegan = baker.make(NutritionalTag, name="Vegan", is_dangerous=False)
        recipe.manual_nutritional_tags.add(tag_vegan)

        ingredient = make_ingredient()
        portion = make_portion(ingredient=ingredient)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient)

        sync_recipe_nutritional_tags(recipe)

        recipe.refresh_from_db()
        assert tag_vegan in recipe.manual_nutritional_tags.all()
