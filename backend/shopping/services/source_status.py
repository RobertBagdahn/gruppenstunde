"""Freshness of a shopping list created from a meal plan (openspec `shopping-list-source-freshness`).

The list is a snapshot. It counts as `changed` when the plan was modified after the list was
created, and as `deleted` when the plan is gone. Users without read access to the plan get no
status, so nothing about foreign plans leaks. Plans of a page are loaded in a fixed number of queries.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any, Literal

SourceStatus = Literal["current", "changed", "deleted"]


@dataclass(frozen=True)
class SourceFreshness:
    status: SourceStatus | None = None
    updated_at: dt.datetime | None = None


NO_STATUS = SourceFreshness()


def _readable_plan_ids(user: Any, plans: dict[int, Any]) -> set[int]:
    from django.contrib.contenttypes.models import ContentType

    from content.models import ContentCollaborator
    from content.services.food_access import is_public_meal_plan
    from planner.models import MealPlan, MealPlanCollaborator

    if user is None or not getattr(user, "is_authenticated", False):
        return {plan_id for plan_id, plan in plans.items() if is_public_meal_plan(plan)}
    if user.is_staff:
        return set(plans)
    readable = {
        plan_id for plan_id, plan in plans.items() if plan.created_by_id == user.id or is_public_meal_plan(plan)
    }
    pending = set(plans) - readable
    if pending:
        readable |= set(
            MealPlanCollaborator.objects.filter(meal_plan_id__in=pending, user=user).values_list(
                "meal_plan_id", flat=True
            )
        )
        pending = set(plans) - readable
    if pending:
        content_type = ContentType.objects.get_for_model(MealPlan)
        readable |= set(
            ContentCollaborator.objects.filter(content_type=content_type, object_id__in=pending, user=user).values_list(
                "object_id", flat=True
            )
        )
    return readable


def freshness_for_lists(user: Any, shopping_lists: Iterable[Any]) -> dict[int, SourceFreshness]:
    """Status per shopping list id for plan-based lists; other lists are absent from the result."""
    from planner.models import MealPlan
    from shopping.models import SourceType

    plan_lists = [
        shopping_list
        for shopping_list in shopping_lists
        if shopping_list.source_type == SourceType.MEAL_EVENT and shopping_list.source_id
    ]
    if not plan_lists:
        return {}
    plan_ids = {shopping_list.source_id for shopping_list in plan_lists}
    plans = {plan.id: plan for plan in MealPlan.objects.filter(id__in=plan_ids)}
    readable = _readable_plan_ids(user, plans)

    result: dict[int, SourceFreshness] = {}
    for shopping_list in plan_lists:
        plan = plans.get(shopping_list.source_id)
        if plan is None:
            # A deleted plan reveals nothing about content, but only the list's own readers see this list.
            result[shopping_list.id] = SourceFreshness("deleted", None)
        elif plan.id not in readable:
            result[shopping_list.id] = NO_STATUS
        else:
            status: SourceStatus = "changed" if plan.updated_at > shopping_list.created_at else "current"
            result[shopping_list.id] = SourceFreshness(status, plan.updated_at)
    return result
