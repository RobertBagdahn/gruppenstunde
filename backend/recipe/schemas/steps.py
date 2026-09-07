"""Pydantic schemas for recipe steps."""

import datetime as dt

from ninja import Schema
from pydantic import field_validator

# --- Output Schemas ---


class RecipeStepIngredientOut(Schema):
    """Schema for a recipe step ingredient (read-only)."""

    id: int
    recipe_item_id: int
    quantity_modifier: float = 1.0
    preparation: str = ""
    sort_order: int = 0
    # Resolved fields
    ingredient_name: str | None = None
    ingredient_id: int | None = None
    unit_short: str | None = None
    quantity: float | None = None  # Modified quantity (recipe_item.quantity * quantity_modifier)
    note: str | None = None  # Recipe item note

    @staticmethod
    def resolve_ingredient_name(obj) -> str | None:
        """Resolve from recipe_item.portion.ingredient.name."""
        if obj.recipe_item:
            portion = obj.recipe_item.portion
            if portion and portion.ingredient:
                return portion.ingredient.name
        return None

    @staticmethod
    def resolve_ingredient_id(obj) -> int | None:
        """Resolve from recipe_item.portion.ingredient.id."""
        if obj.recipe_item:
            portion = obj.recipe_item.portion
            if portion and portion.ingredient:
                return portion.ingredient.id
        return None

    @staticmethod
    def resolve_unit_short(obj) -> str | None:
        """Resolve from recipe_item.portion.measuring_unit.unit."""
        if obj.recipe_item:
            portion = obj.recipe_item.portion
            if portion and portion.measuring_unit:
                return portion.measuring_unit.unit
        return None

    @staticmethod
    def resolve_quantity(obj) -> float | None:
        """Calculate modified quantity = recipe_item.quantity * quantity_modifier."""
        if obj.recipe_item and obj.quantity_modifier:
            return obj.recipe_item.quantity * obj.quantity_modifier
        return None

    @staticmethod
    def resolve_note(obj) -> str | None:
        """Resolve from recipe_item.note."""
        if obj.recipe_item:
            return obj.recipe_item.note or None
        return None


class RecipeStepOut(Schema):
    """Schema for a recipe step (read-only)."""

    id: int
    sort_order: int
    instruction: str
    duration_minutes: int | None = None
    section: str = ""
    created_at: dt.datetime
    updated_at: dt.datetime
    step_ingredients: list[RecipeStepIngredientOut] = []


class RecipeStepsListOut(Schema):
    """Schema for list of recipe steps."""

    recipe_id: int
    recipe_slug: str
    has_structured_steps: bool
    steps: list[RecipeStepOut] = []
    count: int = 0


# --- Input Schemas with Validation ---


class RecipeStepIngredientIn(Schema):
    """Schema for creating/updating a recipe step ingredient."""

    recipe_item_id: int
    quantity_modifier: float = 1.0
    preparation: str = ""
    sort_order: int = 0

    @field_validator("recipe_item_id")
    @classmethod
    def validate_recipe_item_exists(cls, v):
        """Validate the identifier shape; ownership is checked by the API."""
        return v

    @field_validator("quantity_modifier")
    @classmethod
    def validate_quantity_modifier(cls, v):
        """Validate quantity_modifier is positive."""
        if v <= 0:
            raise ValueError("quantity_modifier must be positive")
        return v


class RecipeStepIn(Schema):
    """Schema for creating/updating a recipe step."""

    sort_order: int
    instruction: str
    duration_minutes: int | None = None
    section: str = ""
    step_ingredients: list[RecipeStepIngredientIn] = []

    @field_validator("instruction")
    @classmethod
    def validate_instruction_not_empty(cls, v):
        """Validate that instruction is not empty."""
        if not v or not v.strip():
            raise ValueError("instruction must not be empty")
        return v

    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v):
        """Validate sort_order is non-negative."""
        if v < 0:
            raise ValueError("sort_order must be non-negative")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration_minutes(cls, v):
        """Validate duration_minutes is positive if set."""
        if v is not None and v <= 0:
            raise ValueError("duration_minutes must be positive if set")
        return v


class RecipeStepsBatchIn(Schema):
    """Schema for batch updating all steps of a recipe (replace all steps)."""

    recipe_slug: str
    steps: list[RecipeStepIn]


# --- Update to RecipeDetailOut ---
# Note: This schema modification needs to be added to recipes.py
# Add these fields to RecipeDetailOut:
#   has_structured_steps: bool = False
#   steps: list[RecipeStepOut] = []
#
# And add this resolver:
#   @staticmethod
#   def resolve_has_structured_steps(obj) -> bool:
#       return obj.steps.exists() if hasattr(obj, 'steps') else False
#
#   @staticmethod
#   def resolve_steps(obj) -> list:
#       if hasattr(obj, 'steps'):
#           return list(obj.steps.all().order_by('sort_order'))
#       return []
