"""Shopping list generation service.

Aggregates ingredients from MealEvent -> Meal -> MealItem -> Recipe -> RecipeItem,
groups by RetailSection, sums quantities, and estimates prices.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealEvent


@dataclass
class ShoppingListItem:
    """A single item in the shopping list."""

    ingredient_id: int
    ingredient_name: str
    total_quantity_g: float
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
    display_quantity: str = ""
    natural_portions: str = ""


def generate_shopping_list(
    meal_event: "MealEvent",
    scaling_override: float | None = None,
) -> list[ShoppingListItem]:
    """Generate an aggregated shopping list for a meal event.

    Collects all MealItems from all Meals of the event,
    aggregates identical ingredients (summing quantities), groups by
    RetailSection, and estimates prices from Ingredient.price_per_kg.

    Args:
        meal_event: The MealEvent to generate a shopping list for
        scaling_override: Optional override for the scaling factor
            (defaults to meal_event.scaling_factor)

    Returns:
        Sorted list of ShoppingListItem grouped by retail section, then name
    """
    from planner.models import MealItem
    from recipe.models import RecipeItem
    from supply.services.price_service import get_portion_price

    scaling = scaling_override if scaling_override is not None else meal_event.scaling_factor

    # Collect all MealItems
    meal_items = MealItem.objects.filter(
        meal__meal_event=meal_event,
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

    # Estimate prices from Ingredient.price_per_kg
    for ing_id, item in aggregated.items():
        from supply.models import Ingredient

        try:
            ing = Ingredient.objects.get(id=ing_id)
            price = get_portion_price(ing, item.total_quantity_g)
            if price is not None:
                item.estimated_price_eur = float(price)
        except Ingredient.DoesNotExist:
            pass

    # Add display_quantity and natural_portions
    _enrich_display_fields(aggregated)

    # Sort by retail section, then name
    result = sorted(
        aggregated.values(),
        key=lambda x: (x.retail_section, x.ingredient_name),
    )
    return result


def _format_weight(weight_g: float) -> str:
    """Format weight with smart unit conversion (g->kg) and rounding."""
    if weight_g >= 1000:
        kg = weight_g / 1000
        if kg == int(kg):
            return f"{int(kg)} kg"
        return f"{kg:.1f} kg"
    if weight_g >= 100:
        rounded = round(weight_g / 10) * 10
        return f"{int(rounded)} g"
    if weight_g >= 10:
        rounded = round(weight_g / 5) * 5
        return f"{int(rounded)} g"
    if weight_g >= 1:
        return f"{round(weight_g)} g"
    return f"{weight_g:.1f} g"


def _enrich_display_fields(aggregated: dict[int, ShoppingListItem]) -> None:
    """Add display_quantity and natural_portions to shopping list items."""
    from supply.models import Ingredient
    from supply.models.ingredient import Portion

    ingredient_ids = list(aggregated.keys())
    ingredients = {ing.id: ing for ing in Ingredient.objects.filter(id__in=ingredient_ids).prefetch_related("portions")}

    for ing_id, item in aggregated.items():
        ing = ingredients.get(ing_id)
        if not ing:
            item.display_quantity = _format_weight(item.total_quantity_g)
            continue

        # Display quantity with smart unit conversion
        item.display_quantity = _format_weight(item.total_quantity_g)

        # Natural portions — find the default/highest priority portion
        portions = list(ing.portions.order_by("-priority", "rank", "name"))
        if portions:
            default_portion = next((p for p in portions if p.is_default), portions[0])
            if default_portion.weight_g and default_portion.weight_g > 0:
                count = item.total_quantity_g / default_portion.weight_g
                if count >= 0.5:
                    count_display = round(count, 1)
                    if count_display == int(count_display):
                        count_display = int(count_display)
                    item.natural_portions = f"ca. {count_display} x {default_portion.name}"


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
