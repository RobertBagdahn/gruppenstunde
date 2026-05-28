"""Cockpit & HealthRule API endpoints."""

import datetime as dt

from ninja import Router
from ninja.errors import HttpError

from planner.models import Meal, MealPlan
from recipe.models import HealthRule
from recipe.schemas.cockpit import (
    CockpitDashboardOut,
    HealthRuleIn,
    HealthRuleOut,
    HealthRuleUpdateIn,
)
from recipe.services.cockpit_service import (
    evaluate_day_cockpit,
    evaluate_meal_cockpit,
    evaluate_meal_plan_cockpit,
)

health_rule_router = Router(tags=["health-rules"])
cockpit_router = Router(tags=["cockpit"])


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")


# ── Health Rules ──


@health_rule_router.get("/", response=list[HealthRuleOut])
def list_health_rules(request):
    """List all health rules (active and inactive for admin)."""
    return HealthRule.objects.all().order_by("sort_order")


@health_rule_router.post("/", response={201: HealthRuleOut})
def create_health_rule(request, payload: HealthRuleIn):
    """Create a new health rule (staff-only)."""
    _require_staff(request)
    rule = HealthRule.objects.create(**payload.dict())
    return 201, rule


@health_rule_router.patch("/{rule_id}/", response=HealthRuleOut)
def update_health_rule(request, rule_id: int, payload: HealthRuleUpdateIn):
    """Update a health rule (staff-only)."""
    _require_staff(request)
    try:
        rule = HealthRule.objects.get(id=rule_id)
    except HealthRule.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(rule, field, value)
    rule.save()
    return rule


@health_rule_router.delete("/{rule_id}/", response={204: None})
def delete_health_rule(request, rule_id: int):
    """Delete a health rule (staff-only)."""
    _require_staff(request)
    try:
        rule = HealthRule.objects.get(id=rule_id)
    except HealthRule.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")
    rule.delete()
    return 204, None


# ── Cockpit endpoints (scoped to MealPlan) ──


@cockpit_router.get(
    "/meal-plans/{meal_plan_id}/cockpit/",
    response=CockpitDashboardOut,
)
def get_meal_plan_cockpit(request, meal_plan_id: int):
    """Get cockpit dashboard for an entire MealPlan."""
    try:
        meal_plan = MealPlan.objects.get(id=meal_plan_id)
    except MealPlan.DoesNotExist:
        raise HttpError(404, "Essensplan nicht gefunden")
    return evaluate_meal_plan_cockpit(meal_plan)


@cockpit_router.get(
    "/meal-plans/{meal_plan_id}/cockpit/day/",
    response=CockpitDashboardOut,
)
def get_day_cockpit(request, meal_plan_id: int, date: dt.date):
    """Get cockpit dashboard for a specific day within a MealPlan."""
    try:
        meal_plan = MealPlan.objects.get(id=meal_plan_id)
    except MealPlan.DoesNotExist:
        raise HttpError(404, "Essensplan nicht gefunden")
    return evaluate_day_cockpit(meal_plan, date)


@cockpit_router.get(
    "/meals/{meal_id}/cockpit/",
    response=CockpitDashboardOut,
)
def get_meal_cockpit(request, meal_id: int):
    """Get cockpit dashboard for a specific meal."""
    try:
        meal = Meal.objects.get(id=meal_id)
    except Meal.DoesNotExist:
        raise HttpError(404, "Mahlzeit nicht gefunden")
    return evaluate_meal_cockpit(meal)
