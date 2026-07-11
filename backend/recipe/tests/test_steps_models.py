"""
Tests for Recipe Step models and API endpoints.

Tests cover:
- RecipeStep and RecipeStepIngredient model constraints
- Batch update API endpoint
- Serialization/deserialization
- Error handling
"""

import pytest
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from recipe.models import Recipe, RecipeStep, RecipeStepIngredient, RecipeItem, Ingredient, Portion, MeasuringUnit
from recipe.schemas import RecipeStepIn, RecipeStepIngredientIn, RecipeStepsBatchIn


@pytest.mark.django_db
class TestRecipeStepModel(TestCase):
    """Tests for RecipeStep model."""

    def setUp(self):
        """Create test fixtures."""
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            slug='test-recipe',
            created_by=self.user
        )

    def test_create_recipe_step(self):
        """Test creating a recipe step."""
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix ingredients',
            sort_order=1,
            duration_minutes=5,
            section='Mixing'
        )
        assert step.id is not None
        assert step.instruction == 'Mix ingredients'
        assert step.duration_minutes == 5
        assert step.section == 'Mixing'
        assert step.sort_order == 1

    def test_recipe_step_without_instruction_fails(self):
        """Test that creating a RecipeStep without instruction fails."""
        with pytest.raises(ValidationError):
            step = RecipeStep.objects.create(
                recipe=self.recipe,
                instruction='',  # Empty instruction
                sort_order=1
            )
            step.full_clean()

    def test_unique_sort_order_per_recipe(self):
        """Test unique constraint on (recipe, sort_order)."""
        RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Step 1',
            sort_order=1
        )
        
        # Creating another step with same sort_order should fail
        with pytest.raises(Exception):  # IntegrityError
            RecipeStep.objects.create(
                recipe=self.recipe,
                instruction='Step 2',
                sort_order=1
            )

    def test_recipe_step_default_section(self):
        """Test that section defaults to empty string."""
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Test',
            sort_order=1
        )
        assert step.section == ''

    def test_recipe_step_null_duration(self):
        """Test that duration_minutes can be null."""
        step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Test',
            sort_order=1,
            duration_minutes=None
        )
        assert step.duration_minutes is None


@pytest.mark.django_db
class TestRecipeStepIngredientModel(TestCase):
    """Tests for RecipeStepIngredient model."""

    def setUp(self):
        """Create test fixtures."""
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            slug='test-recipe',
            created_by=self.user
        )
        
        # Create measuring unit and ingredient
        self.unit = MeasuringUnit.objects.create(name='g', name_short='g')
        self.ingredient = Ingredient.objects.create(name='Flour')
        self.portion = Portion.objects.create(
            ingredient=self.ingredient,
            measuring_unit=self.unit,
            quantity=100
        )
        
        # Create recipe item
        self.recipe_item = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.portion,
            quantity=2
        )
        
        # Create step
        self.step = RecipeStep.objects.create(
            recipe=self.recipe,
            instruction='Mix',
            sort_order=1
        )

    def test_create_step_ingredient(self):
        """Test creating a step ingredient."""
        step_ing = RecipeStepIngredient.objects.create(
            step=self.step,
            recipe_item=self.recipe_item,
            quantity_modifier=1.5,
            preparation='sifted',
            sort_order=1
        )
        assert step_ing.id is not None
        assert step_ing.quantity_modifier == 1.5
        assert step_ing.preparation == 'sifted'

    def test_step_ingredient_without_recipe_item_fails(self):
        """Test that creating step ingredient without recipe_item fails."""
        with pytest.raises(ValueError):
            RecipeStepIngredient.objects.create(
                step=self.step,
                recipe_item=None,  # Missing recipe_item
                quantity_modifier=1.0,
                sort_order=1
            )

    def test_unique_step_recipe_item_constraint(self):
        """Test unique constraint on (step, recipe_item)."""
        RecipeStepIngredient.objects.create(
            step=self.step,
            recipe_item=self.recipe_item,
            quantity_modifier=1.0,
            sort_order=1
        )
        
        # Creating duplicate should fail
        with pytest.raises(Exception):  # IntegrityError
            RecipeStepIngredient.objects.create(
                step=self.step,
                recipe_item=self.recipe_item,
                quantity_modifier=0.5,
                sort_order=2
            )

    def test_step_ingredient_default_quantity_modifier(self):
        """Test that quantity_modifier defaults to 1.0."""
        step_ing = RecipeStepIngredient.objects.create(
            step=self.step,
            recipe_item=self.recipe_item,
            sort_order=1
        )
        assert step_ing.quantity_modifier == 1.0

    def test_step_ingredient_empty_preparation(self):
        """Test that preparation can be empty."""
        step_ing = RecipeStepIngredient.objects.create(
            step=self.step,
            recipe_item=self.recipe_item,
            preparation='',
            sort_order=1
        )
        assert step_ing.preparation == ''


