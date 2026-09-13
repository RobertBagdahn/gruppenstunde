"""PDF export service for MealPlans using WeasyPrint."""

import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import cast

from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML

from content.choices import ExecutionTimeChoices, PreparationTimeChoices
from planner.models import Meal, MealItem, MealPlan
from supply.data.dge_reference import (
    NORM_PERSON_DAILY_CARBS_G,
    NORM_PERSON_DAILY_FAT_G,
    NORM_PERSON_DAILY_KCAL,
    NORM_PERSON_DAILY_PROTEIN_G,
)

MEAL_TYPE_LABELS = {
    "breakfast": "Frühstück",
    "lunch": "Mittagessen",
    "dinner": "Abendessen",
    "snack": "Snacks",
}

MEAL_TYPE_ICONS = {
    "breakfast": "F",
    "lunch": "M",
    "dinner": "A",
    "snack": "S",
}

ALLERGEN_COLORS = {
    "gluten": "gluten",
    "laktose": "lactose",
    "milch": "lactose",
    "milch/laktose": "lactose",
    "eier": "eggs",
    "ei": "eggs",
    "nüsse": "nuts",
    "nuss": "nuts",
    "schalenfrüchte": "nuts",
    "erdnüsse": "nuts",
    "erbsen": "nuts",
    "fisch": "fish",
    "krebstiere": "crustaceans",
    "soja": "soy",
    "sellerie": "celery",
    "senf": "mustard",
    "sesam": "sesame",
    "sulfite": "sulfites",
    "lupinen": "lupin",
    "weichtiere": "molluscs",
}

PREPARATION_TIME_MINUTES: dict[str, int] = {
    PreparationTimeChoices.NONE: 0,
    PreparationTimeChoices.LESS_15: 15,
    PreparationTimeChoices.BETWEEN_15_30: 30,
    PreparationTimeChoices.BETWEEN_30_60: 60,
    PreparationTimeChoices.MORE_60: 90,
}

EXECUTION_TIME_MINUTES: dict[str, int] = {
    ExecutionTimeChoices.LESS_30: 30,
    ExecutionTimeChoices.BETWEEN_30_60: 60,
    ExecutionTimeChoices.BETWEEN_60_90: 90,
    ExecutionTimeChoices.MORE_90: 120,
}

EU_ALLERGENS = [
    "Gluten",
    "Krebstiere",
    "Eier",
    "Fisch",
    "Erdnüsse",
    "Soja",
    "Milch/Laktose",
    "Schalenfrüchte",
    "Sellerie",
    "Senf",
    "Sesam",
    "Sulfite",
    "Lupinen",
    "Weichtiere",
]

FRESH_SECTION_NAMES = {"Fleisch", "Fisch", "Frische Kräuter", "Frischgemüse"}


def _get_allergen_css_class(allergen_name: str) -> str:
    """Map allergen name to CSS class for badge coloring."""
    name_lower = allergen_name.lower()
    for key, css_class in ALLERGEN_COLORS.items():
        if key in name_lower:
            return css_class
    return "default"


def _get_recipe_allergens(recipe) -> list[dict]:
    """Get distinct dangerous allergen tags from recipe's ingredients."""
    if not recipe:
        return []
    allergens = {}
    for ri in recipe.recipe_items.select_related("portion__ingredient").all():
        if ri.portion and ri.portion.ingredient:
            for tag in ri.portion.ingredient.nutritional_tags.all():
                if _get_eu_allergen(tag.name) and tag.name not in allergens:
                    allergens[tag.name] = {
                        "name": tag.name,
                        "css_class": _get_allergen_css_class(tag.name),
                    }
    return sorted(allergens.values(), key=lambda a: a["name"])


def _get_ingredient_allergens(ingredient) -> list[dict]:
    """Get distinct dangerous allergen tags from a direct ingredient."""
    if not ingredient:
        return []
    allergens = {}
    for tag in ingredient.nutritional_tags.all():
        if _get_eu_allergen(tag.name) and tag.name not in allergens:
            allergens[tag.name] = {
                "name": tag.name,
                "css_class": _get_allergen_css_class(tag.name),
            }
    return sorted(allergens.values(), key=lambda a: a["name"])


