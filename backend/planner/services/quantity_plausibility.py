"""Plausibility warnings for per-person quantities of meal items.

``MealItem.quantity`` is always per person; downstream code multiplies it by
the meal's portions. A unit mix-up (e.g. group totals saved as "Stück") shows
up as an absurd per-person amount. Warnings never block saving.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import asdict, dataclass
from typing import Any

from planner.services.meal_item_helpers import (
    GRAM_UNIT_NAMES,
    MILLILITER_UNIT_NAMES,
    _resolve_ingredient_weight_g,
)
from supply.services.portion_resolution import is_piece_like_name

MAX_GRAMS_PER_PERSON = 1500
MAX_PIECES_PER_PERSON = 50


@dataclass
class QuantityWarning:
    meal_item_id: int | None
    meal_id: int | None
    ingredient_name: str
    per_person_value: float
    per_person_unit: str
    total_value: float
    total_unit: str
    message: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _format_number(value: float) -> str:
    rounded = round(value, 1)
    if rounded == int(rounded):
        return str(int(rounded))
    return f"{rounded:.1f}".replace(".", ",")


def _piece_count(item: Any) -> float | None:
    """Per-person piece count if the item's unit is a piece-like portion."""
    unit = item.measuring_unit
    if unit is None or unit.name.lower() in GRAM_UNIT_NAMES + MILLILITER_UNIT_NAMES:
        return None
    if is_piece_like_name(unit.name):
        return float(item.quantity)
    portion = item.ingredient.portions.active().filter(measuring_unit=unit).first()
    if portion is not None and is_piece_like_name(portion.name):
        return float(item.quantity)
    return None


def check_item(item: Any, portions: float) -> QuantityWarning | None:
    """Return a warning when an ingredient item's per-person amount is implausible."""
    if item.ingredient_id is None or not item.quantity or item.measuring_unit is None:
        return None
    portions = max(float(portions or 1), 1.0)
    name = item.display_name or item.ingredient.name

    pieces = _piece_count(item)
    if pieces is not None:
        if pieces <= MAX_PIECES_PER_PERSON:
            return None
        total = pieces * portions
        return QuantityWarning(
            meal_item_id=item.id,
            meal_id=item.meal_id,
            ingredient_name=name,
            per_person_value=pieces,
            per_person_unit="Stück",
            total_value=total,
            total_unit="Stück",
            message=(
                f"{name}: {_format_number(pieces)} Stück pro Person ({_format_number(total)} insgesamt) – "
                "bitte Menge und Einheit prüfen."
            ),
        )

    grams = _resolve_ingredient_weight_g(item)
    if grams <= MAX_GRAMS_PER_PERSON:
        return None
    total_kg = grams * portions / 1000
    return QuantityWarning(
        meal_item_id=item.id,
        meal_id=item.meal_id,
        ingredient_name=name,
        per_person_value=grams,
        per_person_unit="g",
        total_value=total_kg,
        total_unit="kg",
        message=(
            f"{name}: {_format_number(grams)} g pro Person ({_format_number(total_kg)} kg insgesamt) – "
            "bitte Menge und Einheit prüfen."
        ),
    )


def check_recipe_item(item: Any, portions: float) -> list[QuantityWarning]:
    """Warnings for recipe ingredients whose per-person amount is implausible.

    Recipe amounts are scaled by ``portions / recipe.portions``; a wrong recipe
    amount or portion weight shows up as an absurd per-person quantity.
    """
    from planner.services.calculation_context import active_recipe_items

    recipe = item.recipe
    if recipe is None or not recipe.portions:
        return []
    portions = max(float(portions or 1), 1.0)
    warnings = []
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

    for active in active_recipe_items(item):
        ingredient = get_recipe_item_ingredient(active.recipe_item)
        if ingredient is None or not active.weight_g:
            continue
        grams = active.weight_g * item.factor / recipe.portions
        if grams <= MAX_GRAMS_PER_PERSON:
            continue
        total_kg = grams * portions / 1000
        warnings.append(
            QuantityWarning(
                meal_item_id=item.id,
                meal_id=item.meal_id,
                ingredient_name=ingredient.name,
                per_person_value=grams,
                per_person_unit="g",
                total_value=total_kg,
                total_unit="kg",
                message=(
                    f"{ingredient.name} in „{recipe.title}“: {_format_number(grams)} g pro Person "
                    f"({_format_number(total_kg)} kg insgesamt) – bitte Rezeptmenge prüfen."
                ),
            )
        )
    return warnings


def check(items: Iterable[Any], portions: float) -> list[QuantityWarning]:
    """Warnings for all implausible ingredient items of one meal."""
    warnings = []
    for item in items:
        warning = check_item(item, portions)
        if warning is not None:
            warnings.append(warning)
    return warnings


def check_meals(meals: Iterable[Any]) -> list[QuantityWarning]:
    """Warnings across several meals, each scaled by its effective portions."""
    warnings: list[QuantityWarning] = []
    for meal in meals:
        items = meal.items.filter(ingredient__isnull=False).select_related("ingredient", "measuring_unit")
        warnings.extend(check(items, meal.effective_portions))
        recipe_items = meal.items.filter(recipe__isnull=False).select_related("recipe")
        for recipe_item in recipe_items:
            warnings.extend(check_recipe_item(recipe_item, meal.effective_portions))
    return warnings
