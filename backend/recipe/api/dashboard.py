"""Food Dashboard API — aggregated statistics for the homepage."""

from django.db.models import Avg, Count
from ninja import Router

from planner.models import MealPlan
from planner.models.meal_plan import Meal
from recipe.models import Recipe
from recipe.schemas.dashboard import DashboardInsightsOut, FoodDashboardOut, RecipeInsightOut
from shopping.models import ShoppingList
from supply.models import Ingredient

router = Router(tags=["dashboard"])


@router.get("/food/dashboard/", response=FoodDashboardOut)
def get_food_dashboard(request) -> FoodDashboardOut:
    """Public endpoint returning aggregated food module statistics."""
    recipe_count = Recipe.objects.filter(status="approved").count()
    ingredient_count = Ingredient.objects.count()
    meal_plan_count = MealPlan.objects.count()
    shopping_list_count = ShoppingList.objects.count()

    # Insights
    avg_ingredients = (
        Recipe.objects.filter(status="approved")
        .annotate(item_count=Count("recipe_items"))
        .aggregate(avg=Avg("item_count"))["avg"]
        or 0.0
    )

    # Most planned recipe (recipe appearing in most meal items)
    most_planned = (
        Recipe.objects.filter(status="approved", meal_items__isnull=False)
        .annotate(plan_count=Count("meal_items"))
        .order_by("-plan_count")
        .values("title", "slug", "plan_count")
        .first()
    )

    # Newest recipe
    newest = Recipe.objects.filter(status="approved").order_by("-created_at").values("title", "slug").first()

    # Total unique days with meals planned
    total_meal_days = Meal.objects.dates("start_datetime", "day").count()

    insights = DashboardInsightsOut(
        most_planned_recipe=RecipeInsightOut(**most_planned) if most_planned else None,
        avg_ingredients_per_recipe=round(avg_ingredients, 1),
        newest_recipe=RecipeInsightOut(title=newest["title"], slug=newest["slug"]) if newest else None,
        total_meal_days_planned=total_meal_days,
    )

    return FoodDashboardOut(
        recipe_count=recipe_count,
        ingredient_count=ingredient_count,
        meal_plan_count=meal_plan_count,
        shopping_list_count=shopping_list_count,
        insights=insights,
    )
