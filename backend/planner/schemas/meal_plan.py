"""MealPlan-related schemas."""

import datetime as dt
from decimal import Decimal
from typing import Literal

from ninja import Schema

from planner.services.meal_item_helpers import (
    resolve_ingredient_cost_eur,
    resolve_ingredient_energy_kcal,
)
from supply.data.dge_reference import NORM_PERSON_DAILY_KCAL
from supply.schemas.reference import NutritionalTagOut


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
    image_url: str | None = None
    ingredient_id: int | None = None
    ingredient_name: str = ""
    ingredient_slug: str = ""
    quantity: float | None = None
    measuring_unit_id: int | None = None
    measuring_unit_name: str = ""
    display_name: str | None = None
    factor: float
    active_recipe_item_ids: list[int] = []
    variant_group_id: str | None = None
    energy_kcal: float | None = None
    cost_eur: float | None = None
    quantity_g: float | None = None
    ingredient_tags: list[str] = []
    recipe_type: str = ""
    overrides: list[MealItemOverrideOut] = []
    portion_display: str = ""
    has_missing_weight: bool = False
    is_per_norm_person: bool = True

    @staticmethod
    def resolve_recipe_title(obj) -> str:
        return obj.recipe.title if obj.recipe else ""

    @staticmethod
    def resolve_recipe_slug(obj) -> str:
        return obj.recipe.slug if obj.recipe else ""

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.recipe and obj.recipe.image:
            return obj.recipe.image.url
        return None

    @staticmethod
    def resolve_ingredient_name(obj) -> str:
        return obj.ingredient.name if obj.ingredient else ""

    @staticmethod
    def resolve_ingredient_slug(obj) -> str:
        return obj.ingredient.slug if obj.ingredient else ""

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str:
        return obj.measuring_unit.name if obj.measuring_unit else ""

    @staticmethod
    def resolve_quantity(obj) -> float | None:
        return float(obj.quantity) if obj.quantity else None

    @staticmethod
    def resolve_variant_group_id(obj) -> str | None:
        return str(obj.variant_group_id) if obj.variant_group_id else None

    @staticmethod
    def resolve_energy_kcal(obj) -> float | None:
        if obj.recipe and obj.recipe.cached_energy_total_kcal is not None:
            from planner.services.variant_service import compute_variant_energy

            servings = obj.recipe.portions or 1
            effective_portions = obj.meal.effective_portions
            total = compute_variant_energy(obj)
            return total * obj.factor * (effective_portions / servings)
        if obj.ingredient:
            return resolve_ingredient_energy_kcal(obj, effective_portions=obj.meal.effective_portions)
        return None

    @staticmethod
    def resolve_cost_eur(obj) -> float | None:
        if obj.ingredient:
            from planner.services.meal_item_helpers import resolve_ingredient_cost_eur as ric

            return ric(obj, effective_portions=obj.meal.effective_portions)
        if not obj.recipe or obj.recipe.cached_price_total is None:
            return None
        servings = obj.recipe.portions or 1
        effective_portions = obj.meal.effective_portions
        from planner.services.variant_service import compute_variant_cost

        total = compute_variant_cost(obj)
        return total * obj.factor * (effective_portions / servings)

    @staticmethod
    def resolve_overrides(obj) -> list:
        return list(obj.overrides.all())

    @staticmethod
    def resolve_portion_display(obj) -> str:
        """Return the portion display string scaled per NormPerson."""
        from supply.utils import _format_quantity, format_weight

        # Ingredient-based MealItem (single ingredient, not a recipe)
        if obj.ingredient and obj.quantity and obj.measuring_unit:
            norm_portions = obj.meal.meal_plan.norm_portions or 1
            total_g = None

            name_lower = obj.measuring_unit.name.lower()
            if name_lower in ("g", "gramm"):
                total_g = float(obj.quantity)
            elif name_lower == "ml":
                density = getattr(obj.ingredient, "physical_density", 1.0) or 1.0
                total_g = float(obj.quantity) * density
            else:
                portion = obj.ingredient.portions.filter(measuring_unit=obj.measuring_unit).first()
                if portion and portion.weight_g:
                    total_g = portion.weight_g * float(obj.quantity)

            if total_g is not None:
                per_person_g = total_g / norm_portions
                ingredient_name = obj.ingredient.name or obj.ingredient.slug or ""
                unit_name = obj.measuring_unit.name if obj.measuring_unit.name.lower() != "stück" else ""
                qty_per_person = float(obj.quantity) / norm_portions
                qty_str = _format_quantity(qty_per_person)
                parts = [qty_str]
                if unit_name:
                    parts.append(unit_name)
                if ingredient_name:
                    parts.append(ingredient_name)
                base = " ".join(parts)
                return f"{base} ({format_weight(per_person_g)})"

            ingredient_name = obj.ingredient.name or obj.ingredient.slug or ""
            return ingredient_name

        # Recipe-based MealItem — no per-item portion display
        return ""

    @staticmethod
    def resolve_has_missing_weight(obj) -> bool:
        """Return True if the ingredient has a portion-based unit but no weight_g."""
        if obj.ingredient and obj.quantity and obj.measuring_unit:
            name_lower = obj.measuring_unit.name.lower()
            if name_lower in ("g", "ml"):
                return False
            portion = obj.ingredient.portions.filter(measuring_unit=obj.measuring_unit).first()
            if portion is None or not portion.weight_g:
                return True
        return False

    @staticmethod
    def resolve_ingredient_tags(obj) -> list[str]:
        if obj.ingredient:
            return list(obj.ingredient.tags.values_list("slug", flat=True))
        return []

    @staticmethod
    def resolve_recipe_type(obj) -> str:
        return obj.recipe.recipe_type if obj.recipe else ""

    @staticmethod
    def resolve_quantity_g(obj) -> float | None:
        """Per-person grams for ingredient items."""
        if obj.ingredient and obj.quantity and obj.measuring_unit:
            name_lower = obj.measuring_unit.name.lower()
            if name_lower in ("g",):
                return float(obj.quantity)
            if name_lower in ("ml",):
                density = getattr(obj.ingredient, "physical_density", 1.0) or 1.0
                return float(obj.quantity) * density
            portion = obj.ingredient.portions.filter(measuring_unit=obj.measuring_unit).first()
            if portion and portion.weight_g:
                return portion.weight_g * float(obj.quantity)

            default_portions = obj.ingredient.portions.filter(rank=1, weight_g__isnull=False)
            if default_portions.exists():
                return float(default_portions.first().weight_g) * float(obj.quantity)

            if obj.ingredient.standard_recipe_weight_g:
                return float(obj.ingredient.standard_recipe_weight_g) * float(obj.quantity)
        return None