def _get_eu_allergen(name: str) -> str | None:
    """Return the canonical EU allergen name for a tag, including non-dangerous tags."""
    normalized = name.lower().replace("ä", "a").replace("ö", "o").replace("ü", "u")
    aliases = {
        "gluten": "gluten",
        "weizen": "gluten",
        "roggen": "gluten",
        "gerste": "gluten",
        "hafer": "gluten",
        "milch": "milch/laktose",
        "laktose": "milch/laktose",
        "ei": "eier",
        "eier": "eier",
        "erdnuss": "erdnüsse",
        "erdnüsse": "erdnüsse",
        "nuss": "schalenfrüchte",
        "nüsse": "schalenfrüchte",
        "schalenfrucht": "schalenfrüchte",
        "schalenfrüchte": "schalenfrüchte",
    }
    for alias, canonical in aliases.items():
        if alias in normalized:
            return canonical
    for allergen in EU_ALLERGENS:
        if allergen.lower() in name.lower():
            return allergen.lower()
    return None


def _extract_steps_from_markdown(markdown_text: str) -> list[dict]:
    """Extract preparation steps from markdown description."""
    if not markdown_text or not markdown_text.strip():
        return []
    lines = markdown_text.strip().split("\n")
    steps = []
    step_num = 1
    current_section = ""
    for line in lines:
        line = line.strip()
        if not line:
            continue
        heading_match = re.match(r"^#{1,3}\s*(.+)$", line)
        if heading_match:
            current_section = heading_match.group(1).strip()
            continue
        match = re.match(r"^\d+[.)]\s*(.+)$", line)
        if match:
            text = match.group(1).strip()
        elif line.startswith("- ") or line.startswith("* "):
            text = line[2:].strip()
        else:
            text = line

        timer = None
        timer_match = re.search(
            r"(?:\[|\()(?:Timer|timer|Zeit|zeit|ca\.?)?\s*(\d+)\s*(?:min|Min|Minuten|minuten)?\.?\s*(?:\]|\))",
            text,
        )
        if timer_match:
            try:
                timer = int(timer_match.group(1))
            except (ValueError, TypeError):
                timer = None

        steps.append(
            {
                "number": step_num,
                "instruction": text,
                "duration_minutes": timer,
                "section": current_section,
            }
        )
        step_num += 1
    return steps


def _get_recipe_steps(recipe) -> list[dict]:
    """Get structured recipe steps with resolved placeholders or parsed from description."""
    if not recipe:
        return []

    steps_qs = recipe.steps.all().order_by("sort_order")
    if steps_qs.exists():
        recipe_items_map = {
            ri.id: ri for ri in recipe.recipe_items.select_related("portion__ingredient", "portion__measuring_unit")
        }
        from recipe.services.step_helpers import resolve_placeholders

        result: list[dict] = []
        for idx, s in enumerate(steps_qs, 1):
            try:
                instruction = resolve_placeholders(s, recipe_items_map)
            except Exception:
                instruction = s.instruction
            instruction = re.sub(r"\{([^{}]+)\}", r"\1", instruction)
            if re.match(r"^#{1,3}\s*.+$", instruction.strip()):
                continue
            result.append(
                {
                    "number": len(result) + 1,
                    "instruction": instruction,
                    "duration_minutes": s.duration_minutes,
                    "section": s.section or "",
                }
            )
        return result

    if recipe.description:
        return _extract_steps_from_markdown(recipe.description)

    return []


def _compute_recipe_lead_minutes(recipe) -> int:
    """Calculate preparation and cooking lead time in minutes for a recipe."""
    if not recipe:
        return 30
    prep = PREPARATION_TIME_MINUTES.get(recipe.preparation_time or "", 0)
    exec_ = EXECUTION_TIME_MINUTES.get(recipe.execution_time or "", 0)
    total = prep + exec_
    if total > 0:
        return total
    step_duration = sum(s.duration_minutes or 0 for s in recipe.steps.all())
    if step_duration > 0:
        return step_duration
    return 30


