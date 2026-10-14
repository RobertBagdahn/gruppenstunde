"""Mark a meal plan as changed (`MealPlan.updated_at`).

Shopping lists created from a plan are snapshots; they compare their creation time with the plan's
`updated_at` to tell whether the plan changed afterwards (openspec `shopping-list-source-freshness`).
`QuerySet.update` is used on purpose: it neither runs plan signals nor rewrites other fields.
"""

from __future__ import annotations

from django.utils import timezone


def touch_meal_plan(meal_plan_id: int | None) -> None:
    if meal_plan_id is None:
        return
    from planner.models import MealPlan

    MealPlan.objects.filter(id=meal_plan_id).update(updated_at=timezone.now())


def touch_meal_plan_for_meal(meal_id: int | None) -> None:
    """Touch the plan of a meal (no-op when the meal no longer exists, e.g. after a cascade)."""
    if meal_id is None:
        return
    from planner.models import MealPlan

    MealPlan.objects.filter(meals__id=meal_id).update(updated_at=timezone.now())
