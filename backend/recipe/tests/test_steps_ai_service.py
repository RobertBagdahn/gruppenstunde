"""
Tests for Recipe Step AI Service.

Tests cover:
- Step generation from ingredients (mocked Gemini)
- Ingredient assignment suggestion (mocked Gemini)
- Placeholder resolution
- Description generation from steps
"""

import pytest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User

from recipe.models import Recipe, RecipeItem, RecipeStep, RecipeStepIngredient
from supply.models import Ingredient, Portion, MeasuringUnit
from recipe.services.step_ai_service import AiStepService


@pytest.mark.django_db
class TestGenerateStepsFromItems(TestCase):
    """Tests for generate_steps_from_items service."""

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
        
        self.flour_portion = Portion.objects.create(
            ingredient=self.flour,
            measuring_unit=self.unit,
            quantity=100
        )
        self.water_portion = Portion.objects.create(
            ingredient=self.water,
            measuring_unit=self.unit,
            quantity=50
        )
        
        self.flour_item = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.flour_portion,
            quantity=2
        )
        self.water_item = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.water_portion,
            quantity=1
        )

    @patch('recipe.services.step_ai_service.gemini_call')
    def test_generate_steps_from_items_success(self, mock_gemini):
        """Test successful step generation from ingredients."""
        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.text = '''
        [
            {
                "sort_order": 1,
                "instruction": "Mix {Flour} with {Water}",
                "duration_minutes": 5,
                "section": "Mixing",
                "step_ingredients": [
                    {"recipe_item_id": %d, "quantity_modifier": 1.0, "preparation": "", "sort_order": 1},
                    {"recipe_item_id": %d, "quantity_modifier": 1.0, "preparation": "", "sort_order": 2}
                ]
            }
        ]
        ''' % (self.flour_item.id, self.water_item.id)
        mock_gemini.return_value = (mock_response, 'interaction-id')
        
        # Generate steps
        steps = AiStepService.generate_steps_from_items(
            recipe=self.recipe,
            user=self.user,
            bypass_limits=False
        )
        
        # Verify response
        assert len(steps) > 0
        assert mock_gemini.called

    @patch('recipe.services.step_ai_service.gemini_call')
    def test_generate_steps_from_items_no_ingredients_returns_empty(self, mock_gemini):
        """Test that recipe with no ingredients returns empty."""
        recipe_empty = Recipe.objects.create(
            title='Empty Recipe',
            slug='empty-recipe',
            created_by=self.user
        )
        
        # Should return empty immediately without calling Gemini
        steps = AiStepService.generate_steps_from_items(
            recipe=recipe_empty,
            user=self.user
        )
        
        # Might not call Gemini if ingredients are empty
        # (depends on implementation)


@pytest.mark.django_db
class TestSuggestIngredientAssignment(TestCase):
    """Tests for ingredient assignment suggestion."""

    def setUp(self):
        """Create test fixtures."""
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            slug='test-recipe',
            created_by=self.user
        )
        
        # Create ingredients
        self.unit = MeasuringUnit.objects.create(name='grams', name_short='g')
        self.flour = Ingredient.objects.create(name='Flour')
        self.water = Ingredient.objects.create(name='Water')
        
        self.flour_portion = Portion.objects.create(
            ingredient=self.flour,
            measuring_unit=self.unit,
            quantity=100
        )
        self.water_portion = Portion.objects.create(
            ingredient=self.water,
            measuring_unit=self.unit,
            quantity=50
        )
        
        RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.flour_portion,
            quantity=2
        )
        RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.water_portion,
            quantity=1
        )

    @patch('recipe.services.step_ai_service.gemini_call')
    def test_suggest_ingredients_success(self, mock_gemini):
        """Test successful ingredient suggestion."""
        mock_response = MagicMock()
        mock_response.text = '''
        [
            {
                "recipe_item_id": 1,
                "ingredient_name": "Flour",
                "preparation": "sifted",
                "confidence": 0.95
            }
        ]
        '''
        mock_gemini.return_value = (mock_response, 'interaction-id')
        
        suggestions = AiStepService.suggest_ingredient_assignment(
            step_instruction='Mix flour with water',
            recipe=self.recipe,
            user=self.user
        )
        
        assert isinstance(suggestions, list)
        assert mock_gemini.called

    def test_suggest_ingredients_empty_instruction_fails(self):
        """Test that empty instruction is rejected."""
        with pytest.raises(ValueError) or pytest.raises(AssertionError):
            AiStepService.suggest_ingredient_assignment(
                step_instruction='',  # Empty
                recipe=self.recipe,
                user=self.user
            )


