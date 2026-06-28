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
class CookingScheduleItem:
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
    items: list[CookingScheduleItem]
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
    norm_portions: int = 0


def parse_recipe_steps(markdown: str) -> list[CookingScheduleStep]:
    if not markdown or not markdown.strip():
        return []

    trimmed = markdown.strip()

    heading_pattern = re.compile(r'^#{2,3}\s+', re.MULTILINE)
    if heading_pattern.search(trimmed):
        parts = re.split(r'^(?=#{2,3}\s+)', trimmed, flags=re.MULTILINE)
        steps = [p.strip() for p in parts if p.strip()]
        if len(steps) > 1:
            return [_step_from_text(s) for s in steps]

    numbered_pattern = re.compile(r'^\d+\.\s+', re.MULTILINE)
    if numbered_pattern.search(trimmed):
        parts = re.split(r'^(?=\d+\.\s+)', trimmed, flags=re.MULTILINE)
        steps = [p.strip() for p in parts if p.strip()]
        if len(steps) > 1:
            return [_step_from_text(s) for s in steps]

    return [_step_from_text(trimmed)]


def _step_from_text(text: str) -> CookingScheduleStep:
    timer = None
    timer_match = re.search(r'\[(?:Timer|timer|Zeit|zeit)\s*:\s*(\d+)\s*(?:min|Min|Minuten|minuten)?\]', text)
    if timer_match:
        timer = int(timer_match.group(1))
    return CookingScheduleStep(text=text.strip(), timer=timer)


def compute_recipe_lead_minutes(recipe) -> int:
    prep = PREPARATION_TIME_MINUTES.get(recipe.preparation_time or "", 0)
    exec_ = EXECUTION_TIME_MINUTES.get(recipe.execution_time or "", 30)
    return prep + exec_


def _compute_scaled_ingredients(recipe, portions: int, factor: float) -> list[CookingScheduleIngredient]:
    recipe_portions = recipe.portions or 1
    scale = factor * (portions / recipe_portions)
    ingredients: list[CookingScheduleIngredient] = []
    for ri in recipe.recipe_items.all():
        portion = ri.portion
        if not portion:
            continue
        ingredient = portion.ingredient
        measuring_unit = portion.measuring_unit
        scaled_qty = round(ri.quantity * portion.quantity * scale, 2)
        weight_g = (
            round(ri.quantity * (portion.weight_g or 0) * scale, 1)
            if portion.weight_g
            else None
        )
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
        recipe.recipe_items.filter(
            portion__ingredient__isnull=False
        ).values_list("portion__ingredient_id", flat=True).distinct()
    )

    if ingredient_ids:
        total = len(ingredient_ids)
        for tag in NutritionalTag.objects.filter(ingredients__id__in=ingredient_ids).annotate(
            ingredient_count=Count("ingredients", filter=Q(ingredients__id__in=ingredient_ids), distinct=True)
        ).filter(ingredient_count=total):
            tags.append({"id": tag.id, "name": tag.name, "name_opposite": tag.name_opposite, "description": tag.description, "rank": tag.rank, "is_dangerous": tag.is_dangerous})

    seen_ids = {t["id"] for t in tags}
    for tag in recipe.nutritional_tags.all():
        if tag.id not in seen_ids:
            tags.append({"id": tag.id, "name": tag.name, "name_opposite": tag.name_opposite, "description": tag.description, "rank": tag.rank, "is_dangerous": tag.is_dangerous})

    return tags


def _collect_ingredient_tags(ingredient) -> list[dict]:
    return [
        {"id": tag.id, "name": tag.name, "name_opposite": tag.name_opposite, "description": tag.description, "rank": tag.rank, "is_dangerous": tag.is_dangerous}
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
    items_by_day: dict[dt.date, list[CookingScheduleItem]] = {}

    for meal in meals:
        if meal.is_external or meal.start_datetime is None:
            excluded_meal_count += 1
            continue

        portions = meal.override_portions if meal.override_portions is not None else meal_plan.norm_portions
        serving_time = meal.start_datetime

        for meal_item in meal.items.all():
            recipe = meal_item.recipe
            if recipe is None:
                continue

            lead_minutes = compute_recipe_lead_minutes(recipe)
            start_time = serving_time - dt.timedelta(minutes=lead_minutes)
            day = serving_time.date()

            ingredients = _compute_scaled_ingredients(recipe, portions, meal_item.factor)
            steps_parsed = parse_recipe_steps(recipe.description)
            nutritional_tags = _collect_nutritional_tags(recipe)
            nutrition = _compute_item_nutrition(meal_item, meal_item, portions)
            cost = _compute_item_cost(meal_item, portions)

            schedule_item = CookingScheduleItem(
                recipe_id=recipe.id,
                recipe_title=recipe.title,
                recipe_slug=recipe.slug,
                meal_type=meal.meal_type,
                serving_time=serving_time,
                lead_minutes=lead_minutes,
                start_time=start_time,
                portions=portions,
                steps=recipe.description or "",
                ingredients=ingredients,
                steps_parsed=steps_parsed,
                nutritional_tags=nutritional_tags,
                total_cost_eur=cost,
                total_energy_kcal=nutrition["energy_kcal"],
                total_protein_g=nutrition["protein_g"],
                total_fat_g=nutrition["fat_g"],
                total_carbohydrate_g=nutrition["carbohydrate_g"],
                meal_note=meal.note or "",
            )

            items_by_day.setdefault(day, []).append(schedule_item)

    days: list[CookingScheduleDay] = []
    total_cost = 0.0
    total_energy = 0.0

    for day, items in sorted(items_by_day.items()):
        sorted_items = sorted(items, key=lambda x: (x.start_time, x.recipe_title))
        day_cost = sum(i.total_cost_eur for i in sorted_items)
        day_energy = sum(i.total_energy_kcal for i in sorted_items)

        day_tags: list[dict] = []
        seen_tag_ids: set[int] = set()
        for item in sorted_items:
            for tag in item.nutritional_tags:
                if tag["id"] not in seen_tag_ids:
                    seen_tag_ids.add(tag["id"])
                    day_tags.append(tag)

        first_start = sorted_items[0].start_time
        last_serving = max(i.serving_time for i in sorted_items)
        duration = int((last_serving - first_start).total_seconds() / 60)
        day_start = first_start.strftime("%H:%M")
        day_end = last_serving.strftime("%H:%M")

        days.append(CookingScheduleDay(
            date=day,
            items=sorted_items,
            day_start_time=day_start,
            day_end_time=day_end,
            day_duration_minutes=duration,
            portions=meal_plan.norm_portions,
            day_nutritional_tags=day_tags,
            total_cost_eur=day_cost,
            total_energy_kcal=day_energy,
        ))

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
