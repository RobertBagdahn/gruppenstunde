"""Data-completeness checks for planned meals (missing nutrition, lines without ingredient)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from planner.services.calculation_context import active_recipe_items
from supply.services.nutrition_coverage import is_missing_nutrition

if TYPE_CHECKING:
    from planner.models import Meal


def _live_recipe(item):
    recipe = item.recipe
    if recipe is None or recipe.deleted_at is not None:
        return None
    return recipe


def meal_missing_nutrition_names(meal: Meal) -> list[str]:
    """Distinct names of used ingredients without nutrition data (stable order)."""
    names: list[str] = []
    seen: set[int] = set()

    def add(ingredient) -> None:
        if ingredient is None or ingredient.id in seen or not is_missing_nutrition(ingredient):
            return
        seen.add(ingredient.id)
        names.append(ingredient.name)

    for item in meal.items.all():
        if _live_recipe(item):
            for active in active_recipe_items(item):
                recipe_item = active.recipe_item
                portion = recipe_item.portion
                add(portion.ingredient if portion is not None else recipe_item.ingredient)
        else:
            add(item.ingredient)
    return names


def meal_recipe_lines_without_ingredient(meal: Meal) -> list[tuple[int, str]]:
    """``(recipe_id, title)`` of planned recipes that contain lines without any ingredient."""
    result: list[tuple[int, str]] = []
    for item in meal.items.all():
        recipe = _live_recipe(item)
        if recipe is None:
            continue
        for recipe_item in recipe.recipe_items.all():
            if recipe_item.portion_id is None and recipe_item.ingredient_id is None:
                result.append((recipe.id, recipe.title))
                break
    return result
