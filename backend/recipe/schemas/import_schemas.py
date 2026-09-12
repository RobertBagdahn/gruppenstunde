"""Schemas for recipe URL and smart-input import."""

from typing import Literal

from pydantic import BaseModel, Field


class SmartRecipeInputIn(BaseModel):
    """Free-form recipe input; the backend detects its source type."""

    input: str = Field(min_length=1, max_length=20_000)


class RecipeImportRequestIn(BaseModel):
    url: str


class ImportedIngredientOut(BaseModel):
    name: str
    quantity: str = ""
    unit: str = ""


class RecipeImportPreviewOut(BaseModel):
    title: str
    description: str = ""
    servings: int | None = Field(default=None, ge=1)
    ingredients: list[ImportedIngredientOut] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    image_url: str = ""
    source_url: str = ""
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None


# --- New schemas for Gemini-enhanced import ---


class RecipeItemDraftOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    quantity: float
    measuring_unit_id: int | None = None
    measuring_unit_name: str = ""
    note: str = ""
    is_new_ingredient: bool = False
    portion_id: int | None = None
    # A null portion is stored as grams, so such items must be clarified by the
    # user before the recipe can be saved.
    needs_unit_clarification: bool = False
    suggested_unit_name: str = ""
    suggested_portion_weight_g: float | None = None
    available_portions: list[dict] = Field(default_factory=list)


class CreatedIngredientInfoOut(BaseModel):
    id: int
    name: str
    aliases: list[str] = Field(default_factory=list)
    nutri_class: int | None = None
    name_warning: str | None = None


class RecipeDraftOut(BaseModel):
    title: str
    description: str = ""
    summary: str = ""
    servings: int | None = Field(default=None, ge=1)
    preparation_time: int | None = None
    execution_time: int | None = None
    recipe_type: str = ""
    difficulty: str = "easy"
    execution_time_choice: str = "less_30"
    preparation_time_choice: str = "none"
    scout_level_ids: list[int] = Field(default_factory=list)
    # Tag.id is a UUID, so these are strings. The frontend Zod schema
    # (recipeImport.ts) must validate them as strings, not numbers.
    tag_ids: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    source_url: str = ""
    image_url: str = ""


class RecipeImportUrlResponseOut(BaseModel):
    recipe_draft: RecipeDraftOut
    recipe_items: list[RecipeItemDraftOut] = Field(default_factory=list)
    created_ingredients: list[CreatedIngredientInfoOut] = Field(default_factory=list)
    input_type: Literal["url", "text", "prompt"] = "url"
    # True when the page was unreachable and the data was reconstructed via
    # search grounding. The UI must ask the user to verify it.
    is_reconstructed: bool = False
    ai_interaction_id: str | None = None