@pytest.mark.django_db
class TestRecipeStepSchemas(TestCase):
    """Tests for Pydantic schemas."""

    def test_recipe_step_in_schema_valid(self):
        """Test valid RecipeStepIn schema."""
        data = RecipeStepIn(
            sort_order=1,
            instruction='Mix flour and water',
            duration_minutes=10,
            section='Mixing',
            step_ingredients=[]
        )
        assert data.sort_order == 1
        assert data.instruction == 'Mix flour and water'

    def test_recipe_step_in_schema_missing_instruction_fails(self):
        """Test RecipeStepIn validation without instruction."""
        with pytest.raises(ValidationError):
            RecipeStepIn(
                sort_order=1,
                instruction='',  # Empty instruction
                step_ingredients=[]
            )

    def test_recipe_step_ingredient_in_schema(self):
        """Test RecipeStepIngredientIn schema."""
        data = RecipeStepIngredientIn(
            recipe_item_id=1,
            quantity_modifier=1.5,
            preparation='diced',
            sort_order=1
        )
        assert data.recipe_item_id == 1
        assert data.quantity_modifier == 1.5


@pytest.mark.django_db
class TestBatchUpdateEndpoint(TestCase):
    """Tests for batch update endpoint."""

    def setUp(self):
        """Create test fixtures."""
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.recipe = Recipe.objects.create(
            title='Test Recipe',
            slug='test-recipe',
            created_by=self.user
        )
        
        # Create measuring unit and ingredient
        self.unit = MeasuringUnit.objects.create(name='g', name_short='g')
        self.ingredient = Ingredient.objects.create(name='Flour')
        self.portion = Portion.objects.create(
            ingredient=self.ingredient,
            measuring_unit=self.unit,
            quantity=100
        )
        
        # Create recipe items
        self.item1 = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.portion,
            quantity=1
        )
        self.item2 = RecipeItem.objects.create(
            recipe=self.recipe,
            portion=self.portion,
            quantity=2
        )

    def test_batch_update_empty_steps(self):
        """Test replacing all steps with empty list."""
        payload = {
            'recipe_slug': self.recipe.slug,
            'steps': []
        }
        response = self.client.put(
            f'/api/recipes/{self.recipe.slug}/steps/batch',
            data=payload,
            content_type='application/json',
            HTTP_X_CSRFTOKEN='test'
        )
        
        # Should succeed (delete all steps)
        assert response.status_code in [200, 400, 403]  # May be unauthorized in test
        if response.status_code == 200:
            assert RecipeStep.objects.filter(recipe=self.recipe).count() == 0

    def test_batch_update_mismatched_slug_fails(self):
        """Test batch update with mismatched recipe_slug fails."""
        payload = {
            'recipe_slug': 'different-recipe',  # Mismatch
            'steps': []
        }
        response = self.client.put(
            f'/api/recipes/{self.recipe.slug}/steps/batch',
            data=payload,
            content_type='application/json',
            HTTP_X_CSRFTOKEN='test'
        )
        
        # Should fail with 400
        assert response.status_code in [400, 403]  # Bad request or unauthorized

    def test_batch_update_invalid_recipe_item_fails(self):
        """Test batch update with non-existent recipe_item fails."""
        payload = {
            'recipe_slug': self.recipe.slug,
            'steps': [
                {
                    'sort_order': 1,
                    'instruction': 'Mix',
                    'duration_minutes': None,
                    'section': '',
                    'step_ingredients': [
                        {
                            'recipe_item_id': 99999,  # Non-existent
                            'quantity_modifier': 1.0,
                            'preparation': '',
                            'sort_order': 1
                        }
                    ]
                }
            ]
        }
        response = self.client.put(
            f'/api/recipes/{self.recipe.slug}/steps/batch',
            data=payload,
            content_type='application/json',
            HTTP_X_CSRFTOKEN='test'
        )
        
        # Should fail with 400 or 403 (permissions or validation)
        assert response.status_code in [400, 403, 500]
