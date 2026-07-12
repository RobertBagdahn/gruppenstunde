"""PDF export service for MealPlans using WeasyPrint."""

from collections import defaultdict
from datetime import date, datetime

from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML

from planner.models import Meal, MealItem, MealPlan, MealPlanGroupMember
from recipe.models import RecipeItem
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
    "breakfast": "☀️",
    "lunch": "🍽️",
    "dinner": "🌙",
    "snack": "🍎",
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
            "items__recipe__recipe_items__portion__measuring_unit",
            "items__recipe__nutritional_tags",
            "items__ingredient__retail_section",
            "items__ingredient__nutritional_tags",
            "items__measuring_unit",
            "items__overrides__recipe_item__portion__ingredient",
        )
        .order_by("start_datetime")
    )

    overrides = _collect_ingredient_overrides(meal_plan)

    days: dict[str, list[Meal]] = defaultdict(list)
    for meal in meals:
        if meal.start_datetime:
            date_str = meal.start_datetime.strftime("%Y-%m-%d")
        else:
            date_str = "unbekannt"
        days[date_str].append(meal)

    result = []
    for date_str, day_meals in sorted(days.items()):
        try:
            day_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            day_label = f"{_get_weekday(day_date)}, {day_date.strftime('%d.%m.%Y')}"
        except ValueError:
            day_label = date_str

        meal_data = []
        for meal in day_meals:
            portions = meal.effective_portions
            time_label = meal.start_datetime.strftime("%H:%M") if meal.start_datetime else ""
            meal_type_label = MEAL_TYPE_LABELS.get(meal.meal_type, meal.meal_type)
            icon = MEAL_TYPE_ICONS.get(meal.meal_type, "•")

            items = list(meal.items.all())
            items_by_variant: dict[str, list[MealItem]] = defaultdict(list)
            for item in items:
                if item.variant_group_id:
                    items_by_variant[str(item.variant_group_id)].append(item)
                else:
                    items_by_variant[f"single_{item.id}"].append(item)

            if len(items_by_variant) > 1 or any(len(v) > 1 for v in items_by_variant.values()):
                sub_meals = []
                for variant_id, variant_items in sorted(items_by_variant.items()):
                    for item in variant_items:
                        sub_meals.append(_build_sub_meal(item, portions, meal_plan.reserve_factor, overrides))
                meal_data.append({
                    "meal_type_label": meal_type_label,
                    "icon": icon,
                    "time_label": time_label,
                    "sub_meals": sub_meals,
                    "items": [],
                    "note": meal.note if (meal.note and meal.note_is_published) else "",
                })
            else:
                items_data = []
                for item in items:
                    items_data.append(_build_item_data(item, portions, meal_plan.reserve_factor, overrides))
                meal_data.append({
                    "meal_type_label": meal_type_label,
                    "icon": icon,
                    "time_label": time_label,
                    "sub_meals": [],
                    "items": items_data,
                    "note": meal.note if (meal.note and meal.note_is_published) else "",
                })

        result.append({"label": day_label, "meals": meal_data})

    return result


def _build_sub_meal(item: MealItem, portions: int, reserve_factor: float, overrides: dict) -> dict:
    """Build a sub-meal block for exchange-split variants."""
    recipe_name = item.display_name or (item.recipe.title if item.recipe else (item.ingredient.name if item.ingredient else "?"))
    portions_display = _format_decimal(portions * item.factor, 0) if item.factor != 1.0 else str(portions)

    if item.recipe:
        ingredients = _get_recipe_ingredients(item.recipe, portions, reserve_factor, overrides.get(item.id, {}))
    elif item.ingredient:
        quantity_display = f"{_format_decimal(float(item.quantity or 0), 1)} {item.measuring_unit.name if item.measuring_unit else ''}"
        ingredients = [f"{item.ingredient.name} — {quantity_display}"]
    else:
        ingredients = []

    return {
        "recipe_name": recipe_name,
        "portions_display": portions_display,
        "ingredients": ingredients,
    }


