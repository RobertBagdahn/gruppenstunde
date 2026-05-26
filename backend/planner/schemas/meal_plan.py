"""MealPlan-related schemas."""

import datetime as dt

from ninja import Schema


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
    start_datetime: dt.datetime
    end_datetime: dt.datetime
    meal_type: str
    day_part_factor: float
    items: list[MealItemOut] = []


class MealCreateIn(Schema):
    start_datetime: dt.datetime
    end_datetime: dt.datetime
    meal_type: str
    day_part_factor: float | None = None


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
