"""Tests for recipe step helper functions (placeholder resolution, description generation)."""

import pytest
from decimal import Decimal

from recipe.models import Recipe, RecipeStep, RecipeStepIngredient, RecipeItem
from recipe.services.step_helpers import resolve_placeholders, generate_description_from_steps
from supply.models import Ingredient, MeasuringUnit, Portion
from recipe.tests import make_recipe, make_recipe_item


@pytest.mark.django_db
class TestResolvePlaceholders:
    """Test placeholder resolution in recipe step instructions."""

    @pytest.fixture
    def setup(self, db):
        """Set up test data with recipe, ingredients, and recipe items."""
        recipe = make_recipe(title="Test Recipe")
        
        # Create measuring units
        gram_unit, _ = MeasuringUnit.objects.get_or_create(
            name="Gramm",
            defaults={"quantity": 1.0, "short": "g"}
        )
        liter_unit, _ = MeasuringUnit.objects.get_or_create(
            name="Liter",
            defaults={"quantity": 1.0, "short": "l"}
        )
        piece_unit, _ = MeasuringUnit.objects.get_or_create(
            name="Stück",
            defaults={"quantity": 1.0, "short": "Stück"}
        )
        
        # Create ingredients
        flour = Ingredient.objects.create(name="Mehl")
        sugar = Ingredient.objects.create(name="Zucker")
        onion = Ingredient.objects.create(name="Zwiebel")
        milk = Ingredient.objects.create(name="Milch")
        
        # Create portions
        flour_portion = Portion.objects.create(
            ingredient=flour, 
            measuring_unit=gram_unit, 
            quantity=1.0,
            weight_g=1.0
        )
        sugar_portion = Portion.objects.create(
            ingredient=sugar, 
            measuring_unit=gram_unit, 
            quantity=1.0,
            weight_g=1.0
        )
        onion_portion = Portion.objects.create(
            ingredient=onion, 
            measuring_unit=piece_unit, 
            quantity=1.0,
            weight_g=120.0
        )
        milk_portion = Portion.objects.create(
            ingredient=milk, 
            measuring_unit=liter_unit, 
            quantity=1.0,
            weight_g=1000.0
        )
        
        # Create recipe items
        flour_item = RecipeItem.objects.create(
            recipe=recipe, 
            portion=flour_portion, 
            quantity=500,
            sort_order=1
        )
        sugar_item = RecipeItem.objects.create(
            recipe=recipe, 
            portion=sugar_portion, 
            quantity=200,
            sort_order=2
        )
        onion_item = RecipeItem.objects.create(
            recipe=recipe, 
            portion=onion_portion, 
            quantity=2,
            sort_order=3
        )
        milk_item = RecipeItem.objects.create(
            recipe=recipe, 
            portion=milk_portion, 
            quantity=Decimal("0.5"),
            sort_order=4
        )
        
        # Create step with recipe items
        step = RecipeStep.objects.create(
            recipe=recipe, 
            instruction="Test instruction", 
            sort_order=1
        )
        RecipeStepIngredient.objects.create(
            step=step, 
            recipe_item=flour_item, 
            sort_order=1
        )
        RecipeStepIngredient.objects.create(
            step=step, 
            recipe_item=sugar_item, 
            sort_order=2
        )
        RecipeStepIngredient.objects.create(
            step=step, 
            recipe_item=onion_item, 
            sort_order=3
        )
        RecipeStepIngredient.objects.create(
            step=step, 
            recipe_item=milk_item, 
            sort_order=4
        )
        
        return {
            "recipe": recipe,
            "step": step,
            "flour_item": flour_item,
            "sugar_item": sugar_item,
            "onion_item": onion_item,
            "milk_item": milk_item,
            "recipe_items": [flour_item, sugar_item, onion_item, milk_item],
        }

    def test_resolve_numeric_placeholder(self, setup):
        """Test resolving numeric placeholders like {123}."""
        setup["step"].instruction = f"Mix {{{ setup['flour_item'].id}}} with {{{ setup['sugar_item'].id}}}"
        result = resolve_placeholders(setup["step"])
        
        assert "500g Mehl" in result
        assert "200g Zucker" in result

    def test_resolve_name_placeholder(self, setup):
        """Test resolving name-based placeholders like {Mehl}."""
        setup["step"].instruction = "Mix {Mehl} with {Zucker} and {Zwiebel}"
        result = resolve_placeholders(setup["step"])
        
        assert "500g Mehl" in result
        assert "200g Zucker" in result
        assert "2 Stück Zwiebel" in result

    def test_resolve_mixed_placeholders(self, setup):
        """Test resolving both numeric and name-based placeholders together."""
        setup["step"].instruction = f"Combine {{{ setup['flour_item'].id}}} with {{Zucker}} and {{Milch}}"
        result = resolve_placeholders(setup["step"])
        
        assert "500g Mehl" in result
        assert "200g Zucker" in result
        assert "0.5l Milch" in result

    def test_unresolved_placeholder_stays_as_is(self, setup):
        """Test that unresolved placeholders remain unchanged."""
        setup["step"].instruction = "Use {999} and {UnknownIngredient}"
        result = resolve_placeholders(setup["step"])
        
        assert "{999}" in result  # Numeric ID that doesn't exist
        assert "{UnknownIngredient}" in result  # Unknown ingredient name

    def test_resolve_placeholders_with_note(self, setup):
        """Test that notes in recipe items are included in resolved output."""
        setup["flour_item"].note = "griffig"
        setup["flour_item"].save()
        
        setup["step"].instruction = "Use {Mehl}"
        result = resolve_placeholders(setup["step"])
        
        assert "500g Mehl, griffig" in result

    def test_resolve_placeholders_fractional_quantity(self, setup):
        """Test that fractional quantities are formatted correctly."""
        setup["step"].instruction = "Add {Milch}"
        result = resolve_placeholders(setup["step"])
        
        assert "0.5l Milch" in result

    def test_resolve_placeholders_case_insensitive(self, setup):
        """Test that name placeholders are matched case-insensitively."""
        setup["step"].instruction = "Use {MEHL} and {zucker}"
        result = resolve_placeholders(setup["step"])
        
        assert "500g Mehl" in result
        assert "200g Zucker" in result

    def test_resolve_placeholders_with_empty_instruction(self, setup):
        """Test that empty instructions remain empty."""
        setup["step"].instruction = ""
        result = resolve_placeholders(setup["step"])
        
        assert result == ""

    def test_resolve_placeholders_with_no_placeholders(self, setup):
        """Test that text without placeholders remains unchanged."""
        setup["step"].instruction = "Mix everything together for 10 minutes"
        result = resolve_placeholders(setup["step"])
        
        assert result == "Mix everything together for 10 minutes"

    def test_resolve_placeholders_multiple_same_ingredient(self, setup):
        """Test resolving multiple occurrences of the same ingredient."""
        setup["step"].instruction = "First add {Zucker}, then more {Zucker}, finally {Zucker} again"
        result = resolve_placeholders(setup["step"])
        
        # Should replace all occurrences
        count = result.count("200g Zucker")
        assert count == 3