def _build_item_data(item: MealItem, portions: int, reserve_factor: float, overrides: dict) -> dict:
    """Build item data for a single (non-exchange-split) meal item."""
    recipe_name = item.display_name or (item.recipe.title if item.recipe else (item.ingredient.name if item.ingredient else "?"))
    portions_label = f"{_format_decimal(portions * item.factor, 0)} Pers." if item.factor != 1.0 else None
    item_overrides = overrides.get(item.id, {})

    excluded = item_overrides.get("excluded", False)
    if item.recipe:
        ingredients = _get_recipe_ingredients(item.recipe, portions, reserve_factor, item_overrides)
    elif item.ingredient:
        quantity_display = f"{_format_decimal(float(item.quantity or 0), 1)} {item.measuring_unit.name if item.measuring_unit else ''}"
        ingredients = [f"{item.ingredient.name} — {quantity_display}"]
    else:
        ingredients = []

    return {
        "recipe_name": recipe_name,
        "portions_label": portions_label,
        "ingredients": ingredients,
        "excluded": excluded,
    }


def _get_recipe_ingredients(recipe, portions: int, reserve_factor: float, item_overrides: dict) -> list[str]:
    """Get formatted ingredient strings for a recipe, scaled to effective portions."""
    recipe_items = recipe.recipe_items.select_related("portion__ingredient", "portion__measuring_unit").all()
    ingredients = []

    for ri in recipe_items:
        if ri.portion and ri.portion.ingredient:
            override_key = str(ri.id)
            if override_key in item_overrides.get("excluded_items", set()):
                continue

            base_qty = float(ri.quantity)
            override_qty = item_overrides.get("quantity_overrides", {}).get(override_key)
            if override_qty is not None:
                base_qty = float(override_qty)

            scale = portions * reserve_factor / max(recipe.portions or 1, 1)
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

        result.append({
            "name": member.name or f"Person ({member.age})",
            "age": member.age,
            "gender_label": gender_label,
            "tags": tags,
            "date_range_label": date_range_label,
        })

    return result


def _collect_ingredient_overrides(meal_plan: MealPlan) -> dict:
    """Collect excluded ingredients and override quantities from IngredientOverride."""
    from planner.models import MealItemOverride

    overrides = MealItemOverride.objects.filter(meal_item__meal__meal_plan=meal_plan).select_related(
        "meal_item", "recipe_item"
    )
    result: dict[int, dict] = defaultdict(lambda: {"excluded_items": set(), "quantity_overrides": {}, "excluded": False})

    for override in overrides:
        item_id = override.meal_item_id
        if override.excluded:
            result[item_id]["excluded_items"].add(str(override.recipe_item_id))
        if override.quantity_override is not None:
            result[item_id]["quantity_overrides"][str(override.recipe_item_id)] = float(override.quantity_override)

    return dict(result)


def _aggregate_shopping_list(meals) -> dict:
    """Aggregate ingredients summed by day and total, grouped by RetailSection."""
    from collections import defaultdict as dd

    per_day_list = []
    total_by_section: dict[str, dict[str, dict]] = dd(lambda: dd(lambda: {"total": 0.0, "unit": "", "fresh": False}))

    for day in meals:
        day_sections: dict[str, dict[str, dict]] = dd(lambda: dd(lambda: {"total": 0.0, "unit": "", "fresh": False}))

        for meal in day.get("meals", []):
            all_items = []
            if meal.get("sub_meals"):
                for sub in meal["sub_meals"]:
                    all_items.extend(sub.get("ingredients", []))
            else:
                for item in meal.get("items", []):
                    all_items.extend(item.get("ingredients", []))

            for ing_str in all_items:
                _parse_and_accumulate_ingredient(ing_str, day_sections, total_by_section)

        day_entry = {"label": day["label"], "sections": []}
        for section_name in sorted(day_sections.keys()):
            items = []
            for ing_name in sorted(day_sections[section_name].keys()):
                data = day_sections[section_name][ing_name]
                items.append({
                    "name": ing_name,
                    "amount": f"{_format_decimal(data['total'], 1)} {data['unit']}",
                    "fresh": data["fresh"],
                })
            day_entry["sections"].append({"name": section_name, "items": items})
        per_day_list.append(day_entry)

    total_sections = []
    total_count = 0
    fresh_count = 0
    for section_name in sorted(total_by_section.keys()):
        items = []
        for ing_name in sorted(total_by_section[section_name].keys()):
            data = total_by_section[section_name][ing_name]
            items.append({
                "name": ing_name,
                "amount": f"{_format_decimal(data['total'], 1)} {data['unit']}",
                "fresh": data["fresh"],
            })
            total_count += 1
            if data["fresh"]:
                fresh_count += 1
        total_sections.append({"name": section_name, "items": items})

    return {
        "per_day": per_day_list if per_day_list else None,
        "total": total_sections,
        "total_count": total_count,
        "fresh_count": fresh_count,
    }


