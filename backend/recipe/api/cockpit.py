"""Cockpit & HealthRule API endpoints."""

import datetime as dt

from ninja import Router
from ninja.errors import HttpError

from planner.models import Meal, MealEvent
from recipe.models import HealthRule
from recipe.schemas.cockpit import CockpitDashboardOut, HealthRuleOut
from recipe.services.cockpit_service import (
    evaluate_day_cockpit,
    evaluate_meal_cockpit,
    evaluate_meal_event_cockpit,
)

health_rule_router = Router(tags=["health-rules"])
cockpit_router = Router(tags=["cockpit"])


# ── Health Rules (public, no auth) ──


@health_rule_router.get("/", response=list[HealthRuleOut])
def list_health_rules(request):
    """List all active health rules."""
    return HealthRule.objects.filter(is_active=True).order_by("sort_order")


# ── Cockpit endpoints (scoped to MealEvent) ──


@cockpit_router.get(
    "/meal-events/{meal_event_id}/cockpit/",
    response=CockpitDashboardOut,
)
def get_meal_event_cockpit(request, meal_event_id: int):
    """Get cockpit dashboard for an entire MealEvent."""
    try:
        meal_event = MealEvent.objects.get(id=meal_event_id)
    except MealEvent.DoesNotExist:
        raise HttpError(404, "MealEvent nicht gefunden")
    return evaluate_meal_event_cockpit(meal_event)


@cockpit_router.get(
    "/meal-events/{meal_event_id}/cockpit/day/",
    response=CockpitDashboardOut,
)
def get_day_cockpit(request, meal_event_id: int, date: dt.date):
    """Get cockpit dashboard for a specific day within a MealEvent."""
    try:
        meal_event = MealEvent.objects.get(id=meal_event_id)
    except MealEvent.DoesNotExist:
        raise HttpError(404, "MealEvent nicht gefunden")
    return evaluate_day_cockpit(meal_event, date)


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
