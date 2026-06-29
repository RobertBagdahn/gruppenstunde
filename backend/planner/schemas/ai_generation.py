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


class AiSuggestMeal(Schema):
    meal_type: str
    recipe_id: int
    recipe_title: str


class AiSuggestDay(Schema):
    date: dt.date
    meals: list[AiSuggestMeal]


class AiSuggestOut(Schema):
    days: list[AiSuggestDay]