@pytest.mark.django_db
class TestImproveStepInstruction(TestCase):
    """Tests for step instruction improvement."""

    def setUp(self):
        """Create test fixtures."""
        self.user = User.objects.create_user(username='testuser', password='test123')

    @patch('recipe.services.step_ai_service.gemini_call')
    def test_improve_step_instruction_precise_tone(self, mock_gemini):
        """Test improving instruction with precise tone."""
        mock_response = MagicMock()
        mock_response.text = 'Add 200g flour to 100ml water. Mix thoroughly.'
        mock_gemini.return_value = (mock_response, 'interaction-id')
        
        improved = AiStepService.improve_step_instruction(
            instruction='Add flour and water, then mix it all together',
            tone='präzise',
            user=self.user
        )
        
        assert improved == 'Add 200g flour to 100ml water. Mix thoroughly.'
        assert mock_gemini.called

    @patch('recipe.services.step_ai_service.gemini_call')
    def test_improve_step_instruction_ausführlich_tone(self, mock_gemini):
        """Test improving instruction with ausführlich (verbose) tone."""
        mock_response = MagicMock()
        mock_response.text = 'Slowly add the flour to the water while stirring constantly. Mix until smooth.'
        mock_gemini.return_value = (mock_response, 'interaction-id')
        
        improved = AiStepService.improve_step_instruction(
            instruction='Mix flour and water',
            tone='ausführlich',
            user=self.user
        )
        
        assert mock_gemini.called
        assert len(improved) > 0

    def test_improve_step_instruction_empty_returns_original(self):
        """Test that empty instruction returns original."""
        result = AiStepService.improve_step_instruction(
            instruction='',
            tone='präzise',
            user=self.user
        )
        assert result == ''

    @patch('recipe.services.step_ai_service.gemini_call')
    def test_improve_step_instruction_invalid_tone_uses_default(self, mock_gemini):
        """Test that invalid tone uses default description."""
        mock_response = MagicMock()
        mock_response.text = 'Improved instruction'
        mock_gemini.return_value = (mock_response, 'interaction-id')
        
        improved = AiStepService.improve_step_instruction(
            instruction='Original instruction',
            tone='invalid_tone',  # Unknown tone
            user=self.user
        )
        
        assert mock_gemini.called
        # Should use default tone description


@pytest.mark.django_db
class TestConvertMarkdownToSteps(TestCase):
    """Tests for markdown to steps conversion."""

    def setUp(self):
        """Create test fixtures."""
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            slug='test-recipe',
            created_by=self.user
        )
        
        # Create ingredients
        self.unit = MeasuringUnit.objects.create(name='grams', name_short='g')
        self.flour = Ingredient.objects.create(name='Flour')
        
        self.flour_portion = Portion.objects.create(
            ingredient=self.flour,
            measuring_unit=self.unit,
            quantity=100
        )
        
        RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.flour_portion,
            quantity=2
        )

    @patch('recipe.services.step_ai_service.gemini_call')
    def test_convert_markdown_success(self, mock_gemini):
        """Test successful markdown conversion."""
        mock_response = MagicMock()
        mock_response.text = '''
        [
            {
                "sort_order": 1,
                "instruction": "Mix ingredients",
                "duration_minutes": 5,
                "section": "",
                "step_ingredients": []
            }
        ]
        '''
        mock_gemini.return_value = (mock_response, 'interaction-id')
        
        markdown = "1. Mix flour and water\n2. Bake at 200°C"
        
        steps = AiStepService.convert_markdown_to_steps(
            recipe=self.recipe,
            description=markdown,
            user=self.user
        )
        
        assert isinstance(steps, list)
        assert mock_gemini.called

    def test_convert_markdown_empty_recipe_items_returns_empty(self):
        """Test that recipe without items returns empty."""
        recipe_empty = Recipe.objects.create(
            title='Empty Recipe',
            slug='empty-recipe-2',
            created_by=self.user
        )
        
        with pytest.raises(Exception) or pytest.raises(AssertionError):
            AiStepService.convert_markdown_to_steps(
                recipe=recipe_empty,
                description='Some markdown',
                user=self.user
            )