def _compute_meal_lead_minutes(meal: Meal, recipes: list) -> int:
    """Calculate preparation lead time in minutes for an entire meal."""
    valid_recipes = [r for r in recipes if r]
    if valid_recipes:
        return max(_compute_recipe_lead_minutes(r) for r in valid_recipes)
    type_defaults = {
        "breakfast": 20,
        "lunch": 45,
        "dinner": 45,
        "snack": 15,
    }
    return type_defaults.get(meal.meal_type, 30)


def _compute_meal_timing(meal: Meal, lead_minutes: int) -> dict:
    """Compute eating start time and cooking start time for a meal."""
    from django.utils import timezone

    if meal.start_datetime:
        start_dt = (
            timezone.localtime(meal.start_datetime) if timezone.is_aware(meal.start_datetime) else meal.start_datetime
        )
        eating_time = start_dt.strftime("%H:%M")
        eating_time_full = f"{eating_time} Uhr"
        cook_start_dt = start_dt - timedelta(minutes=lead_minutes)
        cook_start_time = cook_start_dt.strftime("%H:%M")
        cook_start_time_full = f"{cook_start_time} Uhr"
    else:
        fallback_times = {
            "breakfast": ("07:30", "08:00"),
            "lunch": ("11:45", "12:30"),
            "snack": ("15:15", "15:30"),
            "dinner": ("18:00", "18:45"),
        }
        fallback = fallback_times.get(meal.meal_type)
        if fallback:
            cook_start_time = fallback[0]
            cook_start_time_full = f"{fallback[0]} Uhr"
            eating_time = fallback[1]
            eating_time_full = f"{fallback[1]} Uhr"
        else:
            cook_start_time = "--:--"
            cook_start_time_full = "Vor Beginn"
            eating_time = "--:--"
            eating_time_full = "Nach Absprache"

    return {
        "eating_time": eating_time,
        "eating_time_full": eating_time_full,
        "cook_start_time": cook_start_time,
        "cook_start_time_full": cook_start_time_full,
        "lead_minutes": lead_minutes,
        "lead_display": f"{lead_minutes} Min.",
    }


def _get_short_weekday(d: date) -> str:
    """Get short German weekday abbreviation."""
    weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    return weekdays[d.weekday()]


def _format_date(d: date) -> str:
    """Format a date in German locale: 'Montag, 12.07.2026'."""
    try:
        from babel.dates import format_date

        return format_date(d, format="full", locale="de_DE")
    except ImportError:
        return d.strftime("%A, %d.%m.%Y")


def _format_decimal(value: float, digits: int = 1) -> str:
    """Format a decimal number with German locale (comma as decimal separator)."""
    try:
        from babel.numbers import format_decimal

        return format_decimal(value, format=f"#,##0.{'0' * digits}", locale="de_DE")
    except ImportError:
        return f"{value:.{digits}f}".replace(".", ",")


def _get_weekday(d: date) -> str:
    """Get German weekday name."""
    weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    return weekdays[d.weekday()]


