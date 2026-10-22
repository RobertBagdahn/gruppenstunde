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
    active_meal_plan_count: int = 0
    shopping_list_count: int
    open_shopping_list_count: int = 0
    insights: DashboardInsightsOut
