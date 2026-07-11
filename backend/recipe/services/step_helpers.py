"""Helper functions for recipe step placeholder resolution and description generation."""

import logging
import re
from typing import Optional

from recipe.models import RecipeStep, RecipeItem, Recipe

logger = logging.getLogger(__name__)


def resolve_placeholders(step: RecipeStep, recipe_items_map: Optional[dict] = None) -> str:
    """Resolve placeholders in a step's instruction text.

    Supports two placeholder syntaxes:
    - {recipe_item_id}: numeric ID (e.g., {42})
    - {ingredient_name}: ingredient name (e.g., {Mehl})

    Args:
        step: The RecipeStep to resolve
        recipe_items_map: Optional dict of {id: RecipeItem} for caching

    Returns:
        Step instruction with all placeholders resolved to quantities + names

    Example:
        instruction = "Mischen Sie {Mehl} mit {Zucker}"
        resolved = resolve_placeholders(step, ...)
        => "Mischen Sie 500g Mehl mit 200g Zucker"
    """
    if recipe_items_map is None:
        # Load all recipe items for this step's recipe
        recipe_items_map = {}
        for recipe_item in step.recipe.recipe_items.select_related(
            "portion__ingredient",
            "portion__measuring_unit"
        ):
            recipe_items_map[recipe_item.id] = recipe_item

    instruction = step.instruction

    # Pattern for numeric placeholders: {123}
    numeric_pattern = r'\{(\d+)\}'
    
    def replace_numeric(match):
        item_id = int(match.group(1))
        if item_id in recipe_items_map:
            item = recipe_items_map[item_id]
            return _format_quantity(item)
        return match.group(0)  # Leave unresolved if not found

    instruction = re.sub(numeric_pattern, replace_numeric, instruction)

    # Pattern for name placeholders: {Name} or {Some Name}
    # Match text in braces that's not all digits
    name_pattern = r'\{([^}]+)\}'
    
    def replace_name(match):
        name = match.group(1)
        # Skip if it looks like it was already resolved (contains units/quantities)
        if any(char in name for char in ['g', 'ml', 'l', 'x', 'Stück', 'EL', 'TL']):
            return match.group(0)
        # Find matching recipe item by name
        for item in recipe_items_map.values():
            if item.portion.ingredient.name.lower() == name.lower():
                return _format_quantity(item)
        return match.group(0)  # Leave unresolved if not found

    instruction = re.sub(name_pattern, replace_name, instruction)

    return instruction


def _format_quantity(recipe_item: RecipeItem) -> str:
    """Format a RecipeItem as 'quantity unit ingredient_name'.

    Example: "500g Mehl" or "2 Tassen Zucker"
    """
    quantity = recipe_item.quantity
    unit = recipe_item.portion.measuring_unit
    ingredient = recipe_item.portion.ingredient
    note = recipe_item.note

    # Format quantity
    if quantity == int(quantity):
        qty_str = str(int(quantity))
    else:
        qty_str = f"{quantity:.1f}".rstrip('0').rstrip('.')

    # Format unit
    unit_str = unit.short if unit else ""

    # Combine
    result = f"{qty_str}{unit_str} {ingredient.name}"

    # Add note if present
    if note:
        result += f", {note}"

    return result


def generate_description_from_steps(recipe: Recipe) -> str:
    """Generate a markdown description from a recipe's structured steps.

    This is used as fallback/SEO content when structured steps exist.

    Args:
        recipe: The Recipe object (should have steps populated)

    Returns:
        Markdown-formatted description

    Example output:
        ## Zubereitung
        
        1. Mischen Sie 500g Mehl mit 200g Zucker (5 Minuten)
        2. Backen Sie alles im Ofen (30 Minuten)
    """
    steps = recipe.steps.all().prefetch_related(
        'step_ingredients__recipe_item__portion__ingredient',
        'step_ingredients__recipe_item__portion__measuring_unit'
    ).order_by('sort_order')

    if not steps.exists():
        return ""

    # Build recipe items map for placeholder resolution
    recipe_items_map = {}
    for recipe_item in recipe.recipe_items.select_related(
        "portion__ingredient",
        "portion__measuring_unit"
    ):
        recipe_items_map[recipe_item.id] = recipe_item

    lines = ["## Zubereitung\n"]

    current_section = None
    step_number = 1

    for step in steps:
        # Add section header if new section
        if step.section and step.section != current_section:
            current_section = step.section
            lines.append(f"\n### {current_section}\n")
            step_number = 1

        # Resolve placeholders in instruction
        resolved_instruction = resolve_placeholders(step, recipe_items_map)

        # Format step line
        step_line = f"{step_number}. {resolved_instruction}"

        # Add duration if present
        if step.duration_minutes:
            step_line += f" ({step.duration_minutes} Minuten)"

        lines.append(step_line)
        step_number += 1

    return "\n".join(lines)


def batch_resolve_placeholders(recipe: Recipe) -> dict:
    """Resolve placeholders for all steps of a recipe in one batch.

    Returns a dict mapping step_id -> resolved_instruction.
    This is more efficient than calling resolve_placeholders() multiple times.
    """
    steps = recipe.steps.all().order_by('sort_order')
    if not steps.exists():
        return {}

    # Load all recipe items once
    recipe_items_map = {}
    for recipe_item in recipe.recipe_items.select_related(
        "portion__ingredient",
        "portion__measuring_unit"
    ):
        recipe_items_map[recipe_item.id] = recipe_item

    # Resolve all steps
    result = {}
    for step in steps:
        result[step.id] = resolve_placeholders(step, recipe_items_map)

    return result