class MealItemVariantIn(Schema):
    recipe_id: int
    factor: float
    display_name: str | None = None
    active_recipe_item_ids: list[int] = []


class MealItemBatchIn(Schema):
    items: list[MealItemVariantIn]


class MealItemCreateIn(Schema):
    recipe_id: int | None = None
    ingredient_id: int | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    display_name: str | None = None
    factor: float = 1.0


class MealItemUpdateIn(Schema):
    factor: float | None = None
    quantity: float | None = None


class WizardItemsIn(Schema):
    items: list[MealItemCreateIn]


class WizardItemsOut(Schema):
    meal_id: int
    items: list[MealItemOut]


class CopyItemsFromPlanIn(Schema):
    source_plan_id: int
    source_meal_id: int
    note: str | None = None


class MealOut(Schema):
    id: int
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    meal_type: str
    day_part_factor: float
    display_name: str = ""
    override_portions: int | None = None
    note: str = ""
    note_is_published: bool = False
    is_reference: bool = False
    ref_meal_id: int | None = None
    is_synced: bool = False
    is_external: bool = False
    external_energy_kcal: float | None = None
    external_cost_per_person: float | None = None
    total_energy_kcal: float = 0.0
    total_cost_eur: float = 0.0
    items: list[MealItemOut] = []

    @staticmethod
    def resolve_external_energy_kcal(obj) -> float | None:
        if obj.external_energy_kcal is not None:
            return round(obj.external_energy_kcal, 1)
        return None

    @staticmethod
    def resolve_total_energy_kcal(obj) -> float:
        effective_portions = obj.effective_portions
        if obj.is_external:
            if obj.external_energy_kcal is not None:
                return obj.external_energy_kcal * effective_portions
            return NORM_PERSON_DAILY_KCAL * obj.day_part_factor * effective_portions
        total = 0.0
        for item in obj.items.all():
            if item.recipe and item.recipe.cached_energy_total_kcal is not None:
                from planner.services.variant_service import compute_variant_energy

                servings = item.recipe.portions or 1
                total += compute_variant_energy(item) * item.factor * (effective_portions / servings)
            elif item.ingredient:
                kcal = resolve_ingredient_energy_kcal(item, effective_portions=effective_portions)
                if kcal is not None:
                    total += kcal
        return total

    @staticmethod
    def resolve_total_cost_eur(obj) -> float:
        effective_portions = obj.effective_portions
        if obj.is_external:
            if obj.external_cost_per_person is not None:
                return float(obj.external_cost_per_person) * effective_portions
            return 0.0
        total = 0.0
        for item in obj.items.all():
            if item.recipe and item.recipe.cached_price_total is not None:
                from planner.services.variant_service import compute_variant_cost

                servings = item.recipe.portions or 1
                total += compute_variant_cost(item) * item.factor * (effective_portions / servings)
            elif item.ingredient:
                cost = resolve_ingredient_cost_eur(item, effective_portions=effective_portions)
                if cost is not None:
                    total += cost
        return total


