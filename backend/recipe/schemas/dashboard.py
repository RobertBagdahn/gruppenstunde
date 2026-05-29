"""Pydantic schemas for the Food Dashboard API."""

from pydantic import BaseModel


class RecipeInsightOut(BaseModel):
    title: str
    slug: str
    plan_count: int | None = None


class DashboardInsightsOut(BaseModel):
    most_planned_recipe: RecipeInsightOut | None = None
    avg_ingredients_per_recipe: float
    newest_recipe: RecipeInsightOut | None = None
    total_meal_days_planned: int


class FoodDashboardOut(BaseModel):
    recipe_count: int
    ingredient_count: int
    meal_plan_count: int
    shopping_list_count: int
    insights: DashboardInsightsOut
