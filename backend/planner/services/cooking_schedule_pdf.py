"""PDF export service for Cooking Schedule using WeasyPrint."""

import os

from django.template.loader import render_to_string
from weasyprint import HTML

from planner.models import Meal, MealPlan


MEAL_TYPE_LABELS = {
    "breakfast": "Frühstück",
    "lunch": "Mittagessen",
    "dinner": "Abendessen",
    "snack": "Snacks",
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
}


def _format_date(d):
    """Format a date in German locale."""
    try:
        from babel.dates import format_date

        return format_date(d, format="full", locale="de_DE")
    except ImportError:
        return d.strftime("%A, %d.%m.%Y")


def _format_decimal(value: float, digits: int = 1) -> str:
    """Format a decimal number with German locale."""
    try:
        from babel.numbers import format_decimal

        return format_decimal(value, format=f"#,##0.{'0' * digits}", locale="de_DE")
    except ImportError:
        return f"{value:.{digits}f}".replace(".", ",")


def _format_currency(value: float) -> str:
    """Format a currency value with German locale."""
    try:
        from babel.numbers import format_currency

        return format_currency(value, "EUR", locale="de_DE")
    except ImportError:
        return f"{value:.2f} €".replace(".", ",")


def _get_allergen_css_class(allergen_name: str) -> str:
    """Map allergen name to CSS class for badge coloring."""
    name_lower = allergen_name.lower()
    for key, css_class in ALLERGEN_COLORS.items():
        if key in name_lower:
            return css_class
    return "default"


def _extract_recipe_steps(recipe) -> list[str]:
    """Extract preparation steps from recipe description (markdown)."""
    if not recipe.description:
        return []
    import re

    lines = recipe.description.strip().split("\n")
    steps = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = re.match(r"^\d+[.)]\s*(.+)$", line)
        if match:
            steps.append(match.group(1).strip())
        elif line.startswith("- ") or line.startswith("* "):
            steps.append(line[2:].strip())
        else:
            steps.append(line)
    return steps


def _get_recipe_allergens(recipe) -> list[dict]:
    """Get distinct dangerous allergen tags from recipe's ingredients."""
    allergens = {}
    for ri in recipe.recipe_items.select_related("portion__ingredient").all():
        if ri.portion and ri.portion.ingredient:
            for tag in ri.portion.ingredient.nutritional_tags.filter(is_dangerous=True):
                if tag.name not in allergens:
                    allergens[tag.name] = {
                        "name": tag.name,
                        "css_class": _get_allergen_css_class(tag.name),
                    }
    return list(allergens.values())


def _get_logo_path() -> str | None:
    """Get the Inspi logo path."""
    from django.conf import settings

    logo_path = getattr(settings, "INSPI_LOGO_PATH", None)
    if logo_path and os.path.exists(logo_path):
        return os.path.abspath(logo_path)
    return None


def generate_cooking_schedule_pdf(meal_plan: MealPlan, page_format: str = "A4") -> bytes:
    """Generate a PDF for the cooking schedule (Kochplan)."""
    meals = (
        Meal.objects.filter(meal_plan=meal_plan, is_reference=False)
        .select_related("meal_plan")
        .prefetch_related(
            "items__recipe__recipe_items__portion__ingredient__nutritional_tags",
            "items__recipe__recipe_items__portion__measuring_unit",
            "items__recipe__nutritional_tags",
        )
        .order_by("start_datetime")
    )

    from collections import defaultdict

    days_map: dict[str, list] = defaultdict(list)
    for meal in meals:
        if meal.start_datetime:
            date_str = meal.start_datetime.strftime("%Y-%m-%d")
        else:
            date_str = "unbekannt"
        days_map[date_str].append(meal)

    days = []
    day_labels = []
    total_cost = 0.0
    total_energy = 0.0

    for date_str, day_meals in sorted(days_map.items()):
        from datetime import datetime

        try:
            day_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            day_label = _format_date(day_date)
        except ValueError:
            day_label = date_str
        day_labels.append(day_label)

        portions = day_meals[0].effective_portions if day_meals else meal_plan.norm_portions
        time_range = ""
        if day_meals:
            start_times = [m.start_datetime for m in day_meals if m.start_datetime]
            if start_times:
                time_range = f"{min(start_times).strftime('%H:%M')} – {max(start_times).strftime('%H:%M')}"

        day_cost = 0.0
        recipes = []

        for meal in day_meals:
            meal_type_label = MEAL_TYPE_LABELS.get(meal.meal_type, meal.meal_type)
            start_time = meal.start_datetime.strftime("%H:%M") if meal.start_datetime else ""

            for item in meal.items.all():
                if not item.recipe:
                    continue

                recipe = item.recipe
                item_portions = meal.effective_portions
                recipe_cost = (recipe.cached_price_total or 0) * item_portions / max(recipe.portions or 1, 1)
                day_cost += recipe_cost
                recipe_energy = (recipe.cached_energy_total_kcal or 0) * item_portions / max(recipe.portions or 1, 1)

                ingredients = []
                for ri in recipe.recipe_items.select_related("portion__ingredient", "portion__measuring_unit").all():
                    if ri.portion and ri.portion.ingredient:
                        scale = item_portions * meal_plan.reserve_factor / max(recipe.portions or 1, 1)
                        qty = float(ri.quantity) * scale
                        unit = ri.portion.measuring_unit.name if ri.portion.measuring_unit else ""
                        ingredients.append({
                            "name": ri.portion.ingredient.name,
                            "amount": f"{_format_decimal(qty, 1)} {unit}",
                            "optional": ri.is_optional if hasattr(ri, "is_optional") else False,
                        })

                steps = _extract_recipe_steps(recipe)
                allergens = _get_recipe_allergens(recipe)
                recipe_name = item.display_name or recipe.title

                recipes.append({
                    "recipe_name": recipe_name,
                    "meal_type_label": meal_type_label,
                    "portions_display": f"{item_portions} Pers.",
                    "start_time": start_time,
                    "serving_time": "",
                    "cost": _format_currency(recipe_cost),
                    "ingredients": ingredients,
                    "steps": steps,
                    "allergens": allergens,
                    "note": meal.note if (meal.note and meal.note_is_published) else "",
                })

        day_cost_total = day_cost * meal_plan.reserve_factor
        total_cost += day_cost_total
        total_energy += recipe_energy

        days.append({
            "label": day_label,
            "portions": portions,
            "time_range": time_range,
            "day_cost": _format_currency(day_cost_total),
            "recipes": recipes,
        })

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
        "total_cost": _format_currency(total_cost),
        "total_energy": _format_decimal(total_energy, 0),
        "day_count": len(days),
        "day_labels": day_labels,
        "days": days,
    }

    html = render_to_string("planner/cooking_schedule_pdf.html", context)
    pdf_bytes = HTML(string=html).write_pdf()

    return pdf_bytes
