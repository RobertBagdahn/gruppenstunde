"""Service für die chronologische Kochplan-Berechnung eines Essensplans."""

import datetime as dt
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


@dataclass
class CookingScheduleDay:
    date: dt.date
    items: list[CookingScheduleItem]


@dataclass
class CookingScheduleResult:
    days: list[CookingScheduleDay]
    excluded_meal_count: int


def compute_recipe_lead_minutes(recipe) -> int:
    """Gesamte Vorlaufzeit = Vorbereitung + Kochzeit (Bucket-Obergrenzen)."""
    prep = PREPARATION_TIME_MINUTES.get(recipe.preparation_time or "", 0)
    exec_ = EXECUTION_TIME_MINUTES.get(recipe.execution_time or "", 30)
    return prep + exec_


def _compute_scaled_ingredients(recipe, portions: int, factor: float) -> list[CookingScheduleIngredient]:
    """Berechne skalierte Zutaten für ein Rezept basierend auf Portionen und Faktor."""
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


def build_cooking_schedule(meal_plan) -> CookingScheduleResult:
    """Baut den chronologischen Kochplan für einen Essensplan auf.

    Liefert pro Tag eine aufsteigend nach Startzeit sortierte Liste aller
    zu kochenden Rezepte inkl. skalierter Zutaten und Zubereitungsschritte.
    Externe Mahlzeiten und Mahlzeiten ohne Servierzeit werden ausgeschlossen.
    """
    from planner.models import Meal

    meals = (
        Meal.objects.filter(meal_plan=meal_plan)
        .select_related("meal_plan")
        .prefetch_related(
            "items__recipe",
            "items__recipe__recipe_items__portion__measuring_unit",
            "items__recipe__recipe_items__portion__ingredient",
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
            )

            items_by_day.setdefault(day, []).append(schedule_item)

    # Sortierung: aufsteigend nach Startzeit, Sekundär nach Rezeptname
    days = [
        CookingScheduleDay(
            date=day,
            items=sorted(items, key=lambda x: (x.start_time, x.recipe_title)),
        )
        for day, items in sorted(items_by_day.items())
    ]

    return CookingScheduleResult(days=days, excluded_meal_count=excluded_meal_count)
