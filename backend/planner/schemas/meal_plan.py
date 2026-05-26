"""MealPlan-related schemas."""

import datetime as dt
from decimal import Decimal

from ninja import Schema


class MealItemOverrideOut(Schema):
    id: int
    recipe_item_id: int
    quantity_override: float | None = None
    excluded: bool = False


class MealItemOverrideIn(Schema):
    recipe_item_id: int
    quantity_override: float | None = None
    excluded: bool = False


class MealItemOut(Schema):
    id: int
    recipe_id: int | None = None
    recipe_title: str = ""
    recipe_slug: str = ""
    recipe_image: str | None = None
    ingredient_id: int | None = None
    ingredient_name: str = ""
    quantity: float | None = None
    measuring_unit_id: int | None = None
    measuring_unit_name: str = ""
    display_name: str | None = None
    factor: float
    overrides: list[MealItemOverrideOut] = []

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

    @staticmethod
    def resolve_ingredient_name(obj) -> str:
        return obj.ingredient.name if obj.ingredient else ""

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str:
        return obj.measuring_unit.name if obj.measuring_unit else ""

    @staticmethod
    def resolve_quantity(obj) -> float | None:
        return float(obj.quantity) if obj.quantity else None

    @staticmethod
    def resolve_overrides(obj) -> list:
        if hasattr(obj, "_prefetched_objects_cache") and "overrides" in obj._prefetched_objects_cache:
            return obj.overrides.all()
        return []


class MealItemCreateIn(Schema):
    recipe_id: int | None = None
    ingredient_id: int | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    display_name: str | None = None
    factor: float = 1.0


class MealOut(Schema):
    id: int
    start_datetime: dt.datetime
    end_datetime: dt.datetime
    meal_type: str
    day_part_factor: float
    override_portions: int | None = None
    note: str = ""
    note_is_published: bool = False
    items: list[MealItemOut] = []


class MealCreateIn(Schema):
    start_datetime: dt.datetime
    end_datetime: dt.datetime
    meal_type: str
    day_part_factor: float | None = None


class MealUpdateIn(Schema):
    override_portions: int | None = None
    note: str | None = None
    note_is_published: bool | None = None


class MealDayBulkCreateIn(Schema):
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
    meals_count: int = 0

    @staticmethod
    def resolve_event_name(obj) -> str:
        if obj.event:
            return obj.event.name
        return ""

    @staticmethod
    def resolve_meals_count(obj) -> int:
        return obj.meals.count()


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
    meals: list[MealOut] = []
    can_edit: bool = False

    @staticmethod
    def resolve_event_name(obj) -> str:
        if obj.event:
            return obj.event.name
        return ""


class NutritionSummaryOut(Schema):
    # Total values (entire MealPlan, all portions)
    energy_kj: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    carbohydrate_g: float = 0.0
    sugar_g: float = 0.0
    fibre_g: float = 0.0
    salt_g: float = 0.0

    # Per Normportion values (total / norm_portions)
    per_portion_energy_kj: float = 0.0
    per_portion_protein_g: float = 0.0
    per_portion_fat_g: float = 0.0
    per_portion_carbohydrate_g: float = 0.0
    per_portion_sugar_g: float = 0.0
    per_portion_fibre_g: float = 0.0
    per_portion_salt_g: float = 0.0

    # Scaling metadata
    norm_portions: int = 1
    activity_factor: float = 1.0
    reserve_factor: float = 1.0
    scaling_factor: float = 1.0


class ShoppingListItemOut(Schema):
    ingredient_id: int | None = None
    ingredient_name: str
    ingredient_slug: str = ""
    total_quantity_g: float
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
    display_quantity: str = ""
    natural_portions: str = ""