def _build_meal_context(meal_plan: MealPlan) -> list[dict]:
    """Group meals by date, detect exchange splits, compute effective portions."""
    meals = (
        Meal.objects.filter(meal_plan=meal_plan, is_reference=False)
        .select_related("meal_plan")
        .prefetch_related(
            "items__recipe__recipe_items__portion__ingredient__retail_section",
            "items__recipe__recipe_items__portion__ingredient__nutritional_tags",
            "items__recipe__recipe_items__portion__measuring_unit",
            "items__recipe__nutritional_tags",
            "items__recipe__steps",
            "items__ingredient__retail_section",
            "items__ingredient__nutritional_tags",
            "items__measuring_unit",
            "items__overrides__recipe_item__portion__ingredient",
        )
        .order_by("start_datetime")
    )

    overrides = _collect_ingredient_overrides(meal_plan)

    from django.utils import timezone

    days: dict[str, list[Meal]] = defaultdict(list)
    for meal in meals:
        if meal.start_datetime:
            dt = (
                timezone.localtime(meal.start_datetime)
                if timezone.is_aware(meal.start_datetime)
                else meal.start_datetime
            )
            date_str = dt.strftime("%Y-%m-%d")
        else:
            date_str = "unbekannt"
        days[date_str].append(meal)

    result = []
    for date_str, day_meals in sorted(days.items()):
        try:
            day_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            day_label = f"{_get_weekday(day_date)}, {day_date.strftime('%d.%m.%Y')}"
            day_short = f"{_get_short_weekday(day_date)}, {day_date.strftime('%d.%m.')}"
        except ValueError:
            day_label = date_str
            day_short = date_str

        meal_data = []
        for meal in day_meals:
            portions = meal.effective_portions
            meal_type_label = MEAL_TYPE_LABELS.get(meal.meal_type, meal.meal_type)
            icon = MEAL_TYPE_ICONS.get(meal.meal_type, "•")

            items = list(meal.items.all())
            recipes = [item.recipe for item in items if item.recipe]
            lead_minutes = _compute_meal_lead_minutes(meal, recipes)
            timing = _compute_meal_timing(meal, lead_minutes)

            dishes = []
            allergens_map = {}
            for item in items:
                name = item.display_name or (
                    item.recipe.title if item.recipe else (item.ingredient.name if item.ingredient else "?")
                )
                dishes.append(name)
                if item.recipe:
                    for a in _get_recipe_allergens(item.recipe):
                        allergens_map[a["name"]] = a
                elif item.ingredient:
                    for a in _get_ingredient_allergens(item.ingredient):
                        allergens_map[a["name"]] = a

            meal_allergens = sorted(allergens_map.values(), key=lambda a: a["name"])

            items_by_variant: dict[str, list[MealItem]] = defaultdict(list)
            for item in items:
                if item.variant_group_id:
                    items_by_variant[str(item.variant_group_id)].append(item)
                else:
                    items_by_variant[f"single_{item.id}"].append(item)

            portions_str = str(int(portions)) if float(portions).is_integer() else _format_decimal(float(portions), 1)

            grouped_variants = [
                variant_items
                for variant_key, variant_items in items_by_variant.items()
                if not variant_key.startswith("single_")
            ]
            has_exchange_split = bool(grouped_variants) and (
                len(grouped_variants) > 1 or any(len(variant_items) > 1 for variant_items in grouped_variants)
            )

            if has_exchange_split:
                sub_meals = []
                for variant_id, variant_items in sorted(items_by_variant.items()):
                    for item in variant_items:
                        sub_meals.append(_build_sub_meal(item, portions, meal_plan.reserve_factor, overrides))
                meal_data.append(
                    {
                        "meal_id": meal.id,
                        "meal_type": meal.meal_type,
                        "meal_type_label": meal_type_label,
                        "icon": icon,
                        "time_label": timing["eating_time"],
                        "eating_time": timing["eating_time_full"],
                        "cook_start_time": timing["cook_start_time_full"],
                        "lead_display": timing["lead_display"],
                        "lead_minutes": timing["lead_minutes"],
                        "portions": portions,
                        "portions_formatted": portions_str,
                        "portions_display": f"{portions_str} Personen",
                        "dishes": dishes,
                        "allergens": meal_allergens,
                        "sub_meals": sub_meals,
                        "items": [],
                        "note": meal.note if (meal.note and meal.note_is_published) else "",
                    }
                )
            else:
                items_data = []
                for item in items:
                    items_data.append(_build_item_data(item, portions, meal_plan.reserve_factor, overrides))
                meal_data.append(
                    {
                        "meal_id": meal.id,
                        "meal_type": meal.meal_type,
                        "meal_type_label": meal_type_label,
                        "icon": icon,
                        "time_label": timing["eating_time"],
                        "eating_time": timing["eating_time_full"],
                        "cook_start_time": timing["cook_start_time_full"],
                        "lead_display": timing["lead_display"],
                        "lead_minutes": timing["lead_minutes"],
                        "portions": portions,
                        "portions_formatted": portions_str,
                        "portions_display": f"{portions_str} Personen",
                        "dishes": dishes,
                        "allergens": meal_allergens,
                        "sub_meals": [],
                        "items": items_data,
                        "note": meal.note if (meal.note and meal.note_is_published) else "",
                    }
                )

        result.append(
            {
                "label": day_label,
                "day_short": day_short,
                "meals": meal_data,
                "day_meals_raw": day_meals,
            }
        )

    return result