class MealCreateIn(Schema):
    start_datetime: dt.datetime
    end_datetime: dt.datetime
    meal_type: str
    day_part_factor: float | None = None
    display_name: str | None = None


class MealUpdateIn(Schema):
    override_portions: int | None = None
    display_name: str | None = None
    note: str | None = None
    note_is_published: bool | None = None
    day_part_factor: float | None = None
    is_external: bool | None = None
    external_energy_kcal: float | None = None
    external_cost_per_person: float | None = None
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None


class MealDayBulkCreateIn(Schema):
    date: dt.date


# ==========================================================================
# MealPlan Tag Schemas
# ==========================================================================


class MealPlanTagOut(Schema):
    id: int
    name: str


class MealPlanTagCreateIn(Schema):
    name: str


class MealPlanOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    norm_portions: float
    previous_norm_portions: float = 10.0
    activity_factor: float = 1.5
    reserve_factor: float
    budget_per_person_per_day: float | None = None
    event_id: int | None = None
    event_name: str = ""
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    created_by_id: int
    owner_id: int | None = None
    owner_name: str | None = None
    visibility: str = "private"
    created_at: dt.datetime
    updated_at: dt.datetime
    meals_count: int = 0
    day_part_factors: dict[str, float]
    meal_default_times: dict[str, list[str]]
    nutritional_tag_ids: list[int] = []
    nutritional_tag_names: list[str] = []
    is_template: bool = False
    is_owner: bool = False
    collaborators_count: int = 0
    tags: list[MealPlanTagOut] = []
    has_group_members: bool = False
    group_members_count: int = 0
    meals_copied: int = 0
    items_copied: int = 0
    overrides_copied: int = 0
    can_edit: bool = False
    can_delete: bool = False

    @staticmethod
    def resolve_event_name(obj) -> str:
        if obj.event:
            return obj.event.name
        return ""

    @staticmethod
    def resolve_meals_count(obj) -> int:
        # Use annotated value when available (list_meal_plans uses annotate)
        ann = getattr(obj, "meals_count_ann", None)
        if ann is not None:
            return ann
        return obj.meals.count()

    @staticmethod
    def resolve_owner_name(obj) -> str | None:
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    @staticmethod
    def resolve_nutritional_tag_ids(obj) -> list[int]:
        # Materialise once; both tag_ids and tag_names share the prefetch cache
        return [tag.id for tag in obj.nutritional_tags.all()]

    @staticmethod
    def resolve_nutritional_tag_names(obj) -> list[str]:
        return [tag.name for tag in obj.nutritional_tags.all()]

    @staticmethod
    def resolve_is_owner(obj) -> bool:
        ann = getattr(obj, "is_owner_ann", None)
        if ann is not None:
            return ann
        return False

    @staticmethod
    def resolve_collaborators_count(obj) -> int:
        ann = getattr(obj, "collaborators_count_ann", None)
        if ann is not None:
            return ann
        return obj.collaborators.count()

    @staticmethod
    def resolve_has_group_members(obj) -> bool:
        return obj.group_members.exists()

    @staticmethod
    def resolve_group_members_count(obj) -> int:
        return obj.group_members.count()


