"""Schemas for recipe URL import."""

from pydantic import BaseModel, HttpUrl


class RecipeImportRequestIn(BaseModel):
    url: str


class ImportedIngredientOut(BaseModel):
    name: str
    quantity: str = ""
    unit: str = ""


class RecipeImportPreviewOut(BaseModel):
    title: str
    description: str = ""
    servings: int = 4
    ingredients: list[ImportedIngredientOut] = []
    steps: list[str] = []
    image_url: str = ""
    source_url: str = ""
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
