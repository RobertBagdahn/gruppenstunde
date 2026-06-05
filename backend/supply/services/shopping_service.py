"""Shopping list generation service.

Aggregates ingredients from MealPlan -> Meal -> MealItem -> Recipe -> RecipeItem,
groups by RetailSection, sums quantities, and estimates prices.

Quantities scale with ``meal_plan.scaling_factor`` (= norm_portions * reserve_factor).
The PAL/activity factor is intentionally NOT applied to physical purchase quantities;
it belongs to the norm-portion calorie calculation only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealPlan


@dataclass
class ShoppingItemSource:
    """Tracks where a portion of an ingredient came from."""

    recipe_id: int
    recipe_name: str
    recipe_slug: str
    meal_label: str
    quantity_g: float


@dataclass
class ShoppingListItem:
    """A single item in the shopping list."""

    ingredient_id: int
    ingredient_name: str
    ingredient_slug: str = ""
    total_quantity_g: float = 0.0
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
    display_quantity: str = ""
    natural_portions: str = ""
    portion_options: list[dict] | None = None
    display_text: str = ""
    sources: list[ShoppingItemSource] | None = None


def generate_shopping_list(
    meal_plan: "MealPlan",
    scaling_override: float | None = None,
) -> list[ShoppingListItem]:
    """Generate an aggregated shopping list for a meal plan.

    Collects all MealItems from all Meals of the plan,
    aggregates identical ingredients (summing quantities), groups by
    RetailSection, and estimates prices from Ingredient.price_per_kg.

    Args:
        meal_plan: The MealPlan to generate a shopping list for
        scaling_override: Optional override for the scaling factor
            (defaults to meal_plan.scaling_factor)

    Returns:
        Sorted list of ShoppingListItem grouped by retail section, then name
    """
    from planner.models import MealItem
    from recipe.models import RecipeItem
    from supply.services.price_service import get_portion_price

    scaling = scaling_override if scaling_override is not None else meal_plan.scaling_factor

    # Collect all MealItems
    meal_items = MealItem.objects.filter(
        meal__meal_plan=meal_plan,
    ).select_related("recipe", "meal", "ingredient", "ingredient__retail_section")

    # Aggregate: ingredient_id -> ShoppingListItem
    aggregated: dict[int, ShoppingListItem] = {}
    # Track sources per ingredient: ingredient_id -> dict[(recipe_id, meal_id) -> ShoppingItemSource]
    sources_map: dict[int, dict[tuple[int, int | None], ShoppingItemSource]] = {}
    # Track raw quantities for items with weight_g=0: ingredient_id -> (total_quantity, portion_name)
    raw_quantities: dict[int, tuple[float, str]] = {}

    for mi in meal_items:
        meal = mi.meal
        if meal and meal.override_portions is not None:
            meal_scaling = meal.override_portions * meal_plan.reserve_factor
        else:
            meal_scaling = scaling

        meal_label = str(mi.meal) if mi.meal else ""

        if mi.recipe:
            recipe = mi.recipe
            recipe_items = RecipeItem.objects.filter(
                recipe=recipe,
            ).select_related("portion__ingredient", "portion__ingredient__retail_section")

            for ri in recipe_items:
                if not ri.portion:
                    continue

                ing = ri.portion.ingredient
                if not ing:
                    # Skip items without linked ingredient (can't aggregate)
                    continue

                recipe_servings = getattr(recipe, "servings", 1) or 1
                weight_g = ri.quantity * (ri.portion.weight_g or 0) * mi.factor * meal_scaling / recipe_servings

                # Track raw quantity for items where portion has no weight
                if not ri.portion.weight_g:
                    raw_qty = ri.quantity * mi.factor * meal_scaling / recipe_servings
                    portion_name = ri.portion.name or ""
                    if ing.id in raw_quantities:
                        raw_quantities[ing.id] = (
                            raw_quantities[ing.id][0] + raw_qty,
                            raw_quantities[ing.id][1] or portion_name,
                        )
                    else:
                        raw_quantities[ing.id] = (raw_qty, portion_name)

                if ing.id in aggregated:
                    aggregated[ing.id].total_quantity_g += weight_g
                else:
                    section_name = ""
                    if ing.retail_section:
                        section_name = ing.retail_section.name

                    aggregated[ing.id] = ShoppingListItem(
                        ingredient_id=ing.id,
                        ingredient_name=ing.name,
                        ingredient_slug=ing.slug if hasattr(ing, "slug") else "",
                        total_quantity_g=weight_g,
                        unit="g",
                        retail_section=section_name,
                        sources=[],
                    )
                    sources_map[ing.id] = {}

                # Track source contribution
                source_key = (recipe.id, mi.meal_id)
                if source_key in sources_map[ing.id]:
                    sources_map[ing.id][source_key].quantity_g += weight_g
                else:
                    source = ShoppingItemSource(
                        recipe_id=recipe.id,
                        recipe_name=recipe.title if hasattr(recipe, "title") else str(recipe),
                        recipe_slug=recipe.slug if hasattr(recipe, "slug") else "",
                        meal_label=meal_label,
                        quantity_g=weight_g,
                    )
                    sources_map[ing.id][source_key] = source

        elif mi.ingredient:
            ing = mi.ingredient
            # Direct ingredient case
            from supply.models import Portion
            portion = Portion.objects.filter(
                ingredient=ing,
                measuring_unit=mi.measuring_unit,
            ).first() if mi.measuring_unit else None

            portion_weight = portion.weight_g if portion else None
            if not portion_weight and mi.measuring_unit:
                if mi.measuring_unit.unit == "g":
                    portion_weight = mi.measuring_unit.quantity

            if portion_weight:
                weight_g = float(mi.quantity or 0) * portion_weight * mi.factor * meal_scaling
            else:
                weight_g = 0.0
                raw_qty = float(mi.quantity or 0) * mi.factor * meal_scaling
                portion_name = portion.name if portion else (mi.measuring_unit.name if mi.measuring_unit else "")
                if ing.id in raw_quantities:
                    raw_quantities[ing.id] = (
                        raw_quantities[ing.id][0] + raw_qty,
                        raw_quantities[ing.id][1] or portion_name,
                    )
                else:
                    raw_quantities[ing.id] = (raw_qty, portion_name)

            if ing.id in aggregated:
                aggregated[ing.id].total_quantity_g += weight_g
            else:
                section_name = ""
                if ing.retail_section:
                    section_name = ing.retail_section.name

                aggregated[ing.id] = ShoppingListItem(
                    ingredient_id=ing.id,
                    ingredient_name=ing.name,
                    ingredient_slug=ing.slug if hasattr(ing, "slug") else "",
                    total_quantity_g=weight_g,
                    unit="g",
                    retail_section=section_name,
                    sources=[],
                )
                sources_map[ing.id] = {}

            # Track source contribution
            source_key = (0, mi.meal_id)
            if source_key in sources_map[ing.id]:
                sources_map[ing.id][source_key].quantity_g += weight_g
            else:
                source = ShoppingItemSource(
                    recipe_id=0,
                    recipe_name="Direkte Zutat" if not mi.display_name else mi.display_name,
                    recipe_slug="",
                    meal_label=meal_label,
                    quantity_g=weight_g,
                )
                sources_map[ing.id][source_key] = source

    # Attach sources to items
    for ing_id, item in aggregated.items():
        item.sources = list(sources_map.get(ing_id, {}).values())

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

    # Round quantities to avoid floating point artifacts
    for item in aggregated.values():
        item.total_quantity_g = round(item.total_quantity_g, 2)
        if item.sources:
            for source in item.sources:
                source.quantity_g = round(source.quantity_g, 2)

    # Add display_quantity and natural_portions
    _enrich_display_fields(aggregated, raw_quantities)

    # Sort by retail section, then name
    result = sorted(
        aggregated.values(),
        key=lambda x: (x.retail_section, x.ingredient_name),
    )
    return result


def _format_weight(weight_g: float) -> str:
    """Format weight with smart unit conversion (g->kg) and rounding."""
    weight_g = round(weight_g, 2)
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


def _clean_float_display(value: float) -> int | float:
    """Round a float for display, converting to int if whole number."""
    rounded = round(value, 1)
    if rounded == int(rounded):
        return int(rounded)
    return rounded


def _format_natural_portion(count: int | float, name: str) -> str:
    """Format a natural portion display string like the frontend does.

    Omits "x" for known units (Stück, Scheibe, Packung, etc.)
    and handles leading numbers in portion names (e.g. "1 TL").
    """
    units_without_x = {
        'el', 'tl', 'esslöffel', 'teelöffel', 'g', 'kg', 'gramm', 'kilogramm',
        'ml', 'l', 'milliliter', 'liter', 'st.', 'stk', 'stück', 'prise', 'pr.',
        'dose', 'dosen', 'tasse', 'tassen', 'becher', 'portion', 'portionen',
        'handvoll', 'tropfen', 'zehe', 'zehen', 'packung', 'packungen', 'beutel',
        'scheibe', 'scheiben',
    }

    count = _clean_float_display(float(count))

    match = re.match(r'^(\d+(?:[.,]\d+)?)\s*(.*)$', name.strip())
    if match:
        val = float(match.group(1).replace(',', '.'))
        rest = match.group(2).strip()
        multiplied = count * val
        multiplied = _clean_float_display(multiplied)
        return f"ca. {multiplied} {rest}" if rest else f"ca. {multiplied}"

    first_word = name.split()[0].lower().rstrip('.,')
    should_omit_x = first_word in units_without_x or name.lower() in units_without_x

    if should_omit_x:
        return f"ca. {count} {name}"
    return f"ca. {count} x {name}"


def compute_portion_options(
    quantity_g: float,
    portions: list,
) -> tuple[str, list[dict]]:
    """Compute the best-matching natural portion display and all portion options.

    Returns (best_display_string, list_of_option_dicts).
    """
    options: list[dict] = []
    best_portion = None
    best_diff = float('inf')

    for p in portions:
        if not p.weight_g or p.weight_g <= 0:
            continue
        count = quantity_g / p.weight_g
        if count < 0.5:
            continue

        count_display = round(count, 1)
        if count_display < 1:
            count_display = 1
        elif count_display == int(count_display):
            count_display = int(count_display)

        display = _format_natural_portion(count_display, p.name)
        options.append({
            "name": p.name,
            "display": display,
            "is_default": p.is_default,
            "weight_g": p.weight_g,
            "count": round(count, 1),
        })

        # Find best portion (closest to 1 whole unit)
        diff = abs(count - 1.0)
        if p.is_default and diff <= 0.5:
            best_diff = diff
            best_portion = p
        elif diff < best_diff:
            best_diff = diff
            best_portion = p

    if not best_portion or not options:
        return ("", options)

    count = quantity_g / best_portion.weight_g
    count_display = round(count, 1)
    if count_display < 1:
        count_display = 1
    elif count_display == int(count_display):
        count_display = int(count_display)

    best_display = _format_natural_portion(count_display, best_portion.name)
    return (best_display, options)


def _enrich_display_fields(
    aggregated: dict[int, ShoppingListItem],
    raw_quantities: dict[int, tuple[float, str]] | None = None,
) -> None:
    """Add display_quantity, natural_portions, and display_text to shopping list items."""
    from supply.models import Ingredient
    from supply.models.ingredient import Portion

    if raw_quantities is None:
        raw_quantities = {}

    ingredient_ids = list(aggregated.keys())
    ingredients = {ing.id: ing for ing in Ingredient.objects.filter(id__in=ingredient_ids).prefetch_related("portions")}

    for ing_id, item in aggregated.items():
        ing = ingredients.get(ing_id)

        # If this item has no gram weight (weight_g=0), use raw quantity + portion name
        if item.total_quantity_g == 0 and ing_id in raw_quantities:
            raw_qty, portion_name = raw_quantities[ing_id]
            if portion_name:
                qty_display = round(raw_qty, 1)
                if qty_display == int(qty_display):
                    qty_display = int(qty_display)
                item.display_text = f"{qty_display} x {portion_name}"
                item.display_quantity = item.display_text
            else:
                item.display_text = ""
                item.display_quantity = _format_weight(item.total_quantity_g)
            continue

        if not ing:
            item.display_quantity = _format_weight(item.total_quantity_g)
            continue

        # Display quantity with smart unit conversion
        item.display_quantity = _format_weight(item.total_quantity_g)

        # Natural portions — compute best match and all options
        portions = list(ing.portions.order_by("-priority", "rank", "name"))
        if portions:
            best_display, options = compute_portion_options(item.total_quantity_g, portions)
            item.natural_portions = best_display
            item.portion_options = options


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