class MealPlanDuplicateIn(Schema):
    name: str
    start_datetime: dt.datetime
    end_datetime: dt.datetime
    norm_portions: float


class MealPlanCreateIn(Schema):
    name: str
    description: str = ""
    norm_portions: float = 10.0
    reserve_factor: float = 1.1
    activity_factor: float = 1.5
    event_id: int | None = None
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    day_part_factors: dict[str, float] | None = None
    meal_default_times: dict[str, list[str]] | None = None
    nutritional_tag_ids: list[int] | None = None


class MealPlanUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    norm_portions: float | None = None
    reserve_factor: float | None = None
    activity_factor: float | None = None
    budget_per_person_per_day: float | None = None
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    day_part_factors: dict[str, float] | None = None
    meal_default_times: dict[str, list[str]] | None = None
    visibility: Literal["private", "group", "public", "draft"] | None = None
    nutritional_tag_ids: list[int] | None = None
    is_template: bool | None = None  # Only respected when set by admins


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
    role: Literal["viewer", "editor", "admin"] = "viewer"


class MealPlanCollaboratorUpdateIn(Schema):
    role: Literal["viewer", "editor", "admin"]


# ==========================================================================


class MealPlanDetailOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    norm_portions: float
    previous_norm_portions: float = 10.0
    activity_factor: float = 1.5
    reserve_factor: float
    budget_per_person_per_day: float | None = None
    event_id: int | None = None
    event_name: str = ""
    start_datetime: dt.datetime | None = None
    end_datetime: dt.datetime | None = None
    created_by_id: int
    owner_id: int | None = None
    owner_name: str | None = None
    visibility: str = "private"
    created_at: dt.datetime
    updated_at: dt.datetime
    day_part_factors: dict[str, float]
    meal_default_times: dict[str, list[str]]
    meals: list[MealOut] = []
    can_edit: bool = False
    is_owner: bool = False
    collaborators: list[MealPlanCollaboratorOut] = []
    nutritional_tag_ids: list[int] = []
    nutritional_tags: list[NutritionalTagOut] = []
    is_template: bool = False
    tags: list[MealPlanTagOut] = []
    has_group_members: bool = False
    group_members_count: int = 0
    group_members: list["GroupMemberOut"] = []
    meals_copied: int = 0
    items_copied: int = 0
    overrides_copied: int = 0

    @staticmethod
    def resolve_event_name(obj) -> str:
        if obj.event:
            return obj.event.name
        return ""

    @staticmethod
    def resolve_owner_name(obj) -> str | None:
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    @staticmethod
    def resolve_nutritional_tag_ids(obj) -> list[int]:
        return [tag.id for tag in obj.nutritional_tags.all()]

    @staticmethod
    def resolve_nutritional_tags(obj) -> list:
        if hasattr(obj, "_prefetched_objects_cache") and "nutritional_tags" in obj._prefetched_objects_cache:
            return obj.nutritional_tags.all()
        return obj.nutritional_tags.all()

    @staticmethod
    def resolve_collaborators(obj) -> list:
        return obj.collaborators.select_related("user").all()

    @staticmethod
    def resolve_has_group_members(obj) -> bool:
        return obj.group_members.exists()

    @staticmethod
    def resolve_group_members_count(obj) -> int:
        return obj.group_members.count()

    @staticmethod
    def resolve_group_members(obj) -> list:
        return obj.group_members.select_related("person").prefetch_related("nutritional_tags").all()


