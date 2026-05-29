"""PDF export service for MealPlans using WeasyPrint."""

import io
from collections import defaultdict

from weasyprint import HTML

from planner.models import MealPlan, Meal


MEAL_TYPE_LABELS = {
    "breakfast": "Frühstück",
    "lunch": "Mittagessen",
    "dinner": "Abendessen",
    "snack": "Snacks",
    "dessert": "Dessert",
}


def generate_meal_plan_pdf(meal_plan: MealPlan, include_notes: bool = False) -> bytes:
    """Generate a PDF for a meal plan."""
    meals = (
        Meal.objects.filter(meal_plan=meal_plan)
        .select_related("meal_plan")
        .prefetch_related("items__recipe", "items__ingredient", "items__measuring_unit")
        .order_by("start_datetime")
    )

    # Group meals by date
    days: dict[str, list[Meal]] = defaultdict(list)
    for meal in meals:
        date_str = meal.start_datetime.strftime("%Y-%m-%d")
        days[date_str].append(meal)

    html_content = _render_html(meal_plan, days, include_notes)
    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes


def _render_html(
    meal_plan: MealPlan,
    days: dict[str, list["Meal"]],
    include_notes: bool,
) -> str:
    """Render the meal plan as HTML for PDF conversion."""
    rows = ""
    for date_str, meals in sorted(days.items()):
        # Format date
        from datetime import datetime
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_label = date_obj.strftime("%A, %d.%m.%Y")

        rows += f'<tr class="day-header"><td colspan="3"><strong>{day_label}</strong></td></tr>'

        for meal in meals:
            meal_label = MEAL_TYPE_LABELS.get(meal.meal_type, meal.meal_type)
            portions = meal.override_portions or meal_plan.norm_portions

            items_html = ""
            for item in meal.items.all():
                name = item.display_name or (
                    item.recipe.title if item.recipe else
                    item.portion.ingredient.name if item.portion and item.portion.ingredient else "?"
                )
                if item.quantity and item.portion and item.portion.measuring_unit:
                    name = f"{item.quantity} {item.portion.measuring_unit.name} {name}"
                items_html += f"<li>{name}</li>"

            note_html = ""
            if include_notes and meal.note and meal.note_is_published:
                note_html = f'<p class="note"><em>{meal.note}</em></p>'

            rows += f"""
            <tr>
                <td>{meal_label}</td>
                <td>{portions} Pers.</td>
                <td><ul>{items_html}</ul>{note_html}</td>
            </tr>
            """

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
    body {{ font-family: 'Source Sans Pro', sans-serif; font-size: 11pt; margin: 2cm; }}
    h1 {{ font-size: 16pt; margin-bottom: 0.5cm; }}
    .meta {{ color: #666; font-size: 9pt; margin-bottom: 1cm; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; text-align: left; }}
    th {{ background: #f5f5f5; font-size: 9pt; text-transform: uppercase; }}
    .day-header td {{ background: #e8f0fe; border-top: 2px solid #4285f4; padding: 8px; }}
    ul {{ margin: 0; padding-left: 1.2em; }}
    li {{ margin: 2px 0; }}
    .note {{ color: #666; font-size: 9pt; margin-top: 4px; }}
</style>
</head>
<body>
    <h1>{meal_plan.name}</h1>
    <p class="meta">{meal_plan.norm_portions} Portionen · Aktivitätsfaktor {meal_plan.activity_factor}</p>
    <table>
        <thead>
            <tr><th>Mahlzeit</th><th>Portionen</th><th>Gerichte</th></tr>
        </thead>
        <tbody>
            {rows}
        </tbody>
    </table>
</body>
</html>"""
