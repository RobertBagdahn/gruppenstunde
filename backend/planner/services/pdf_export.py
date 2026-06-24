"""PDF export service for MealPlans using WeasyPrint."""

from collections import defaultdict

from weasyprint import HTML

from planner.models import Meal, MealPlan

MEAL_TYPE_LABELS = {
    "breakfast": "Frühstück",
    "lunch": "Mittagessen",
    "dinner": "Abendessen",
    "snack": "Snacks",
}


def generate_meal_plan_pdf(meal_plan: MealPlan, include_notes: bool = False) -> bytes:
    """Generate a PDF for a meal plan."""
    meals = (
        Meal.objects.filter(meal_plan=meal_plan)
        .select_related("meal_plan")
        .prefetch_related(
            "items__recipe__recipe_items__portion__ingredient",
            "items__splits__recipe_item__portion__ingredient",
            "items__ingredient",
            "items__measuring_unit",
        )
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


def _render_recipe_item_html(item, effective_portions: int, reserve_factor: float) -> str:
    """Render a recipe MealItem as one or more HTML list items.

    If the item has exchange splits, renders a separate complete ingredient block
    per exchange variant (task 12.1, 12.2). Optional items with share=0 are excluded
    (task 12.3). Items without splits render as a single block (task 12.4).
    """
    from planner.services.split_service import largest_remainder_round

    recipe = item.recipe
    title = item.display_name or recipe.title
    recipe_servings = recipe.portions or 1
    scaling = effective_portions * reserve_factor

    splits = {s.recipe_item_id: s.share for s in item.splits.all()}

    if not splits:
        # Task 12.4: no splits — single block
        return f"<li><strong>{title}</strong></li>"

    # Group recipe items by exchange group or optional
    recipe_items = list(recipe.recipe_items.select_related("portion__ingredient").all())
    exchange_groups: dict[int, list] = {}
    optionals: list = []
    normal: list = []

    for ri in recipe_items:
        if ri.exchange_group_id is not None:
            exchange_groups.setdefault(ri.exchange_group_id, []).append(ri)
        elif ri.is_optional:
            optionals.append(ri)
        else:
            normal.append(ri)

    # Check if any splits actually involve exchange groups
    has_exchange_splits = any(ri.exchange_group_id is not None and ri.id in splits for ri in recipe_items)

    if not has_exchange_splits:
        return f"<li><strong>{title}</strong></li>"

    # Build one block per exchange variant that has portions > 0
    # Determine which exchange members are used
    blocks = []

    # Collect groups that have splits
    for group_id, members in exchange_groups.items():
        members_with_splits = {m.id: splits.get(m.id, 0.0) for m in members}
        if not any(v > 0 for v in members_with_splits.values()):
            continue

        rounded = largest_remainder_round(members_with_splits, effective_portions)

        for member in members:
            member_portions = rounded.get(member.id, 0)
            if member_portions <= 0:
                continue
            member_scaling = member_portions * reserve_factor

            # Build ingredient list for this variant: normal + this member + included optionals
            ing_lines = []
            for ri in normal:
                weight_g = ri.quantity * (ri.portion.weight_g or 0) * scaling / recipe_servings
                if weight_g > 0:
                    name = ri.portion.ingredient.name if ri.portion and ri.portion.ingredient else "?"
                    ing_lines.append(f"{weight_g:.0f}g {name}")

            ri_weight = member.quantity * (member.portion.weight_g or 0) * member_scaling / recipe_servings
            ing_name = member.portion.ingredient.name if member.portion and member.portion.ingredient else "?"
            ing_lines.append(f"{ri_weight:.0f}g {ing_name}")

            for ri in optionals:
                share = splits.get(ri.id, 1.0)  # default: included
                if share > 0:
                    opt_weight = ri.quantity * (ri.portion.weight_g or 0) * member_scaling * share / recipe_servings
                    opt_name = ri.portion.ingredient.name if ri.portion and ri.portion.ingredient else "?"
                    ing_lines.append(f"{opt_weight:.0f}g {opt_name}")

            block_title = f"{title} — {member_portions}× {ing_name}-Variante"
            block_html = f"<li><strong>{block_title}</strong><ul>"
            for line in ing_lines:
                block_html += f"<li>{line}</li>"
            block_html += "</ul></li>"
            blocks.append(block_html)

    return "".join(blocks) if blocks else f"<li><strong>{title}</strong></li>"


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
                if item.recipe:
                    items_html += _render_recipe_item_html(item, portions, meal_plan.reserve_factor)
                else:
                    name = item.display_name or "Direkte Zutat"
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
    <p class="meta">{meal_plan.norm_portions} Portionen · Reservefaktor {meal_plan.reserve_factor}</p>
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