# ==========================================================================
# GroupMember Schemas
# ==========================================================================


class GroupMemberOut(Schema):
    id: int
    name: str | None = None
    age: int
    gender: str
    nutritional_tags: list[NutritionalTagOut] = []
    person_id: int | None = None
    synced_from_event: bool = False

    @staticmethod
    def resolve_nutritional_tags(obj) -> list:
        return obj.nutritional_tags.all()


class GroupMemberCreateIn(Schema):
    name: str | None = None
    age: int
    gender: Literal["male", "female", "no_answer"] = "no_answer"
    nutritional_tag_ids: list[int] = []


class GroupMemberUpdateIn(Schema):
    name: str | None = None
    age: int | None = None
    gender: Literal["male", "female", "no_answer"] | None = None
    nutritional_tag_ids: list[int] | None = None


class GroupMemberBulkCreateIn(Schema):
    count: int
    stufe: Literal["woelflinge", "jungpfadfinder", "pfadfinder", "rover"] | None = None
    default_age: int | None = None
    gender: str = "no_answer"


# ==========================================================================


class NutritionSummaryOut(Schema):
    # Total values (entire MealPlan, all portions)
    energy_kcal: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    carbohydrate_g: float = 0.0
    sugar_g: float = 0.0
    fibre_g: float = 0.0
    salt_g: float = 0.0

    # Per Normportion values (total / norm_portions)
    per_portion_energy_kcal: float = 0.0
    per_portion_protein_g: float = 0.0
    per_portion_fat_g: float = 0.0
    per_portion_carbohydrate_g: float = 0.0
    per_portion_sugar_g: float = 0.0
    per_portion_fibre_g: float = 0.0
    per_portion_salt_g: float = 0.0

    # Scaling metadata
    norm_portions: float = 1.0
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
    net_quantity_g: float = 0.0
    reserve_quantity_g: float = 0.0
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
    display_quantity: str = ""
    display_text: str = ""
    natural_portions: str = ""
    portion_options: list[ShoppingItemPortionOptionOut] = []
    sources: list[ShoppingItemSourceOut] = []


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
    norm_portions: float
    total_ingredients: int
    priced_ingredients: int
    days: list[DayCostOut] = []
    recipes: list[RecipeCostOut] = []


# --- RefMeal Schemas ---


class RefMealItemIn(Schema):
    recipe_id: int | None = None
    ingredient_id: int | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    display_name: str | None = None
    factor: float = 1.0


class RefMealCreateIn(Schema):
    meal_type: str
    day_part_factor: float | None = None
    items: list[RefMealItemIn] | None = None


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
    synced_meal_count: int | None = None
    can_edit: bool = False
    can_delete: bool = False

    @staticmethod
    def resolve_synced_meals_count(obj) -> int:
        return obj.synced_meals.filter(is_synced=True).count()

    @staticmethod
    def resolve_total_meals_count(obj) -> int:
        return obj.meal_plan.meals.filter(meal_type=obj.meal_type, is_reference=False).count()

    @staticmethod
    def resolve_synced_meal_count(obj) -> int | None:
        return getattr(obj, "synced_meal_count", None)


class LinkMealIn(Schema):
    ref_meal_id: int


class RecipeSuggestionOut(Schema):
    id: int
    title: str
    usage_count: int
    image_thumbnail: str | None = None
    recipe_badge: str = "community"
    price_per_serving: float | None = None
    recipe_type: str = ""


# --- Ingredient Scanner Schemas ---