def _build_sub_meal(item: MealItem, portions: float, reserve_factor: float, overrides: dict) -> dict:
    """Build a sub-meal block for exchange-split variants."""
    recipe_name = item.display_name or (
        item.recipe.title if item.recipe else (item.ingredient.name if item.ingredient else "?")
    )
    portions_value = portions * item.factor
    portions_display = (
        str(int(portions_value)) if float(portions_value).is_integer() else _format_decimal(portions_value, 1)
    )

    if item.recipe:
        ingredients = _get_recipe_ingredients(item, portions, reserve_factor, overrides.get(item.id, {}))
        steps = _get_recipe_steps(item.recipe)
        allergens = _get_recipe_allergens(item.recipe)
        lead_minutes = _compute_recipe_lead_minutes(item.recipe)
    elif item.ingredient:
        quantity_display = _format_scaled_direct_quantity(item, portions, reserve_factor)
        ingredients = [f"{item.ingredient.name} — {quantity_display}"]
        steps = []
        allergens = _get_ingredient_allergens(item.ingredient)
        lead_minutes = 15
    else:
        ingredients = []
        steps = []
        allergens = []
        lead_minutes = 0

    return {
        "recipe_name": recipe_name,
        "portions_display": portions_display,
        "ingredients": ingredients,
        "steps": steps,
        "allergens": allergens,
        "lead_minutes": lead_minutes,
    }


def _build_item_data(item: MealItem, portions: float, reserve_factor: float, overrides: dict) -> dict:
    """Build item data for a single (non-exchange-split) meal item."""
    recipe_name = item.display_name or (
        item.recipe.title if item.recipe else (item.ingredient.name if item.ingredient else "?")
    )
    portions_label = f"{_format_decimal(portions * item.factor, 0)} Pers." if item.factor != 1.0 else None
    item_overrides = overrides.get(item.id, {})

    excluded = item_overrides.get("excluded", False)
    if item.recipe:
        ingredients = _get_recipe_ingredients(item, portions, reserve_factor, item_overrides)
        steps = _get_recipe_steps(item.recipe)
        allergens = _get_recipe_allergens(item.recipe)
        lead_minutes = _compute_recipe_lead_minutes(item.recipe)
    elif item.ingredient:
        quantity_display = _format_scaled_direct_quantity(item, portions, reserve_factor)
        ingredients = [f"{item.ingredient.name} — {quantity_display}"]
        steps = []
        allergens = _get_ingredient_allergens(item.ingredient)
        lead_minutes = 15
    else:
        ingredients = []
        steps = []
        allergens = []
        lead_minutes = 0

    return {
        "recipe_name": recipe_name,
        "portions_label": portions_label,
        "ingredients": ingredients,
        "excluded": excluded,
        "steps": steps,
        "allergens": allergens,
        "lead_minutes": lead_minutes,
    }


def _format_scaled_direct_quantity(item: MealItem, portions: float, reserve_factor: float) -> str:
    """Format a direct ingredient quantity scaled by portions * reserve_factor * item.factor."""
    quantity_display = (
        f"{_format_decimal(float(item.quantity or 0), 1)} {item.measuring_unit.name if item.measuring_unit else ''}"
    )
    if item.factor == 1.0 and portions == 1 and reserve_factor == 1.0:
        return quantity_display.strip()
    scaled = float(item.quantity or 0) * item.factor * portions * reserve_factor
    return f"{_format_decimal(scaled, 1)} {item.measuring_unit.name if item.measuring_unit else ''}".strip()


