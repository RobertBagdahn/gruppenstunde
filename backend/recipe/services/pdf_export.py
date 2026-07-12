"""PDF export service for Recipe using WeasyPrint."""

import os

from django.template.loader import render_to_string
from weasyprint import HTML

from recipe.models import Recipe


def _format_decimal(value: float, digits: int = 1) -> str:
    """Format a decimal number with German locale."""
    try:
        from babel.numbers import format_decimal

        return format_decimal(value, format=f"#,##0.{'0' * digits}", locale="de_DE")
    except ImportError:
        return f"{value:.{digits}f}".replace(".", ",")


def _extract_plain_text(markdown_text: str) -> str:
    """Extract plain text from markdown, stripping markdown syntax."""
    if not markdown_text:
        return ""
    import re

    text = re.sub(r"<[^>]+>", "", markdown_text)
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text.strip()


def _get_allergens(recipe) -> list[str]:
    """Extract allergen names from recipe's nutritional tags."""
    allergens = set()
    for ri in recipe.recipe_items.select_related("portion__ingredient").all():
        if ri.portion and ri.portion.ingredient:
            for tag in ri.portion.ingredient.nutritional_tags.filter(is_dangerous=True):
                allergens.add(tag.name)
    return sorted(allergens)


def _parse_markdown_steps(markdown_text: str) -> list[str]:
    """Parse markdown text into steps (numbered or bullet list items)."""
    if not markdown_text:
        return []
    lines = markdown_text.strip().split("\n")
    steps = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = __import__("re").match(r"^\d+[.)]\s*(.+)$", line)
        if match:
            steps.append(match.group(1).strip())
        elif line.startswith("- ") or line.startswith("* "):
            steps.append(line[2:].strip())
        else:
            steps.append(line)
    return steps


def generate_recipe_pdf(recipe: Recipe, page_format: str = "A4") -> bytes:
    """Generate a PDF for a recipe with ingredients, steps, nutrition, allergens."""
    recipe_items = recipe.recipe_items.select_related(
        "portion__ingredient", "portion__measuring_unit"
    ).order_by("sort_order")

    ingredients = []
    for ri in recipe_items:
        if ri.portion and ri.portion.ingredient:
            qty = float(ri.quantity)
            unit = ri.portion.measuring_unit.name if ri.portion.measuring_unit else ""
            ingredients.append({
                "name": ri.portion.ingredient.name,
                "amount": f"{_format_decimal(qty, 1)} {unit}",
                "note": ri.note or "",
            })

    steps_md = recipe.description or ""
    plain_text = _extract_plain_text(steps_md)
    steps = _parse_markdown_steps(steps_md) if steps_md else []

    description_plain = _extract_plain_text(recipe.summary or "") if recipe.summary else ""

    servings = recipe.portions or 1
    nutrition = {
        "energy_kcal_per100": _format_decimal(recipe.cached_energy_kcal or 0, 0),
        "energy_kcal_per_portion": _format_decimal((recipe.cached_energy_total_kcal or 0) / max(servings, 1), 0),
        "protein_per100": _format_decimal(recipe.cached_protein_g or 0, 1),
        "protein_per_portion": _format_decimal((recipe.cached_protein_g or 0) * servings / 100, 1),
        "fat_per100": _format_decimal(recipe.cached_fat_g or 0, 1),
        "fat_per_portion": _format_decimal((recipe.cached_fat_g or 0) * servings / 100, 1),
        "carbs_per100": _format_decimal(recipe.cached_carbohydrate_g or 0, 1),
        "carbs_per_portion": _format_decimal((recipe.cached_carbohydrate_g or 0) * servings / 100, 1),
        "sugar_per100": _format_decimal(recipe.cached_sugar_g or 0, 1) if recipe.cached_sugar_g else None,
        "sugar_per_portion": _format_decimal((recipe.cached_sugar_g or 0) * servings / 100, 1) if recipe.cached_sugar_g else None,
        "fibre_per100": _format_decimal(recipe.cached_fibre_g or 0, 1) if recipe.cached_fibre_g else None,
        "fibre_per_portion": _format_decimal((recipe.cached_fibre_g or 0) * servings / 100, 1) if recipe.cached_fibre_g else None,
        "salt_per100": _format_decimal(recipe.cached_salt_g or 0, 2) if recipe.cached_salt_g else None,
        "salt_per_portion": _format_decimal((recipe.cached_salt_g or 0) * servings / 100, 2) if recipe.cached_salt_g else None,
    }

    allergens = _get_allergens(recipe)

    image_path = None
    if recipe.image:
        image_path = recipe.image.path if hasattr(recipe.image, "path") else None

    recipe_type_label = dict(Recipe.RecipeTypeChoices.choices).get(recipe.recipe_type, "") if hasattr(Recipe, "RecipeTypeChoices") else ""
    difficulty_label = dict(Recipe.DifficultyChoices.choices).get(recipe.difficulty, "") if hasattr(Recipe, "DifficultyChoices") and recipe.difficulty else ""

    context = {
        "recipe": recipe,
        "image_path": image_path,
        "portions": servings,
        "ingredients": ingredients,
        "steps": steps,
        "description_plain": description_plain,
        "nutrition": nutrition,
        "allergens": allergens,
        "recipe_type_label": recipe_type_label,
        "difficulty_label": difficulty_label,
        "preparation_time_min": recipe.preparation_time_min if hasattr(recipe, "preparation_time_min") else None,
    }

    html = render_to_string("recipe/recipe_pdf.html", context)
    pdf_bytes = HTML(string=html).write_pdf()

    return pdf_bytes