class NutritionalTagViolationOut(Schema):
    meal_id: int
    meal_type: str
    date: dt.date
    recipe_id: int | None = None
    recipe_title: str
    recipe_slug: str = ""
    nutritional_tag: NutritionalTagOut
    source: str = "recipe_tag"


class NutritionalTagScanSummaryOut(Schema):
    total_violations: int
    affected_meals: int
    unique_tags: int


class NutritionalTagScanOut(Schema):
    nutritional_tags: list[NutritionalTagOut]
    violations: list[NutritionalTagViolationOut]
    summary: NutritionalTagScanSummaryOut


class CookingScheduleStepOut(Schema):
    text: str
    timer: int | None = None


class CookingScheduleIngredientOut(Schema):
    name: str
    quantity: float
    unit: str
    note: str
    is_optional: bool
    weight_g: float | None = None
    nutritional_tags: list[NutritionalTagOut] = []


class CookingScheduleVariantOut(Schema):
    variant_group_id: str | None = None
    display_name: str | None = None
    factor: float
    portions: int
    active_recipe_item_ids: list[int] = []
    lead_minutes: int
    start_time: dt.datetime
    total_cost_eur: float = 0.0
    total_energy_kcal: float = 0.0
    total_protein_g: float = 0.0
    total_fat_g: float = 0.0
    total_carbohydrate_g: float = 0.0
    steps: str = ""
    steps_parsed: list[CookingScheduleStepOut] = []
    ingredients: list[CookingScheduleIngredientOut] = []
    meal_note: str = ""


class CookingScheduleRecipeBlockOut(Schema):
    recipe_id: int
    recipe_title: str
    recipe_slug: str
    image_url: str | None = None
    nutritional_tags: list[NutritionalTagOut] = []
    variants: list[CookingScheduleVariantOut]


class CookingScheduleMealOut(Schema):
    meal_id: int
    meal_type: str
    display_name: str
    serving_time: dt.datetime
    note: str = ""
    override_portions: int | None = None
    total_portions: int
    recipe_blocks: list[CookingScheduleRecipeBlockOut]


class CookingScheduleItemOut(Schema):
    """DEPRECATED: Use CookingScheduleVariantOut within CookingScheduleMealOut instead.

    This schema is kept for backward compatibility with existing tests.
    New code should use the nested structure: CookingScheduleOut -> days -> meals -> recipe_blocks -> variants.
    """

    recipe_id: int
    recipe_title: str
    recipe_slug: str
    meal_type: str
    serving_time: dt.datetime
    lead_minutes: int
    start_time: dt.datetime
    portions: int
    steps: str = ""
    ingredients: list[CookingScheduleIngredientOut] = []
    steps_parsed: list[CookingScheduleStepOut] = []
    nutritional_tags: list[NutritionalTagOut] = []
    total_cost_eur: float = 0.0
    total_energy_kcal: float = 0.0
    total_protein_g: float = 0.0
    total_fat_g: float = 0.0
    total_carbohydrate_g: float = 0.0
    meal_note: str = ""


class CookingScheduleDayOut(Schema):
    date: dt.date
    meals: list[CookingScheduleMealOut]
    # DEPRECATED: Use `meals` instead
    items: list[CookingScheduleItemOut] = []
    day_start_time: str = ""
    day_end_time: str = ""
    day_duration_minutes: int = 0
    portions: int = 0
    day_nutritional_tags: list[NutritionalTagOut] = []
    total_cost_eur: float = 0.0
    total_energy_kcal: float = 0.0


class CookingScheduleOut(Schema):
    days: list[CookingScheduleDayOut]
    excluded_meal_count: int
    total_cost_eur: float = 0.0
    total_cost_with_reserve: float = 0.0
    total_energy_kcal: float = 0.0
    norm_portions: float = 0.0


class CalculateIngredientKcalIn(Schema):
    """Request for calculating kcal for multiple ingredients."""

    items: list[dict] = []  # [{"ingredient_id": int, "quantity_g": float}, ...]


class IngredientKcalItemOut(Schema):
    """Single ingredient kcal calculation result."""

    ingredient_id: int
    energy_kcal: float | None = None


