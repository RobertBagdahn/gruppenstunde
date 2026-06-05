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
    energy_kj: float | None = None
    cost_eur: float | None = None
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
    def resolve_energy_kj(obj) -> float | None:
        if obj.meal.meal_type == "drinks":
            return 0.0
        if not obj.recipe or obj.recipe.cached_energy_total_kj is None:
            return None
        servings = obj.recipe.servings or 1
        norm_portions = obj.meal.meal_plan.norm_portions or 1
        return float(obj.recipe.cached_energy_total_kj) * obj.factor * (norm_portions / servings)

    @staticmethod
    def resolve_cost_eur(obj) -> float | None:
        if not obj.recipe or obj.recipe.cached_price_total is None:
            return None
        servings = obj.recipe.servings or 1
        norm_portions = obj.meal.meal_plan.norm_portions or 1
        return float(obj.recipe.cached_price_total) * obj.factor * (norm_portions / servings)

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


class MealItemUpdateIn(Schema):
    factor: float | None = None


class CopyItemsFromPlanIn(Schema):
    source_plan_id: int
    source_meal_id: int
    item_ids: list[int] | None = None


class MealOut(Schema):
    id: int
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    meal_type: str
    day_part_factor: float
    override_portions: int | None = None
    note: str = ""
    note_is_published: bool = False
    is_reference: bool = False
    ref_meal_id: int | None = None
    is_synced: bool = False
    is_external: bool = False
    external_energy_kcal: float | None = None
    external_cost_per_person: float | None = None
    total_energy_kj: float = 0.0
    total_cost_eur: float = 0.0
    items: list[MealItemOut] = []

    @staticmethod
    def resolve_external_energy_kcal(obj) -> float | None:
        if obj.external_energy_kj is not None:
            from recipe.services.nutrition_units import kj_to_kcal
            return round(kj_to_kcal(obj.external_energy_kj), 1)
        return None

    @staticmethod
    def resolve_total_energy_kj(obj) -> float:
        if obj.meal_type == "drinks":
            return 0.0
        if obj.is_external:
            if obj.external_energy_kj is not None:
                return obj.external_energy_kj
            from recipe.services.nutrition_units import kcal_to_kj
            return kcal_to_kj(2335.0 * obj.day_part_factor)
        total = 0.0
        for item in obj.items.all():
            if item.recipe and item.recipe.cached_energy_total_kj is not None:
                servings = item.recipe.servings or 1
                norm_portions = obj.meal_plan.norm_portions or 1
                total += float(item.recipe.cached_energy_total_kj) * item.factor * (norm_portions / servings)
        return total

    @staticmethod
    def resolve_total_cost_eur(obj) -> float:
        if obj.is_external:
            if obj.external_cost_per_person is not None:
                portions = obj.override_portions or obj.meal_plan.norm_portions or 0
                return float(obj.external_cost_per_person) * portions
            return 0.0
        total = 0.0
        for item in obj.items.all():
            if item.recipe and item.recipe.cached_price_total is not None:
                servings = item.recipe.servings or 1
                norm_portions = obj.meal_plan.norm_portions or 1
                total += float(item.recipe.cached_price_total) * item.factor * (norm_portions / servings)
        return total


class MealCreateIn(Schema):
    start_datetime: dt.datetime
    end_datetime: dt.datetime
    meal_type: str
    day_part_factor: float | None = None


class MealUpdateIn(Schema):
    override_portions: int | None = None
    note: str | None = None
    note_is_published: bool | None = None
    day_part_factor: float | None = None
    is_external: bool | None = None
    external_energy_kcal: float | None = None
    external_cost_per_person: float | None = None


class MealDayBulkCreateIn(Schema):
    date: dt.date


class MealPlanOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    norm_portions: int
    reserve_factor: float
    budget_per_person_per_day: float | None = None
    event_id: int | None = None
    event_name: str = ""
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    created_by_id: int
    created_at: dt.datetime
    updated_at: dt.datetime
    meals_count: int = 0
    day_part_factors: dict[str, float]

    @staticmethod
    def resolve_event_name(obj) -> str:
        if obj.event:
            return obj.event.name
        return ""

    @staticmethod
    def resolve_meals_count(obj) -> int:
        return obj.meals.count()


class MealPlanDuplicateIn(Schema):
    name: str
    start_datetime: dt.datetime
    norm_portions: int


