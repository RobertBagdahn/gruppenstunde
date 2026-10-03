"""Food Dashboard API — aggregated statistics for the homepage."""

from django.db.models import Avg, Count, Q
from ninja import Router

from content.services.food_access import public_meal_plan_q, visible_ingredient_queryset, visible_recipe_queryset
from planner.models import MealPlan
from planner.models.meal_plan import Meal
from recipe.models import Recipe
from recipe.schemas.dashboard import DashboardInsightsOut, FoodDashboardOut, RecipeInsightOut
from shopping.models import ShoppingList

router = Router(tags=["dashboard"])


@router.get("/food/dashboard/", response=FoodDashboardOut)
def get_food_dashboard(request) -> FoodDashboardOut:
    """Public endpoint returning aggregated food module statistics.

    The tile counts match what the visitor sees in the respective lists: only
    visible recipes/ingredients, accessible meal plans and the visitor's own
    shopping lists (anonymous visitors have none).
    """
    user = request.user
    recipe_count = visible_recipe_queryset(user).count()
    ingredient_count = visible_ingredient_queryset(user).count()
    if not user.is_authenticated:
        meal_plans = MealPlan.objects.filter(public_meal_plan_q())
        shopping_list_count = 0
    else:
        if user.is_staff:
            meal_plans = MealPlan.objects.all()
        else:
            meal_plans = MealPlan.objects.filter(
                Q(created_by=user) | Q(collaborators__user=user) | public_meal_plan_q()
            ).distinct()
        shopping_list_count = (
            ShoppingList.objects.filter(Q(owner=user) | Q(collaborators__user=user)).distinct().count()
        )
    meal_plan_count = meal_plans.count()

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
