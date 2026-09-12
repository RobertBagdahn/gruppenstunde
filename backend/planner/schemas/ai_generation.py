"""Pydantic schemas for AI-powered meal plan generation."""

import datetime as dt

from ninja import Schema


class AiSuggestIn(Schema):
    prompt: str
    num_persons: int
    num_days: int
    start_date: dt.date
    nutritional_tag_ids: list[int] | None = None
    budget_per_person_per_day: float | None = None


class AiSuggestMealItem(Schema):
    recipe_id: int | None = None
    ingredient_id: int | None = None
    title: str
    quantity: float | None = None
    unit: str | None = None


class AiSuggestMeal(Schema):
    meal_type: str
    recipe_id: int | None = None
    recipe_title: str
    source_meal_id: int | None = None
    items: list[AiSuggestMealItem] = []


class AiSuggestDay(Schema):
    date: dt.date
    meals: list[AiSuggestMeal]


class AiSuggestOut(Schema):
    days: list[AiSuggestDay]
    ai_interaction_id: str | None = None


AiApplyIn = AiSuggestOut


class SkippedItem(Schema):
    day: dt.date
    meal_type: str
    recipe_id: int | None = None
    reason: str


class AiApplyOut(Schema):
    applied: int
    skipped: int
    skipped_items: list[SkippedItem]