class MealPlanCreateIn(Schema):
    name: str
    description: str = ""
    norm_portions: int = 10
    reserve_factor: float = 1.1
    event_id: int | None = None
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    day_part_factors: dict[str, float] | None = None


class MealPlanUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    norm_portions: int | None = None
    reserve_factor: float | None = None
    budget_per_person_per_day: float | None = None
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    day_part_factors: dict[str, float] | None = None


class MealPlanDetailOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    norm_portions: int
    reserve_factor: float
    budget_per_person_per_day: float | None = None
    event_id: int | None = None
    event_name: str = ""
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    created_by_id: int
    created_at: dt.datetime
    updated_at: dt.datetime
    day_part_factors: dict[str, float]
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
    reserve_factor: float = 1.0
    scaling_factor: float = 1.0


class ShoppingItemSourceOut(Schema):
    recipe_id: int
    recipe_name: str = ""
    recipe_slug: str = ""
    meal_label: str = ""
    quantity_g: float = 0.0


class ShoppingItemPortionOptionOut(Schema):
    name: str
    display: str
    is_default: bool


class ShoppingListItemOut(Schema):
    ingredient_id: int | None = None
    ingredient_name: str
    ingredient_slug: str = ""
    total_quantity_g: float
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
    display_quantity: str = ""
    display_text: str = ""
    natural_portions: str = ""
    portion_options: list[ShoppingItemPortionOptionOut] = []
    sources: list[ShoppingItemSourceOut] = []

    @staticmethod
    def resolve_total_quantity_g(obj) -> float:
        return round(obj.total_quantity_g, 2)


# ==========================================================================
# MealPlan Collaborator Schemas
# ==========================================================================


class MealPlanCollaboratorOut(Schema):
    id: int
    user_id: int
    username: str = ""
    first_name: str = ""
    last_name: str = ""
    role: str
    created_at: dt.datetime

    @staticmethod
    def resolve_username(obj) -> str:
        return obj.user.username if obj.user else ""

    @staticmethod
    def resolve_first_name(obj) -> str:
        return obj.user.first_name if obj.user else ""

    @staticmethod
    def resolve_last_name(obj) -> str:
        return obj.user.last_name if obj.user else ""


class MealPlanCollaboratorCreateIn(Schema):
    user_id: int
    role: str = "viewer"


class MealPlanCollaboratorUpdateIn(Schema):
    role: str


# ==========================================================================
# Cost Summary Schemas
# ==========================================================================


class MealCostOut(Schema):
    meal_id: int
    meal_type: str
    date: dt.date
    cost: Decimal
    cost_per_person: Decimal


class DayCostOut(Schema):
    date: dt.date
    total_cost: Decimal
    cost_per_person: Decimal
    meals: list[MealCostOut] = []


class RecipeCostOut(Schema):
    recipe_id: int
    recipe_title: str
    recipe_slug: str
    total_cost: Decimal
    cost_per_person: Decimal
    priced_ingredients: int = 0
    total_ingredients: int = 0


class MealPlanCostSummaryOut(Schema):
    total_cost: Decimal
    total_cost_with_reserve: Decimal
    reserve_factor: float
    cost_per_person: Decimal
    norm_portions: int
    total_ingredients: int
    priced_ingredients: int
    days: list[DayCostOut] = []
    recipes: list[RecipeCostOut] = []


# --- RefMeal Schemas ---


class RefMealCreateIn(Schema):
    meal_type: str
    day_part_factor: float | None = None


class RefMealItemIn(Schema):
    recipe_id: int | None = None
    ingredient_id: int | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    display_name: str | None = None
    factor: float = 1.0


class RefMealUpdateIn(Schema):
    day_part_factor: float | None = None
    items: list[RefMealItemIn] | None = None


class RefMealOut(Schema):
    id: int
    meal_type: str
    day_part_factor: float
    items: list[MealItemOut] = []
    synced_meals_count: int = 0
    total_meals_count: int = 0

    @staticmethod
    def resolve_synced_meals_count(obj) -> int:
        return obj.synced_meals.filter(is_synced=True).count()

    @staticmethod
    def resolve_total_meals_count(obj) -> int:
        return obj.meal_plan.meals.filter(
            meal_type=obj.meal_type, is_reference=False
        ).count()


class LinkMealIn(Schema):
    ref_meal_id: int


class RecipeSuggestionOut(Schema):
    id: int
    title: str
    usage_count: int
    image_thumbnail: str | None = None