def _get_recipe_ingredients(item: MealItem, portions: float, reserve_factor: float, item_overrides: dict) -> list[str]:
    """Get formatted ingredient strings for a recipe item, scaled to effective portions and active variants."""
    from planner.services.calculation_context import active_recipe_items

    recipe = item.recipe
    if not recipe:
        return []

    ingredients = []
    active_items = active_recipe_items(item)
    recipe_servings = max(recipe.portions or 1, 1)

    for active in active_items:
        ri = active.recipe_item
        if ri.portion and ri.portion.ingredient:
            override_key = str(ri.id)
            if override_key in item_overrides.get("excluded_items", set()):
                continue

            base_qty = float(active.quantity)
            override_qty = item_overrides.get("quantity_overrides", {}).get(override_key)
            if override_qty is not None:
                base_qty = float(override_qty)

            scale = (portions * item.factor * reserve_factor) / recipe_servings
            scaled_qty = base_qty * scale
            unit = ri.portion.measuring_unit.name if ri.portion.measuring_unit else ""
            note = f" ({ri.note})" if ri.note else ""
            ingredients.append(f"{ri.portion.ingredient.name} — {_format_decimal(scaled_qty, 1)} {unit}{note}")

    return ingredients


def _build_group_member_context(meal_plan: MealPlan) -> list[dict]:
    """Build group member context with nutritional tags, date ranges, age/gender."""
    members = meal_plan.group_members.select_related().prefetch_related("nutritional_tags").all()
    result = []

    for member in members:
        tags = list(member.nutritional_tags.values_list("name", flat=True))
        gender_label = {"male": "männlich", "female": "weiblich", "no_answer": ""}.get(member.gender, "")
        date_range_label = ""
        if member.date_ranges:
            ranges = []
            for dr in member.date_ranges:
                if dr.get("start") and dr.get("end"):
                    ranges.append(f"{dr['start']}–{dr['end']}")
            date_range_label = ", ".join(ranges) if ranges else ""

        result.append(
            {
                "name": member.name or f"Person ({member.age})",
                "age": member.age,
                "gender_label": gender_label,
                "tags": tags,
                "date_range_label": date_range_label,
            }
        )

    return result


def _collect_ingredient_overrides(meal_plan: MealPlan) -> dict:
    """Collect excluded ingredients and override quantities from IngredientOverride."""
    from planner.models import MealItemOverride

    overrides = MealItemOverride.objects.filter(meal_item__meal__meal_plan=meal_plan).select_related(
        "meal_item", "recipe_item"
    )
    result: dict[int, dict] = defaultdict(
        lambda: {"excluded_items": set(), "quantity_overrides": {}, "excluded": False}
    )

    for override in overrides:
        item_id = override.meal_item_id
        if override.excluded:
            result[item_id]["excluded_items"].add(str(override.recipe_item_id))
        if override.quantity_override is not None:
            result[item_id]["quantity_overrides"][str(override.recipe_item_id)] = float(override.quantity_override)

    return dict(result)


def _aggregate_shopping_list(meal_plan: MealPlan) -> dict:
    """Aggregate the shopping list using the domain service.

    Reuses `generate_shopping_list(meal_plan)` which provides verified retail
    section grouping, weight-based unit formatting, natural portion options,
    and portion-option resolution — replacing the former fragile regex parsing.
    """
    from supply.services.shopping_service import generate_shopping_list

    items = generate_shopping_list(meal_plan)

    total_by_section: dict[str, list[dict]] = defaultdict(list)
    total_count = 0
    fresh_count = 0

    for item in items:
        section_name = item.retail_section or "Sonstiges"
        amount = item.natural_portions or item.display_text or item.display_quantity or "0 g"
        total_by_section[section_name].append(
            {
                "name": item.ingredient_name,
                "amount": amount,
                "fresh": section_name in FRESH_SECTION_NAMES,
            }
        )
        total_count += 1
        if section_name in FRESH_SECTION_NAMES:
            fresh_count += 1

    total_sections = [
        {"name": section_name, "items": items_list} for section_name, items_list in sorted(total_by_section.items())
    ]

    return {
        "per_day": None,
        "total": total_sections,
        "total_count": total_count,
        "fresh_count": fresh_count,
    }


