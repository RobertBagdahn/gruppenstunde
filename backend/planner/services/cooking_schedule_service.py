"""Service für die chronologische Kochplan-Berechnung eines Essensplans."""

import datetime as dt
import re
from dataclasses import dataclass, field

from content.choices import ExecutionTimeChoices, PreparationTimeChoices

# Bucket-Obergrenzen in Minuten (konservativ, Worst-Case)
EXECUTION_TIME_MINUTES: dict[str, int] = {
    ExecutionTimeChoices.LESS_30: 30,
    ExecutionTimeChoices.BETWEEN_30_60: 60,
    ExecutionTimeChoices.BETWEEN_60_90: 90,
    ExecutionTimeChoices.MORE_90: 120,
}

PREPARATION_TIME_MINUTES: dict[str, int] = {
    PreparationTimeChoices.NONE: 0,
    PreparationTimeChoices.LESS_15: 15,
    PreparationTimeChoices.BETWEEN_15_30: 30,
    PreparationTimeChoices.BETWEEN_30_60: 60,
    PreparationTimeChoices.MORE_60: 90,
}


@dataclass
class CookingScheduleStep:
    text: str
    timer: int | None = None


@dataclass
class StepIngredient:
    name: str
    quantity: float
    unit: str
    note: str
    is_optional: bool
    weight_g: float | None = None
    nutritional_tags: list[dict] = field(default_factory=list)
    cost_eur: float | None = None
    energy_kcal: float | None = None


@dataclass
class CookingScheduleIngredient:
    name: str
    quantity: float
    unit: str
    note: str
    is_optional: bool
    weight_g: float | None = None


@dataclass
class CookingScheduleVariant:
    """A single variant of a recipe within a meal."""

    variant_group_id: str | None
    display_name: str | None
    factor: float
    portions: int
    active_recipe_item_ids: list[int]
    lead_minutes: int
    start_time: dt.datetime
    steps: str = ""
    ingredients: list[CookingScheduleIngredient] = field(default_factory=list)
    steps_parsed: list[CookingScheduleStep] = field(default_factory=list)
    nutritional_tags: list[dict] = field(default_factory=list)
    total_cost_eur: float = 0.0
    total_energy_kcal: float = 0.0
    total_protein_g: float = 0.0
    total_fat_g: float = 0.0
    total_carbohydrate_g: float = 0.0
    meal_note: str = ""


@dataclass
class CookingScheduleRecipeBlock:
    """A recipe with its variants grouped together."""

    recipe_id: int
    recipe_title: str
    recipe_slug: str
    recipe_image: str | None
    nutritional_tags: list[dict]
    variants: list[CookingScheduleVariant]


@dataclass
class CookingScheduleMeal:
    """A meal (breakfast, lunch, etc.) with its recipe blocks."""

    meal_id: int
    meal_type: str
    display_name: str
    serving_time: dt.datetime
    note: str
    override_portions: int | None
    total_portions: int
    recipe_blocks: list[CookingScheduleRecipeBlock]


