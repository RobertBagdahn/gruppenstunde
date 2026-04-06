"""Pydantic schemas for the Planner API."""

import datetime as dt

from ninja import Schema


class PlannerOut(Schema):
    id: int
    title: str
    group_id: int | None = None
    group_name: str = ""
    weekday: int
    time: dt.time
    created_at: dt.datetime
    updated_at: dt.datetime

    @staticmethod
    def resolve_group_name(obj) -> str:
        if obj.group:
            return obj.group.name
        return ""


class PlannerCreateIn(Schema):
    title: str
    group_id: int | None = None
    weekday: int = 4  # Friday
    time: dt.time = dt.time(18, 0)


class PlannerUpdateIn(Schema):
    title: str | None = None
    group_id: int | None = None
    weekday: int | None = None
    time: dt.time | None = None


class PlannerEntryOut(Schema):
    id: int
    idea_id: int | None
    idea_title: str | None
    idea_slug: str | None
    date: dt.date
    notes: str
    status: str
    sort_order: int

    @staticmethod
    def resolve_idea_title(obj) -> str | None:
        if obj.idea:
            return obj.idea.title
        return None

    @staticmethod
    def resolve_idea_slug(obj) -> str | None:
        if obj.idea:
            return obj.idea.slug
        return None


class PlannerEntryIn(Schema):
    idea_id: int | None = None
    date: dt.date
    notes: str = ""
    status: str = "planned"
    sort_order: int = 0


class PlannerEntryUpdateIn(Schema):
    idea_id: int | None = None
    date: dt.date | None = None
    notes: str | None = None
    status: str | None = None
    sort_order: int | None = None


class PlannerDetailOut(Schema):
    id: int
    title: str
    group_id: int | None = None
    group_name: str = ""
    weekday: int
    time: dt.time
    entries: list[PlannerEntryOut]
    collaborators: list["CollaboratorOut"]
    can_edit: bool = False
    created_at: dt.datetime

    @staticmethod
    def resolve_group_name(obj) -> str:
        if obj.group:
            return obj.group.name
        return ""


class CollaboratorOut(Schema):
    id: int
    user_id: int
    username: str
    role: str

    @staticmethod
    def resolve_username(obj) -> str:
        return obj.user.get_username()


class InviteIn(Schema):
    user_id: int
    role: str = "viewer"


# ==========================================================================
# Meal Plan Schemas
# ==========================================================================


class MealItemOut(Schema):
    id: int
    recipe_id: int
    recipe_title: str = ""
    recipe_slug: str = ""
    recipe_image: str | None = None
    factor: float

    @staticmethod
    def resolve_recipe_title(obj) -> str:
        return obj.recipe.title if obj.recipe else ""

    @staticmethod
    def resolve_recipe_slug(obj) -> str:
        return obj.recipe.slug if obj.recipe else ""

    @staticmethod
    def resolve_recipe_image(obj) -> str | None:
        if obj.recipe and obj.recipe.image:
            return obj.recipe.image.url
        return None


class MealItemCreateIn(Schema):
    recipe_id: int
    factor: float = 1.0


class MealOut(Schema):
    id: int
    meal_type: str
    time_start: dt.time | None = None
    time_end: dt.time | None = None
    day_part_factor: float
    items: list[MealItemOut] = []


class MealCreateIn(Schema):
    meal_type: str
    time_start: dt.time | None = None
    time_end: dt.time | None = None
    day_part_factor: float | None = None


class MealDayOut(Schema):
    id: int
    date: dt.date
    meals: list[MealOut] = []


class MealDayCreateIn(Schema):
    date: dt.date


class MealPlanOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    norm_portions: int
    activity_factor: float
    reserve_factor: float
    event_id: int | None = None
    event_name: str = ""
    created_by_id: int
    created_at: dt.datetime
    updated_at: dt.datetime
    days_count: int = 0

    @staticmethod
    def resolve_event_name(obj) -> str:
        if obj.event:
            return obj.event.name
        return ""

    @staticmethod
    def resolve_days_count(obj) -> int:
        return obj.days.count()


class MealPlanCreateIn(Schema):
    name: str
    description: str = ""
    norm_portions: int = 10
    activity_factor: float = 1.5
    reserve_factor: float = 1.1
    event_id: int | None = None
    start_date: dt.date | None = None
    num_days: int = 3


class MealPlanUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    norm_portions: int | None = None
    activity_factor: float | None = None
    reserve_factor: float | None = None


class MealPlanDetailOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    norm_portions: int
    activity_factor: float
    reserve_factor: float
    event_id: int | None = None
    event_name: str = ""
    created_by_id: int
    created_at: dt.datetime
    updated_at: dt.datetime
    days: list[MealDayOut] = []
    can_edit: bool = False

    @staticmethod
    def resolve_event_name(obj) -> str:
        if obj.event:
            return obj.event.name
        return ""


class NutritionSummaryOut(Schema):
    energy_kj: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    carbohydrate_g: float = 0.0
    sugar_g: float = 0.0
    fibre_g: float = 0.0
    salt_g: float = 0.0


class ShoppingListItemOut(Schema):
    ingredient_name: str
    total_quantity_g: float
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