@pytest.mark.django_db
class TestGenerateDescriptionFromSteps:
    """Test description generation from structured recipe steps."""

    @pytest.fixture
    def recipe_with_steps(self, db):
        """Create a recipe with multiple steps."""
        recipe = make_recipe(title="Kuchen")
        
        # Create ingredients and portions
        gram_unit, _ = MeasuringUnit.objects.get_or_create(
            name="Gramm",
            defaults={"quantity": 1.0, "short": "g"}
        )
        
        butter = Ingredient.objects.create(name="Butter")
        eggs = Ingredient.objects.create(name="Eier")
        flour = Ingredient.objects.create(name="Mehl")
        
        butter_portion = Portion.objects.create(
            ingredient=butter, 
            measuring_unit=gram_unit, 
            quantity=1.0,
            weight_g=1.0
        )
        eggs_portion = Portion.objects.create(
            ingredient=eggs, 
            measuring_unit=gram_unit, 
            quantity=1.0,
            weight_g=50.0
        )
        flour_portion = Portion.objects.create(
            ingredient=flour, 
            measuring_unit=gram_unit, 
            quantity=1.0,
            weight_g=1.0
        )
        
        butter_item = RecipeItem.objects.create(
            recipe=recipe, 
            portion=butter_portion, 
            quantity=200,
            sort_order=1
        )
        eggs_item = RecipeItem.objects.create(
            recipe=recipe, 
            portion=eggs_portion, 
            quantity=3,
            sort_order=2
        )
        flour_item = RecipeItem.objects.create(
            recipe=recipe, 
            portion=flour_portion, 
            quantity=300,
            sort_order=3
        )
        
        # Create steps
        step1 = RecipeStep.objects.create(
            recipe=recipe,
            instruction="Melt {Butter} in a pot (5 minutes)",
            duration_minutes=5,
            sort_order=1,
        )
        RecipeStepIngredient.objects.create(
            step=step1, 
            recipe_item=butter_item, 
            sort_order=1
        )
        
        step2 = RecipeStep.objects.create(
            recipe=recipe,
            instruction="Mix {Eier} and {Mehl} together (10 minutes)",
            duration_minutes=10,
            sort_order=2,
        )
        RecipeStepIngredient.objects.create(
            step=step2, 
            recipe_item=eggs_item, 
            sort_order=1
        )
        RecipeStepIngredient.objects.create(
            step=step2, 
            recipe_item=flour_item, 
            sort_order=2
        )
        
        return recipe

    def test_generate_description_basic(self, recipe_with_steps):
        """Test basic description generation from steps."""
        description = generate_description_from_steps(recipe_with_steps)
        
        assert "## Zubereitung" in description
        assert "200g Butter" in description
        assert "Melt" in description

    def test_generate_description_with_sections(self):
        """Test description generation with step sections."""
        recipe = RecipeFactory(name="Rezept mit Sektionen")
        gram_unit = MeasuringUnitFactory(name="Gramm", short="g")
        ingredient = IngredientFactory(name="Ingredienz")
        portion = Portion.objects.create(ingredient=ingredient, measuring_unit=gram_unit, grams_per_unit=1)
        item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=100)
        
        # Create steps in different sections
        step1 = RecipeStep.objects.create(
            recipe=recipe,
            instruction="Prepare",
            section="Vorbereitung",
            sort_order=1,
        )
        RecipeStepIngredient.objects.create(step=step1, recipe_item=item, sort_order=1)
        
        step2 = RecipeStep.objects.create(
            recipe=recipe,
            instruction="Cook",
            section="Kochen",
            sort_order=2,
        )
        RecipeStepIngredient.objects.create(step=step2, recipe_item=item, sort_order=1)
        
        description = generate_description_from_steps(recipe)
        
        assert "### Vorbereitung" in description
        assert "### Kochen" in description

    def test_generate_description_empty_recipe(self):
        """Test that empty recipes generate empty description."""
        recipe = RecipeFactory(name="Empty Recipe")
        description = generate_description_from_steps(recipe)
        
        assert description == ""

    def test_generate_description_placeholder_resolution(self, recipe_with_steps):
        """Test that placeholders are resolved in generated description."""
        description = generate_description_from_steps(recipe_with_steps)
        
        # Should contain resolved quantities, not placeholders
        assert "{Butter}" not in description
        assert "{Eier}" not in description
        assert "{Mehl}" not in description
        assert "200g Butter" in description

    def test_generate_description_step_numbering(self):
        """Test that steps are numbered correctly."""
        recipe = RecipeFactory(name="Rezept")
        gram_unit = MeasuringUnitFactory(name="Gramm", short="g")
        ingredient = IngredientFactory(name="Zutat")
        portion = Portion.objects.create(ingredient=ingredient, measuring_unit=gram_unit, grams_per_unit=1)
        item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=100)
        
        for i in range(1, 4):
            step = RecipeStep.objects.create(
                recipe=recipe,
                instruction=f"Step {i}",
                sort_order=i,
            )
            RecipeStepIngredient.objects.create(step=step, recipe_item=item, sort_order=1)
        
        description = generate_description_from_steps(recipe)
        
        assert "1. Step 1" in description
        assert "2. Step 2" in description
        assert "3. Step 3" in description

    def test_generate_description_duration_display(self):
        """Test that durations are included in description."""
        recipe = RecipeFactory(name="Rezept")
        gram_unit = MeasuringUnitFactory(name="Gramm", short="g")
        ingredient = IngredientFactory(name="Zutat")
        portion = Portion.objects.create(ingredient=ingredient, measuring_unit=gram_unit, grams_per_unit=1)
        item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=100)
        
        step = RecipeStep.objects.create(
            recipe=recipe,
            instruction="Cook slowly",
            duration_minutes=30,
            sort_order=1,
        )
        RecipeStepIngredient.objects.create(step=step, recipe_item=item, sort_order=1)
        
        description = generate_description_from_steps(recipe)
        
        assert "30" in description  # Duration should appear somewhere