def _build_allergen_matrix(meals) -> dict | None:
    """Build allergen cross-table: days as columns, 14 EU allergens as rows."""
    from planner.services.calculation_context import active_recipe_items

    allergen_map = {a.lower(): a for a in EU_ALLERGENS}
    day_labels = []
    day_allergens: list[set] = []

    for day in meals:
        day_labels.append(day["label"])
        day_set: set[str] = set()

        raw_meals = day.get("day_meals_raw") or []
        for meal in raw_meals:
            for item in meal.items.all():
                if item.recipe:
                    # Collect from active recipe items
                    for active in active_recipe_items(item):
                        ri = active.recipe_item
                        if ri.portion and ri.portion.ingredient:
                            for tag in ri.portion.ingredient.nutritional_tags.all():
                                allergen = _get_eu_allergen(tag.name)
                                if allergen:
                                    day_set.add(allergen_map.get(allergen, allergen.title()))
                elif item.ingredient:
                    for tag in item.ingredient.nutritional_tags.all():
                        allergen = _get_eu_allergen(tag.name)
                        if allergen:
                            day_set.add(allergen_map.get(allergen, allergen.title()))

        day_allergens.append(day_set)

    if not day_labels:
        return None

    has_any = False
    rows = []
    for allergen in EU_ALLERGENS:
        day_flags: list = []
        for day_idx in range(len(day_labels)):
            has = allergen.lower() in {a.lower() for a in day_allergens[day_idx]}
            day_flags.append(has)
            if has:
                has_any = True
        rows.append({"allergen": allergen, "days": day_flags})

    return {
        "day_labels": day_labels,
        "rows": rows,
        "has_allergens": has_any,
    }


def _build_nutrition_table(meals, group_members: list[dict]) -> list[dict]:
    """Compute Soll/Ist/Delta for energy, protein, fat, carbs per day."""
    effective_persons = _compute_effective_persons_per_day(meals, group_members)
    result = []

    for day in meals:
        persons = effective_persons.get(day["label"], 1)
        energy_soll = persons * NORM_PERSON_DAILY_KCAL
        protein_soll = persons * NORM_PERSON_DAILY_PROTEIN_G
        fat_soll = persons * NORM_PERSON_DAILY_FAT_G
        carbs_soll = persons * NORM_PERSON_DAILY_CARBS_G

        energy_ist = 0.0
        protein_ist = 0.0
        fat_ist = 0.0
        carbs_ist = 0.0

        from planner.services.cooking_schedule_service import (
            _compute_direct_item_nutrition,
            _compute_item_nutrition,
        )

        for raw_meal in day.get("day_meals_raw") or []:
            portions = raw_meal.effective_portions
            for meal_item in raw_meal.items.all():
                if meal_item.recipe:
                    values = _compute_item_nutrition(None, meal_item, portions)
                elif meal_item.ingredient:
                    values = _compute_direct_item_nutrition(meal_item, portions)
                else:
                    continue
                energy_ist += values["energy_kcal"]
                protein_ist += values["protein_g"]
                fat_ist += values["fat_g"]
                carbs_ist += values["carbohydrate_g"]

        energy_delta = energy_ist - energy_soll
        protein_delta = protein_ist - protein_soll
        fat_delta = fat_ist - fat_soll
        carbs_delta = carbs_ist - carbs_soll

        result.append(
            {
                "label": day["label"],
                "nutrition": {
                    "energy_soll": _format_decimal(energy_soll, 0),
                    "energy_ist": _format_decimal(energy_ist, 0),
                    "energy_delta": int(energy_delta),
                    "protein_soll": _format_decimal(protein_soll, 1),
                    "protein_ist": _format_decimal(protein_ist, 1),
                    "protein_delta": int(protein_delta),
                    "fat_soll": _format_decimal(fat_soll, 1),
                    "fat_ist": _format_decimal(fat_ist, 1),
                    "fat_delta": int(fat_delta),
                    "carbs_soll": _format_decimal(carbs_soll, 1),
                    "carbs_ist": _format_decimal(carbs_ist, 1),
                    "carbs_delta": int(carbs_delta),
                },
            }
        )

    return result


def _compute_effective_persons_per_day(meals, group_members: list[dict]) -> dict[str, int]:
    """Calculate effective number of persons per day based on group member date_ranges."""
    if not group_members:
        return {day["label"]: 1 for day in meals}

    return {day["label"]: len(group_members) for day in meals}


def _build_cooking_timeline(meals) -> list[dict]:
    """Build a cooking timeline per day for recipes with prep time > 60 min."""
    return []


