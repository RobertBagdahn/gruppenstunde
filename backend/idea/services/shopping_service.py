"""Shopping list generation service.

Aggregates ingredients from MealPlan → MealDay → Meal → MealItem → Recipe → RecipeItem,
groups by RetailSection, sums quantities, and estimates prices.

Spec reference: openspec/specs/ingredient-database/spec.md, lines 435-447
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealPlan


@dataclass
class ShoppingListItem:
    """A single item in the shopping list."""

    ingredient_id: int
    ingredient_name: str
    total_quantity_g: float
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None


def generate_shopping_list(
    meal_plan: "MealPlan",
    scaling_override: float | None = None,
) -> list[ShoppingListItem]:
    """Generate an aggregated shopping list for a meal plan.

    Collects all MealItems from all Meals from all MealDays of the plan,
    aggregates identical ingredients (summing quantities), groups by
    RetailSection, and estimates prices from the Price model.

    Args:
        meal_plan: The MealPlan to generate a shopping list for
        scaling_override: Optional override for the scaling factor
            (defaults to meal_plan.scaling_factor)

    Returns:
        Sorted list of ShoppingListItem grouped by retail section, then name
    """
    from planner.models import MealItem
    from recipe.models import RecipeItem
    from idea.models import Price

    scaling = scaling_override if scaling_override is not None else meal_plan.scaling_factor

    # Collect all MealItems
    meal_items = MealItem.objects.filter(
        meal__meal_day__meal_plan=meal_plan,
    ).select_related("recipe", "meal")

    # Aggregate: ingredient_id -> ShoppingListItem
    aggregated: dict[int, ShoppingListItem] = {}

    for mi in meal_items:
        recipe_items = RecipeItem.objects.filter(
            recipe=mi.recipe,
        ).select_related("portion__ingredient", "portion__ingredient__retail_section")

        for ri in recipe_items:
            if not ri.portion or not ri.portion.ingredient:
                continue

            ing = ri.portion.ingredient
            weight_g = ri.quantity * (ri.portion.weight_g or 0) * mi.factor * scaling

            if ing.id in aggregated:
                aggregated[ing.id].total_quantity_g += weight_g
            else:
                section_name = ""
                if ing.retail_section:
                    section_name = ing.retail_section.name

                aggregated[ing.id] = ShoppingListItem(
                    ingredient_id=ing.id,
                    ingredient_name=ing.name,
                    total_quantity_g=weight_g,
                    unit="g",
                    retail_section=section_name,
                )

    # Estimate prices from Price model
    for ing_id, item in aggregated.items():
        price = Price.objects.filter(portion__ingredient_id=ing_id).order_by("price_per_kg").first()
        if price and price.price_per_kg:
            item.estimated_price_eur = round(float(price.price_per_kg) * item.total_quantity_g / 1000.0, 2)

    # Sort by retail section, then name
    result = sorted(
        aggregated.values(),
        key=lambda x: (x.retail_section, x.ingredient_name),
    )
    return result


def get_total_estimated_price(items: list[ShoppingListItem]) -> float | None:
    """Calculate total estimated price from a shopping list.

    Returns None if no items have price data.
    """
    total = 0.0
    has_any = False
    for item in items:
        if item.estimated_price_eur is not None:
            total += item.estimated_price_eur
            has_any = True
    return round(total, 2) if has_any else None


def group_by_section(items: list[ShoppingListItem]) -> dict[str, list[ShoppingListItem]]:
    """Group shopping list items by retail section.

    Items without a section are grouped under "" (empty string).
    """
    groups: dict[str, list[ShoppingListItem]] = {}
    for item in items:
        section = item.retail_section or ""
        if section not in groups:
            groups[section] = []
        groups[section].append(item)
    return groups