@dataclass
class CookingScheduleItem:
    """DEPRECATED: Use CookingScheduleVariant within CookingScheduleMealOut instead.

    Kept for backward compatibility with existing tests.
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
    ingredients: list[CookingScheduleIngredient] = field(default_factory=list)
    steps_parsed: list[CookingScheduleStep] = field(default_factory=list)
    nutritional_tags: list[dict] = field(default_factory=list)
    total_cost_eur: float = 0.0
    total_energy_kcal: float = 0.0
    total_protein_g: float = 0.0
    total_fat_g: float = 0.0
    total_carbohydrate_g: float = 0.0
    meal_note: str = ""


@dataclass
class CookingScheduleDay:
    date: dt.date
    meals: list[CookingScheduleMeal]
    # DEPRECATED: Use `meals` instead
    items: list[CookingScheduleItem] = field(default_factory=list)
    day_start_time: str = ""
    day_end_time: str = ""
    day_duration_minutes: int = 0
    portions: int = 0
    day_nutritional_tags: list[dict] = field(default_factory=list)
    total_cost_eur: float = 0.0
    total_energy_kcal: float = 0.0


@dataclass
class CookingScheduleResult:
    days: list[CookingScheduleDay]
    excluded_meal_count: int
    total_cost_eur: float = 0.0
    total_cost_with_reserve: float = 0.0
    total_energy_kcal: float = 0.0
    norm_portions: float = 0.0


def parse_recipe_steps(markdown: str) -> list[CookingScheduleStep]:
    if not markdown or not markdown.strip():
        return []

    trimmed = markdown.strip()

    heading_pattern = re.compile(r"^#{2,3}\s+", re.MULTILINE)
    if heading_pattern.search(trimmed):
        parts = re.split(r"^(?=#{2,3}\s+)", trimmed, flags=re.MULTILINE)
        steps = [p.strip() for p in parts if p.strip()]
        if len(steps) > 1:
            return [_step_from_text(s) for s in steps]

    numbered_pattern = re.compile(r"^\d+\.\s+", re.MULTILINE)
    if numbered_pattern.search(trimmed):
        parts = re.split(r"^(?=\d+\.\s+)", trimmed, flags=re.MULTILINE)
        steps = [p.strip() for p in parts if p.strip()]
        if len(steps) > 1:
            return [_step_from_text(s) for s in steps]

    return [_step_from_text(trimmed)]


def _step_from_text(text: str) -> CookingScheduleStep:
    timer = None
    timer_match = re.search(r"\[(?:Timer|timer|Zeit|zeit)\s*:\s*(\d+)\s*(?:min|Min|Minuten|minuten)?\]", text)
    if timer_match:
        timer = int(timer_match.group(1))
    return CookingScheduleStep(text=text.strip(), timer=timer)


def compute_recipe_lead_minutes(recipe) -> int:
    prep = PREPARATION_TIME_MINUTES.get(recipe.preparation_time or "", 0)
    exec_ = EXECUTION_TIME_MINUTES.get(recipe.execution_time or "", 30)
    return prep + exec_


def _compute_scaled_ingredients(
    recipe, portions: int, factor: float, active_recipe_item_ids: list[int] | None = None
) -> list[CookingScheduleIngredient]:
    """Compute scaled ingredients for a recipe variant.

    Args:
        recipe: The recipe object
        portions: Number of portions to cook for
        factor: Scale factor (e.g. 0.5 for half recipe)
        active_recipe_item_ids: If set, only include recipe items with IDs in this list.
                                 Exchange group items not in this list are excluded.
                                 Items without exchange groups are always included unless optional.

    Returns:
        List of scaled ingredients
    """

    recipe_portions = recipe.portions or 1
    scale = factor * (portions / recipe_portions)
    ingredients: list[CookingScheduleIngredient] = []
    active_ids_set = set(active_recipe_item_ids or [])

    for ri in recipe.recipe_items.all():
        # Filter logic:
        # 1. If active_recipe_item_ids is set, apply variant filtering
        # 2. Items without exchange group: always include unless optional
        # 3. Items with exchange group: only include if in active_ids
        # 4. Optional items: include only if in active_ids

        has_exchange_group = hasattr(ri, "recipe_item_exchange_group") and ri.recipe_item_exchange_group is not None

        if active_ids_set:
            # Variant filtering is active
            if has_exchange_group:
                # Exchange group item: only include if in active_ids
                if ri.id not in active_ids_set:
                    continue
            elif ri.is_optional:
                # Optional item without exchange group: only include if in active_ids
                if ri.id not in active_ids_set:
                    continue
            # Non-optional items without exchange group are always included

        portion = ri.portion
        if not portion:
            continue
        ingredient = portion.ingredient
        measuring_unit = portion.measuring_unit
        scaled_qty = round(ri.quantity * portion.quantity * scale, 2)
        weight_g = round(ri.quantity * (portion.weight_g or 0) * scale, 1) if portion.weight_g else None
        ingredients.append(
            CookingScheduleIngredient(
                name=ingredient.name if ingredient else portion.name,
                quantity=scaled_qty,
                unit=measuring_unit.name if measuring_unit else "",
                note=ri.note or "",
                is_optional=ri.is_optional,
                weight_g=weight_g,
            )
        )
    return ingredients


def _collect_nutritional_tags(recipe) -> list[dict]:
    from django.db.models import Count, Q

    from supply.models.reference import NutritionalTag

    tags: list[dict] = []

    ingredient_ids = list(
        recipe.recipe_items.filter(portion__ingredient__isnull=False)
        .values_list("portion__ingredient_id", flat=True)
        .distinct()
    )

    if ingredient_ids:
        total = len(ingredient_ids)
        for tag in (
            NutritionalTag.objects.filter(ingredients__id__in=ingredient_ids)
            .annotate(
                ingredient_count=Count("ingredients", filter=Q(ingredients__id__in=ingredient_ids), distinct=True)
            )
            .filter(ingredient_count=total)
        ):
            tags.append(
                {
                    "id": tag.id,
                    "name": tag.name,
                    "name_opposite": tag.name_opposite,
                    "description": tag.description,
                    "rank": tag.rank,
                    "is_dangerous": tag.is_dangerous,
                }
            )

    seen_ids = {t["id"] for t in tags}
    for tag in recipe.nutritional_tags.all():
        if tag.id not in seen_ids:
            tags.append(
                {
                    "id": tag.id,
                    "name": tag.name,
                    "name_opposite": tag.name_opposite,
                    "description": tag.description,
                    "rank": tag.rank,
                    "is_dangerous": tag.is_dangerous,
                }
            )

    return tags


def _collect_ingredient_tags(ingredient) -> list[dict]:
    return [
        {
            "id": tag.id,
            "name": tag.name,
            "name_opposite": tag.name_opposite,
            "description": tag.description,
            "rank": tag.rank,
            "is_dangerous": tag.is_dangerous,
        }
        for tag in ingredient.nutritional_tags.all()
    ]


def _compute_item_nutrition(item, meal_item, effective_portions: int) -> dict[str, float]:
    if not meal_item.recipe or meal_item.recipe.cached_energy_total_kcal is None:
        return {"energy_kcal": 0.0, "protein_g": 0.0, "fat_g": 0.0, "carbohydrate_g": 0.0}

    servings = meal_item.recipe.portions or 1
    scale = meal_item.factor * (effective_portions / servings)

    from planner.services.variant_service import compute_variant_energy

    total_energy = compute_variant_energy(meal_item) * scale

    protein = 0.0
    fat = 0.0
    carbs = 0.0

    r = meal_item.recipe
    if r.cached_protein_g is not None:
        protein = float(r.cached_protein_g) * scale
    if r.cached_fat_g is not None:
        fat = float(r.cached_fat_g) * scale
    if r.cached_carbohydrate_g is not None:
        carbs = float(r.cached_carbohydrate_g) * scale

    return {"energy_kcal": total_energy, "protein_g": protein, "fat_g": fat, "carbohydrate_g": carbs}


def _compute_item_cost(meal_item, effective_portions: int) -> float:
    if not meal_item.recipe or meal_item.recipe.cached_price_total is None:
        return 0.0

    servings = meal_item.recipe.portions or 1
    scale = meal_item.factor * (effective_portions / servings)

    from planner.services.variant_service import compute_variant_cost

    return compute_variant_cost(meal_item) * scale


def build_cooking_schedule(meal_plan) -> CookingScheduleResult:
    from planner.models import Meal

    meals = (
        Meal.objects.filter(meal_plan=meal_plan)
        .select_related("meal_plan")
        .prefetch_related(
            "items__recipe",
            "items__recipe__recipe_items__portion__measuring_unit",
            "items__recipe__recipe_items__portion__ingredient",
            "items__recipe__recipe_items__portion__ingredient__nutritional_tags",
            "items__recipe__nutritional_tags",
        )
        .order_by("start_datetime")
    )

    excluded_meal_count = 0
    meals_by_day: dict[dt.date, list[Meal]] = {}
    meal_items_data: dict[int, list[dict]] = {}  # meal.id -> list of variant data

    # First pass: filter meals and collect meal items grouped by variant
    for meal in meals:
        if meal.is_external or meal.start_datetime is None:
            excluded_meal_count += 1
            continue

        day = meal.start_datetime.date()
        meals_by_day.setdefault(day, []).append(meal)

        # Group meal items by (recipe_id, variant_group_id) to form recipe blocks
        recipe_blocks_dict: dict[tuple[int, str | None], list] = {}

        for meal_item in meal.items.all():
            recipe = meal_item.recipe
            if recipe is None:
                continue

            key = (recipe.id, meal_item.variant_group_id)
            if key not in recipe_blocks_dict:
                recipe_blocks_dict[key] = []
            recipe_blocks_dict[key].append(meal_item)

        meal_items_data[meal.id] = list(recipe_blocks_dict.items())

    # Build days with nested structure
    days: list[CookingScheduleDay] = []
    total_cost = 0.0
    total_energy = 0.0

    for day, meals_for_day in sorted(meals_by_day.items()):
        # Sort meals by serving_time
        sorted_meals = sorted(meals_for_day, key=lambda m: m.start_datetime or dt.datetime.min)

        # Build CookingScheduleMeal objects
        cooking_schedule_meals: list[CookingScheduleMeal] = []

        for meal in sorted_meals:
            portions = meal.override_portions if meal.override_portions is not None else meal_plan.norm_portions
            serving_time = meal.start_datetime

            # Build recipe blocks for this meal
            recipe_blocks: list[CookingScheduleRecipeBlock] = []
            variant_data_list = meal_items_data.get(meal.id, [])

            # Skip meals with no recipe items
            if not variant_data_list:
                continue

            for (recipe_id, variant_group_id), meal_items in variant_data_list:
                # Get the recipe from first meal_item (all have same recipe_id)
                recipe = meal_items[0].recipe

                # Build variants for this recipe block
                variants: list[CookingScheduleVariant] = []
                for meal_item in meal_items:
                    lead_minutes = compute_recipe_lead_minutes(recipe)
                    start_time = serving_time - dt.timedelta(minutes=lead_minutes)

                    # Compute portions and ingredients with variant filtering
                    variant_portions = int(portions * meal_item.factor)
                    active_ids = meal_item.active_recipe_item_ids or []
                    ingredients = _compute_scaled_ingredients(recipe, portions, meal_item.factor, active_ids)

                    steps_parsed = parse_recipe_steps(recipe.description)
                    nutrition = _compute_item_nutrition(meal_item, meal_item, portions)
                    cost = _compute_item_cost(meal_item, portions)

                    variant = CookingScheduleVariant(
                        variant_group_id=str(variant_group_id) if variant_group_id else None,
                        display_name=meal_item.display_name,
                        factor=meal_item.factor,
                        portions=variant_portions,
                        active_recipe_item_ids=active_ids,
                        lead_minutes=lead_minutes,
                        start_time=start_time,
                        steps=recipe.description or "",
                        ingredients=ingredients,
                        steps_parsed=steps_parsed,
                        nutritional_tags=_collect_nutritional_tags(recipe),
                        total_cost_eur=cost,
                        total_energy_kcal=nutrition["energy_kcal"],
                        total_protein_g=nutrition["protein_g"],
                        total_fat_g=nutrition["fat_g"],
                        total_carbohydrate_g=nutrition["carbohydrate_g"],
                        meal_note=meal.note or "",
                    )
                    variants.append(variant)

                # Sort variants by start_time
                variants.sort(key=lambda v: v.start_time)

                # Build recipe block
                recipe_block = CookingScheduleRecipeBlock(
                    recipe_id=recipe.id,
                    recipe_title=recipe.title,
                    recipe_slug=recipe.slug,
                    recipe_image=recipe.image.url if recipe.image else None,
                    nutritional_tags=_collect_nutritional_tags(recipe),
                    variants=variants,
                )
                recipe_blocks.append(recipe_block)

            # Sort recipe blocks by earliest variant start_time
            recipe_blocks.sort(key=lambda rb: min(v.start_time for v in rb.variants) if rb.variants else serving_time)

            # Build meal
            cooking_meal = CookingScheduleMeal(
                meal_id=meal.id,
                meal_type=meal.meal_type,
                display_name=meal.display_name or meal.get_meal_type_display(),
                serving_time=serving_time,
                note=meal.note or "",
                override_portions=meal.override_portions,
                total_portions=portions,
                recipe_blocks=recipe_blocks,
            )
            cooking_schedule_meals.append(cooking_meal)

        # Compute day totals
        day_cost = 0.0
        day_energy = 0.0
        day_tags: dict[int, dict] = {}

        for meal in cooking_schedule_meals:
            for recipe_block in meal.recipe_blocks:
                for variant in recipe_block.variants:
                    day_cost += variant.total_cost_eur
                    day_energy += variant.total_energy_kcal
                    for tag in variant.nutritional_tags:
                        if tag["id"] not in day_tags:
                            day_tags[tag["id"]] = tag

        # Compute day timing
        first_start = min(
            (v.start_time for m in cooking_schedule_meals for rb in m.recipe_blocks for v in rb.variants), default=None
        )
        last_serving = max((m.serving_time for m in cooking_schedule_meals), default=None)

        if first_start and last_serving:
            duration = int((last_serving - first_start).total_seconds() / 60)
            day_start = first_start.strftime("%H:%M")
            day_end = last_serving.strftime("%H:%M")
        else:
            duration = 0
            day_start = ""
            day_end = ""

        # Build backward-compat items list (flattened variants)
        compat_items: list[CookingScheduleItem] = []
        for meal in cooking_schedule_meals:
            for recipe_block in meal.recipe_blocks:
                for variant in recipe_block.variants:
                    compat_item = CookingScheduleItem(
                        recipe_id=recipe_block.recipe_id,
                        recipe_title=recipe_block.recipe_title,
                        recipe_slug=recipe_block.recipe_slug,
                        meal_type=meal.meal_type,
                        serving_time=meal.serving_time,
                        lead_minutes=variant.lead_minutes,
                        start_time=variant.start_time,
                        portions=variant.portions,
                        steps=variant.steps,
                        ingredients=variant.ingredients,
                        steps_parsed=variant.steps_parsed,
                        nutritional_tags=variant.nutritional_tags,
                        total_cost_eur=variant.total_cost_eur,
                        total_energy_kcal=variant.total_energy_kcal,
                        total_protein_g=variant.total_protein_g,
                        total_fat_g=variant.total_fat_g,
                        total_carbohydrate_g=variant.total_carbohydrate_g,
                        meal_note=variant.meal_note,
                    )
                    compat_items.append(compat_item)

        # Skip days with no meals
        if not cooking_schedule_meals:
            continue

        # Sort compat items for consistency
        compat_items.sort(key=lambda x: (x.start_time, x.recipe_title))

        days.append(
            CookingScheduleDay(
                date=day,
                meals=cooking_schedule_meals,
                items=compat_items,  # Keep for backward compat
                day_start_time=day_start,
                day_end_time=day_end,
                day_duration_minutes=duration,
                portions=meal_plan.norm_portions,
                day_nutritional_tags=list(day_tags.values()),
                total_cost_eur=day_cost,
                total_energy_kcal=day_energy,
            )
        )

        total_cost += day_cost
        total_energy += day_energy

    reserve = meal_plan.reserve_factor or 1.0

    return CookingScheduleResult(
        days=days,
        excluded_meal_count=excluded_meal_count,
        total_cost_eur=total_cost,
        total_cost_with_reserve=total_cost * reserve,
        total_energy_kcal=total_energy,
        norm_portions=meal_plan.norm_portions,
    )
