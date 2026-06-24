"""Factories for creating test data (planner app)."""

import datetime

from django.utils import timezone
from model_bakery import baker

from planner.models import (
    EntryStatusChoices,
    Meal,
    MealItem,
    MealPlan,
    MealTypeChoices,
    Planner,
    PlannerCollaborator,
    PlannerEntry,
    WeekdayChoices,
)

# ---------------------------------------------------------------------------
# Planner
# ---------------------------------------------------------------------------


def make_planner(owner=None, **kwargs) -> Planner:
    if owner is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        owner = baker.make(User)
    defaults = {
        "title": "Wölflings-Gruppenstunden Herbst 2026",
        "weekday": WeekdayChoices.FRIDAY,
        "time": datetime.time(18, 0),
    }
    defaults.update(kwargs)
    return baker.make(Planner, owner=owner, **defaults)


# ---------------------------------------------------------------------------
# PlannerEntry
# ---------------------------------------------------------------------------


def make_planner_entry(planner: Planner | None = None, **kwargs) -> PlannerEntry:
    if planner is None:
        planner = make_planner()
    defaults = {
        "date": datetime.date.today() + datetime.timedelta(days=7),
        "notes": "",
        "status": EntryStatusChoices.PLANNED,
        "sort_order": 0,
    }
    defaults.update(kwargs)
    return baker.make(PlannerEntry, planner=planner, **defaults)


# ---------------------------------------------------------------------------
# PlannerCollaborator
# ---------------------------------------------------------------------------


def make_planner_collaborator(planner: Planner | None = None, user=None, **kwargs) -> PlannerCollaborator:
    if planner is None:
        planner = make_planner()
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    defaults = {
        "role": PlannerCollaborator.Role.EDITOR,
    }
    defaults.update(kwargs)
    return baker.make(PlannerCollaborator, planner=planner, user=user, **defaults)


# ---------------------------------------------------------------------------
# MealPlan
# ---------------------------------------------------------------------------


def make_meal_plan(created_by=None, **kwargs) -> MealPlan:
    if created_by is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        created_by = baker.make(User)
    defaults = {
        "name": "Sommerlager Essensplan",
        "description": "Essensplan für das Sommerlager 2026",
        "norm_portions": 10,
        "reserve_factor": 1.1,
    }
    defaults.update(kwargs)
    return baker.make(MealPlan, created_by=created_by, **defaults)


# ---------------------------------------------------------------------------
# Meal
# ---------------------------------------------------------------------------


def make_meal(meal_plan: MealPlan | None = None, **kwargs) -> Meal:
    if meal_plan is None:
        meal_plan = make_meal_plan()
    today = datetime.date.today()
    meal_type = kwargs.get("meal_type", MealTypeChoices.LUNCH)

    # Dynamically select day part factor based on meal type if not explicitly provided
    from planner.models.meal_plan import MEAL_TYPE_DAY_FACTORS

    day_part_factor = kwargs.get("day_part_factor", MEAL_TYPE_DAY_FACTORS.get(meal_type, 0.30))

    defaults = {
        "start_datetime": timezone.make_aware(datetime.datetime.combine(today, datetime.time(12, 0))),
        "end_datetime": timezone.make_aware(datetime.datetime.combine(today, datetime.time(13, 0))),
        "meal_type": meal_type,
        "day_part_factor": day_part_factor,
    }
    defaults.update(kwargs)
    return baker.make(Meal, meal_plan=meal_plan, **defaults)


# ---------------------------------------------------------------------------
# MealItem
# ---------------------------------------------------------------------------


def make_meal_item(meal: Meal | None = None, recipe=None, **kwargs) -> MealItem:
    if meal is None:
        meal = make_meal()
    if recipe is None:
        from recipe.tests import make_recipe

        recipe = make_recipe()
    defaults = {
        "factor": 1.0,
    }
    defaults.update(kwargs)
    return baker.make(MealItem, meal=meal, recipe=recipe, **defaults)