def _parse_and_accumulate_ingredient(ing_str: str, day_sections: dict, total_by_section: dict) -> None:
    """Parse an ingredient string and accumulate to day and total sections."""
    parts = ing_str.split(" — ")
    if len(parts) < 2:
        return
    ing_name = parts[0].strip()
    amount_str = parts[1].split(" (")[0].strip()

    try:
        qty_str = amount_str.replace(",", ".").split(" ")[0]
        qty = float(qty_str)
    except (ValueError, IndexError):
        qty = 0.0

    unit = " ".join(amount_str.split(" ")[1:]) if " " in amount_str else ""

    section_name = "Sonstiges"
    fresh = False

    day_sections[section_name][ing_name]["total"] += qty
    day_sections[section_name][ing_name]["unit"] = unit
    day_sections[section_name][ing_name]["fresh"] = fresh

    total_by_section[section_name][ing_name]["total"] += qty
    total_by_section[section_name][ing_name]["unit"] = unit
    total_by_section[section_name][ing_name]["fresh"] = fresh


def _build_allergen_matrix(meals) -> dict | None:
    """Build allergen cross-table: days as columns, 14 EU allergens as rows."""
    allergen_map = {a.lower(): a for a in EU_ALLERGENS}
    day_labels = []
    day_allergens: list[set] = []

    for day in meals:
        day_labels.append(day["label"])
        day_set: set[str] = set()
        day_allergens.append(day_set)

    if not day_labels:
        return None

    has_any = False
    rows = []
    for allergen in EU_ALLERGENS:
        row = {"allergen": allergen, "days": []}
        for day_idx in range(len(day_labels)):
            has = allergen.lower() in {a.lower() for a in day_allergens[day_idx]}
            row["days"].append(has)
            if has:
                has_any = True
        rows.append(row)

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

        energy_delta = energy_ist - energy_soll
        protein_delta = protein_ist - protein_soll
        fat_delta = fat_ist - fat_soll
        carbs_delta = carbs_ist - carbs_soll

        result.append({
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
        })

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
            return os.path.abspath(logo_path)
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
    shopping_list = _aggregate_shopping_list(days)
    allergen_matrix = _build_allergen_matrix(days)
    nutrition_data = _build_nutrition_table(days, group_members)

    for i, day in enumerate(days):
        day["timeline"] = []

    start_date = meal_plan.start_datetime.date() if meal_plan.start_datetime else None
    end_date = meal_plan.end_datetime.date() if meal_plan.end_datetime else None

    if start_date and end_date:
        date_label = f"{_format_date(start_date)} – {_format_date(end_date)}"
    elif start_date:
        date_label = _format_date(start_date)
    else:
        date_label = ""

    context = {
        "meal_plan": meal_plan,
        "logo_path": _get_logo_path(),
        "date_label": date_label,
        "norm_portions": meal_plan.norm_portions,
        "reserve_factor": meal_plan.reserve_factor,
        "scaling_factor": meal_plan.scaling_factor,
        "days": days,
        "group_members": group_members,
        "shopping_list": shopping_list,
        "allergen_matrix": allergen_matrix,
        "include_notes": include_notes,
        "exclude_shopping_list": exclude_shopping_list,
        "exclude_nutrition": exclude_nutrition,
        "exclude_allergens": exclude_allergens,
        "compact_mode": compact_mode,
    }

    html = render_to_string("planner/meal_plan_pdf.html", context)
    pdf_bytes = HTML(string=html).write_pdf()

    return pdf_bytes
