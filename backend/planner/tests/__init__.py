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
    today = datetime.date.today()
    defaults = {
        "name": "Sommerlager Essensplan",
        "description": "Essensplan für das Sommerlager 2026",
        "norm_portions": 10,
        "reserve_factor": 1.1,
        # Wide, deterministic range containing "today" (and the hardcoded
        # example dates used throughout the test suite) so callers don't have
        # to align make_meal()'s date with make_meal_plan()'s by hand.
        "start_datetime": timezone.make_aware(
            datetime.datetime.combine(today - datetime.timedelta(days=3 * 365), datetime.time(0, 0))
        ),
        "end_datetime": timezone.make_aware(
            datetime.datetime.combine(today + datetime.timedelta(days=3 * 365), datetime.time(23, 59))
        ),
    }
    event = kwargs.pop("event", None)
    defaults.update(kwargs)
    # MealPlan has no `status` field — it uses `visibility` (which includes
    # "draft"). Accept `status` as a convenience alias for readability in tests.
    if "status" in defaults:
        defaults["visibility"] = defaults.pop("status")
    meal_plan = baker.make(MealPlan, created_by=created_by, **defaults)
    if event is not None:
        from event.models import EventMealPlanRelation

        EventMealPlanRelation.objects.create(event=event, meal_plan=meal_plan)
    return meal_plan


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


# ---------------------------------------------------------------------------
# Buffet
# ---------------------------------------------------------------------------

BUFFET_ROLE_NAMES = {
    "buffet-bread": "Brot & Gebäck",
    "buffet-fat": "Streichfett",
    "buffet-savory": "Belag herzhaft",
    "buffet-sweet": "Belag süß",
    "buffet-condiment": "Soßen & Würze",
    "buffet-fresh": "Gemüse & Obst",
    "buffet-cereal": "Müsli & Joghurt",
    "buffet-drink": "Getränke",
    "buffet-dish": "Gerichte",
    "buffet-cheese": "Käse",
    "buffet-salty-snack": "Knabbereien",
    "buffet-sweet-snack": "Süßes & Kekse",
    "buffet-nuts": "Nüsse & Trockenobst",
    "buffet-dip": "Dips",
    "buffet-salad": "Salate",
    "buffet-carb": "Beilagen",
    "buffet-main": "Hauptkomponente",
    "buffet-soup": "Suppen & Eintöpfe",
    "buffet-topping": "Toppings & Extras",
}


def make_buffet_roles() -> dict:
    """All buffet role tags (migrations are disabled in tests)."""
    from content.models import Tag

    parent, _ = Tag.objects.get_or_create(slug="buffet", defaults={"name": "Buffet", "group": "buffet"})
    roles = {}
    for index, (slug, name) in enumerate(BUFFET_ROLE_NAMES.items(), start=1):
        roles[slug], _ = Tag.objects.get_or_create(
            slug=slug, defaults={"name": name, "group": "buffet", "parent": parent, "sort_order": index}
        )
    return roles


def make_buffet_template(slug: str = "baguettes", roles: dict | None = None, **kwargs):
    """Template with role configs: ``roles={"buffet-bread": (150, "g", True), ...}``."""
    from planner.models import BuffetTemplate, BuffetTemplateRole

    tags = make_buffet_roles()
    defaults = {"name": slug.title(), "meal_types": ["lunch", "dinner"], "sort_order": 0}
    defaults.update(kwargs)
    template = BuffetTemplate.objects.create(slug=slug, **defaults)
    for sort_order, (role_slug, (amount, unit, enabled)) in enumerate((roles or {}).items()):
        BuffetTemplateRole.objects.create(
            template=template,
            role=tags[role_slug],
            amount_per_person=amount,
            unit=unit,
            enabled_by_default=enabled,
            sort_order=sort_order,
        )
    return template
