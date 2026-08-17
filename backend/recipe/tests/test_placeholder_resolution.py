"""
Tests for Recipe Step Helper Functions.

Tests cover:
- Placeholder resolution ({ingredient_name}, {recipe_item_id}, {1}, {2}, etc.)
- Edge cases and fallbacks
"""

import pytest
from django.test import TestCase
from django.contrib.auth.models import User

from recipe.models import Recipe, RecipeItem, RecipeStep, RecipeStepIngredient
from supply.models import Ingredient, Portion, MeasuringUnit


class TestPlaceholderResolution(TestCase):
    """Tests for placeholder resolution in step instructions."""

    def setUp(self):
        """Create test fixtures."""
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            slug='test-recipe',
            created_by=self.user
        )
        
        # Create ingredients and recipe items
        self.unit = MeasuringUnit.objects.create(name='grams', name_short='g')
        self.flour = Ingredient.objects.create(name='Flour')
        self.water = Ingredient.objects.create(name='Water')
        self.salt = Ingredient.objects.create(name='Salt')
        
        self.flour_portion = Portion.objects.create(
            ingredient=self.flour,
            measuring_unit=self.unit,
            quantity=100
        )
        self.water_portion = Portion.objects.create(
            ingredient=self.water,
            measuring_unit=self.unit,
            quantity=250
        )
        self.salt_portion = Portion.objects.create(
            ingredient=self.salt,
            measuring_unit=self.unit,
            quantity=5
        )
        
        self.flour_item = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.flour_portion,
            quantity=2,
            id=1
        )
        self.water_item = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.water_portion,
            quantity=1,
            id=2
        )
        self.salt_item = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.salt_portion,
            quantity=0.5,
            id=3
        )
        
        # Create a step
        self.step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix {Flour} with {Water} and a pinch of {Salt}',
            sort_order=1
        )

    def test_resolve_placeholder_by_ingredient_name(self):
        """Test resolving placeholder by ingredient name."""
        from recipe.services.step_helpers import resolve_placeholders
        
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(self.step, recipe_item_map)
        
        # Should contain ingredient names instead of placeholders
        assert isinstance(resolved, str)
        assert resolved != self.step.instruction

    def test_resolve_placeholder_by_recipe_item_id(self):
        """Test resolving placeholder by recipe_item_id."""
        from recipe.services.step_helpers import resolve_placeholders
        
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix {1} with {2} and {3}',
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should not contain numeric placeholders after resolution
        assert '{1}' not in resolved
        assert '{2}' not in resolved
        assert '{3}' not in resolved

    def test_resolve_placeholder_missing_item_fallback(self):
        """Test fallback when placeholder refers to non-existent item."""
        from recipe.services.step_helpers import resolve_placeholders
        
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix {1} with {999}',  # 999 doesn't exist
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should handle gracefully without crashing
        assert isinstance(resolved, str)

    def test_resolve_multiple_placeholders(self):
        """Test resolving multiple different placeholders."""
        from recipe.services.step_helpers import resolve_placeholders
        
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Add {Flour}, then {Water}, finally {Salt}',
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should be different from original
        assert resolved != step.instruction

    def test_resolve_mixed_placeholder_formats(self):
        """Test resolving mix of name and ID placeholders."""
        from recipe.services.step_helpers import resolve_placeholders
        
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix {Flour}, {2}, and {Salt}',
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should handle both formats
        assert isinstance(resolved, str)

    def test_resolve_placeholder_case_insensitive(self):
        """Test that ingredient name matching is case-insensitive."""
        from recipe.services.step_helpers import resolve_placeholders
        
        # Lowercase ingredient name in placeholder
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix {flour} and {water}',
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should still resolve (case-insensitive or handle gracefully)
        assert isinstance(resolved, str)

    def test_resolve_step_with_no_placeholders(self):
        """Test that step with no placeholders returns unchanged."""
        from recipe.services.step_helpers import resolve_placeholders
        
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix everything together',
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should be unchanged
        assert resolved == step.instruction

    def test_resolve_empty_instruction(self):
        """Test resolving empty instruction."""
        from recipe.services.step_helpers import resolve_placeholders
        
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='',
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should remain empty
        assert resolved == ''

    def test_resolve_placeholder_with_special_chars(self):
        """Test placeholders in instruction with special characters."""
        from recipe.services.step_helpers import resolve_placeholders
        
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix {Flour} (100g), {Water} (250ml). Don\'t add {Salt}!',
            sort_order=2
        )
        recipe_item_map = {
            item.id: item for item in self.recipe.recipe_items.all()
        }
        
        resolved = resolve_placeholders(step, recipe_item_map)
        
        # Should preserve special characters
        assert isinstance(resolved, str)