def _get_logo_path() -> str | None:
    """Get the Inspi logo path from settings or None if not found."""
    logo_path = getattr(settings, "INSPI_LOGO_PATH", None)
    if logo_path:
        import os

        if os.path.exists(logo_path):
            return os.path.abspath(cast(str, logo_path))
    return None


def generate_meal_plan_pdf(
    meal_plan: MealPlan,
    include_notes: bool = True,
    exclude_shopping_list: bool = False,
    exclude_nutrition: bool = False,
    exclude_allergens: bool = False,
    compact_mode: bool = False,
    page_format: str = "A4",
) -> bytes:
    """Generate a PDF for a meal plan."""
    days = _build_meal_context(meal_plan)
    group_members = _build_group_member_context(meal_plan)
    shopping_list = _aggregate_shopping_list(meal_plan)
    allergen_matrix = _build_allergen_matrix(days)
    nutrition_data = _build_nutrition_table(days, group_members)
    if not any(day.get("day_meals_raw") and any(meal.items.exists() for meal in day["day_meals_raw"]) for day in days):
        nutrition_data = []

    for i, day in enumerate(days):
        day["timeline"] = []

    schedule_table = []
    total_meals_count = 0
    for day in days:
        for meal in day["meals"]:
            total_meals_count += 1
            portions_val = meal["portions"]
            portions_str = (
                str(int(portions_val)) if float(portions_val).is_integer() else _format_decimal(float(portions_val), 1)
            )
            schedule_table.append(
                {
                    "day_label": day["label"],
                    "day_short": day.get("day_short", day["label"]),
                    "meal_type": meal["meal_type"],
                    "meal_type_label": meal["meal_type_label"],
                    "icon": meal["icon"],
                    "dishes_text": ", ".join(meal["dishes"]) if meal["dishes"] else "—",
                    "cook_start_time": meal["cook_start_time"],
                    "eating_time": meal["eating_time"],
                    "lead_display": meal["lead_display"],
                    "portions": portions_str,
                    "allergens": meal["allergens"],
                }
            )

    eating_schedule = [
        {
            "day_label": day["label"],
            "day_short": day.get("day_short", day["label"]),
            "meals": day["meals"],
        }
        for day in days
    ]

    start_date = meal_plan.start_datetime.date() if meal_plan.start_datetime else None
    end_date = meal_plan.end_datetime.date() if meal_plan.end_datetime else None

    if start_date and end_date:
        date_label = f"{_format_date(start_date)} – {_format_date(end_date)}"
    elif start_date:
        date_label = _format_date(start_date)
    else:
        date_label = ""

    norm_portions_str = (
        str(int(meal_plan.norm_portions))
        if float(meal_plan.norm_portions).is_integer()
        else _format_decimal(float(meal_plan.norm_portions), 1)
    )
    reserve_factor_str = _format_decimal(float(meal_plan.reserve_factor), 2)
    scaling_factor_str = _format_decimal(float(meal_plan.scaling_factor), 2)

    context = {
        "meal_plan": meal_plan,
        "logo_path": _get_logo_path(),
        "date_label": date_label,
        "norm_portions": meal_plan.norm_portions,
        "norm_portions_display": norm_portions_str,
        "reserve_factor": meal_plan.reserve_factor,
        "reserve_factor_display": reserve_factor_str,
        "scaling_factor": meal_plan.scaling_factor,
        "scaling_factor_display": scaling_factor_str,
        "days": days,
        "group_members": group_members,
        "shopping_list": shopping_list,
        "allergen_matrix": allergen_matrix,
        "nutrition_data": nutrition_data,
        "schedule_table": schedule_table,
        "eating_schedule": eating_schedule,
        "total_meals_count": total_meals_count,
        "include_notes": include_notes,
        "exclude_shopping_list": exclude_shopping_list,
        "exclude_nutrition": exclude_nutrition,
        "exclude_allergens": exclude_allergens,
        "compact_mode": compact_mode,
        "page_format": page_format,
    }

    html = render_to_string("planner/meal_plan_pdf.html", context)
    return cast(bytes, HTML(string=html).write_pdf())
