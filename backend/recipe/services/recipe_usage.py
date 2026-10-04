"""Where a recipe is used in meal plans (for delete protection and the delete dialog)."""

from django.db.models import Q

from planner.models import MealPlan, MealPlanVisibility


def plans_using_recipe(recipe_id: int):
    """Meal plans with at least one meal item pointing at the recipe."""
    return MealPlan.objects.filter(meals__items__recipe_id=recipe_id).distinct()


def visible_plans_q(user) -> Q:
    """Plans ``user`` may see: own, collaborating, public or verified (no owner)."""
    if not getattr(user, "is_authenticated", False):
        return Q(owner__isnull=False, visibility=MealPlanVisibility.PUBLIC) | Q(owner__isnull=True)
    return (
        Q(created_by=user)
        | Q(collaborators__user=user)
        | Q(owner__isnull=False, visibility=MealPlanVisibility.PUBLIC)
        | Q(owner__isnull=True)
    )


def recipe_plan_usage(recipe_id: int, user) -> tuple[int, list[dict]]:
    """Return ``(plan_count, visible_plans)``; ``plan_count`` includes plans the user cannot see."""
    plans = plans_using_recipe(recipe_id)
    plan_count = plans.count()
    if plan_count == 0:
        return 0, []
    if getattr(user, "is_staff", False):
        visible = plans
    else:
        visible = plans.filter(visible_plans_q(user)).distinct()
    return plan_count, [{"id": plan.id, "name": plan.name} for plan in visible.order_by("name", "id")]