class CalculateIngredientKcalOut(Schema):
    """Response for ingredient kcal calculation."""

    items: list[IngredientKcalItemOut]


# ==========================================================================
# Recipe Search (standalone recipes + ingredients)
# ==========================================================================


class NutritionalTagPreviewOut(Schema):
    """Lightweight nutritional tag representation for recipe/ingredient previews."""

    id: int
    name: str


class RecipeSearchResultOut(Schema):
    """A single recipe result within the unified recipe/ingredient search."""

    id: int
    title: str
    slug: str
    recipe_type: str
    image_url: str | None = None
    portions: int | None = None
    cached_energy_kcal: float | None = None
    cached_protein_g: float | None = None
    cached_fat_g: float | None = None
    cached_carbohydrate_g: float | None = None
    cached_price_total: float | None = None
    cached_nutri_class: int | None = None
    nutritional_tags: list[NutritionalTagPreviewOut] = []
    usage_count: int = 0
    description: str | None = None
    ingredients_preview: list[str] = []
    recipe_badge: str = "community"
    price_per_serving: float | None = None


class IngredientPortionPreviewOut(Schema):
    """A portion option shown alongside an ingredient search result."""

    id: int
    name: str
    measuring_unit: str | None = None
    measuring_unit_id: int | None = None
    quantity: float | None = None
    weight_g: float | None = None


class IngredientSearchResultOut(Schema):
    """A single standalone-ingredient result within the unified search."""

    id: int
    name: str
    slug: str
    energy_kcal: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    carbohydrate_g: float | None = None
    nutri_class: int | None = None
    price_per_kg: float | None = None
    usage_count: int = 0
    description: str | None = None
    status: str = ""
    nutritional_tags: list[NutritionalTagPreviewOut] = []
    portions: list[IngredientPortionPreviewOut] = []


class SearchRecipesResponseOut(Schema):
    """Response for the unified recipe/ingredient search used in meal planning."""

    recipes: list[RecipeSearchResultOut] = []
    ingredients: list[IngredientSearchResultOut] = []
    fallback_applied: bool = False


# ==========================================================================
# Popular Recipes
# ==========================================================================


class RecipePopularItemOut(Schema):
    """A single recipe within the popular-recipes personal/community rankings."""

    id: int
    title: str
    recipe_type: str
    image_url: str | None = None
    usage_count: int = 0
    recipe_badge: str = "community"
    price_per_serving: float | None = None


class PopularRecipesResponseOut(Schema):
    """Response for the popular-recipes endpoint."""

    personal: list[RecipePopularItemOut] = []
    community: list[RecipePopularItemOut] = []


# ==========================================================================
# Recently Used Recipes
# ==========================================================================


class RecipeRecentlyUsedOut(Schema):
    """A single recipe within the recently-used-recipes list."""

    id: int
    title: str
    slug: str
    recipe_type: str
    image_url: str | None = None
    portions: int | None = None
    usage_count: int = 0
    recipe_badge: str = "community"
    price_per_serving: float | None = None
    nutritional_tags: list[NutritionalTagPreviewOut] = []


class RecentlyUsedRecipesResponseOut(Schema):
    """Response for the recently-used-recipes endpoint."""

    recipes: list[RecipeRecentlyUsedOut] = []


# ==========================================================================
# Intelligent Recipe Suggestions
# ==========================================================================


class IntelligentSuggestionOut(Schema):
    """A single intelligent recipe suggestion."""

    id: int
    title: str
    slug: str
    image_url: str | None = None
    recipe_type: str
    recipe_badge: str = "community"
    reason: str = ""
    reason_text: str = ""
    usage_count: int = 0
    price_per_serving: float | None = None


class IntelligentSuggestionsResponse(Schema):
    """Response for intelligent recipe suggestions."""

    suggestions: dict[str, list[IntelligentSuggestionOut]]
    total: int = 0
    ai_enhanced: bool = False
    meal_type: str = ""
    day_number: int = 1
