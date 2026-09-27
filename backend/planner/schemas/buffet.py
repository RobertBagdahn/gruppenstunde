"""Schemas for buffet templates, the buffet builder and quantity warnings."""

from typing import Literal

from ninja import Schema
from pydantic import Field, model_validator


class QuantityWarningOut(Schema):
    meal_item_id: int | None = None
    meal_id: int | None = None
    ingredient_name: str
    per_person_value: float
    per_person_unit: str
    total_value: float
    total_unit: str
    message: str


class BuffetRoleOut(Schema):
    slug: str
    name: str
    icon: str = ""


class BuffetTemplateRoleOut(Schema):
    role: BuffetRoleOut
    amount_per_person: float
    unit: Literal["g", "ml"]
    enabled_by_default: bool
    sort_order: int
    default_ingredient_ids: list[int] = []
    default_recipe_ids: list[int] = []


class BuffetTemplateOut(Schema):
    id: int
    name: str
    slug: str
    description: str = ""
    meal_types: list[str] = []
    sort_order: int = 0
    roles: list[BuffetTemplateRoleOut] = []


class BuffetSelectionIn(Schema):
    role_slug: str = Field(min_length=1, max_length=50)
    ingredient_id: int | None = None
    recipe_id: int | None = None

    @model_validator(mode="after")
    def _exactly_one(self) -> "BuffetSelectionIn":
        if (self.ingredient_id is None) == (self.recipe_id is None):
            raise ValueError("Genau eine Zutat oder ein Rezept angeben")
        return self


class BuffetSaveIn(Schema):
    template_id: int
    selections: list[BuffetSelectionIn] = []
    role_amounts: dict[str, float] | None = None
    dry_run: bool = False

    @model_validator(mode="after")
    def _positive_amounts(self) -> "BuffetSaveIn":
        for slug, amount in (self.role_amounts or {}).items():
            if amount <= 0 or amount > 5000:
                raise ValueError(f"Menge für {slug} muss zwischen 0 und 5000 liegen")
        return self


class BuffetResultItemOut(Schema):
    role_slug: str
    kind: Literal["ingredient", "recipe"]
    id: int
    name: str
    amount_per_person: float
    unit: Literal["g", "ml"]
    total_amount: float
    factor: float
    energy_kcal_per_person: float | None = None
    cost_per_person: float | None = None
    cost_total: float | None = None


class BuffetResultOut(Schema):
    saved: bool
    portions: float
    items: list[BuffetResultItemOut] = []
    energy_kcal_per_person: float
    target_kcal_per_person: float
    cost_per_person: float
    cost_total: float
    warnings: list[QuantityWarningOut] = []


class BuffetStateSelectionOut(Schema):
    role_slug: str
    ingredient_id: int | None = None
    recipe_id: int | None = None


class BuffetStateOut(Schema):
    template_id: int | None = None
    selections: list[BuffetStateSelectionOut] = []
    role_amounts: dict[str, float] = {}
