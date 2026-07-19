"""Shopping list generation service.

Aggregates ingredients from MealPlan -> Meal -> MealItem -> Recipe -> RecipeItem,
groups by RetailSection, sums quantities, and estimates prices.

Quantities scale with ``meal_plan.scaling_factor`` (= norm_portions * reserve_factor).
The PAL/activity factor is intentionally NOT applied to physical purchase quantities;
it belongs to the norm-portion calorie calculation only.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

from supply.utils import format_weight

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from planner.models import MealPlan


def _retail_section_rank_map() -> dict[str, int]:
    """Name -> rank lookup for sorting the shopping list in store-walkthrough order."""
    from supply.data.retail_sections import RETAIL_SECTIONS

    return {entry["name"]: entry["rank"] for entry in RETAIL_SECTIONS}


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
    net_quantity_g: float = 0.0
    reserve_quantity_g: float = 0.0
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
    display_quantity: str = ""
    natural_portions: str = ""
    portion_options: list[dict] | None = None
    display_text: str = ""
    sources: list[ShoppingItemSource] | None = None


def generate_shopping_list(
    meal_plan: MealPlan,
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
    from planner.services.meal_item_helpers import _resolve_ingredient_weight_g
    from supply.models import Portion
    from supply.services.price_service import get_portion_price

    scaling = scaling_override if scaling_override is not None else meal_plan.scaling_factor

    # Collect all MealItems — prefetch recipe items, direct-ingredient portions, and overrides upfront
    meal_items = list(
        MealItem.objects.filter(
            meal__meal_plan=meal_plan,
        )
        .select_related(
            "recipe",
            "meal",
            "ingredient",
            "ingredient__retail_section",
            "measuring_unit",
        )
        .prefetch_related(
            "recipe__recipe_items__portion__ingredient__retail_section",
            "overrides",
        )
    )

    # Batch-load portions for direct-ingredient MealItems to avoid N+1.
    # We load ALL portions for the relevant ingredients so the helper's
    # default-portion fallback also works without extra DB queries.
    direct_ingredient_ids = {mi.ingredient_id for mi in meal_items if mi.ingredient_id}
    portion_lookup: dict[tuple[int, int], Portion] = {}
    if direct_ingredient_ids:
        for p in Portion.objects.filter(
            ingredient_id__in=direct_ingredient_ids,
        ).select_related("measuring_unit"):
            if p.measuring_unit_id is not None:
                portion_lookup[(p.ingredient_id, p.measuring_unit_id)] = p

    # Batch-load ingredients for price estimation at the end
    ingredient_cache: dict[int, object] = {}

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
            effective_portions = meal.override_portions
        else:
            meal_scaling = scaling
            effective_portions = meal_plan.norm_portions or 1

        meal_label = str(mi.meal) if mi.meal else ""

        if mi.recipe:
            recipe = mi.recipe
            if not getattr(recipe, "portions", None):
                logger.warning(
                    "Recipe %s '%s' has portions=0 or None, skipping in shopping_service",
                    recipe.id,
                    getattr(recipe, "title", str(recipe)),
                )
                continue
            recipe_items = list(recipe.recipe_items.all())
            active_ids = set(mi.active_recipe_item_ids or [])

            # Build override lookup for this meal item
            overrides_map = {o.recipe_item_id: o for o in mi.overrides.all()}

            for ri in recipe_items:
                if not ri.portion:
                    continue

                ing = ri.portion.ingredient
                if not ing:
                    continue

                # Base items always included; exchange/optional only if in active_ids
                if ri.exchange_group_id is not None or ri.is_optional:
                    if ri.id not in active_ids:
                        continue

                # MealItemOverride: excluded items are not purchased
                override = overrides_map.get(ri.id)
                if override and override.excluded:
                    continue

                # quantity_override replaces recipe item quantity for purchase amount
                effective_quantity = (
                    float(override.quantity_override)
                    if (override and override.quantity_override is not None)
                    else float(ri.quantity)
                )

                recipe_servings = recipe.portions
                weight_g = effective_quantity * (ri.portion.weight_g or 0) * mi.factor * meal_scaling / recipe_servings

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
            ingredient_cache[ing.id] = ing

            # Use canonical helper with pre-loaded portion cache (no N+1)
            base_weight_g = _resolve_ingredient_weight_g(mi, portion_cache=portion_lookup)
            weight_g = base_weight_g * mi.factor * meal_scaling

            if base_weight_g <= 0:
                # No weight resolved — track as raw quantity for display
                portion = portion_lookup.get((ing.id, mi.measuring_unit_id)) if mi.measuring_unit_id else None
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

    # Bulk-load any ingredients not yet in cache (recipe-path ingredients)
    from supply.models import Ingredient

    missing_ids = [ing_id for ing_id in aggregated if ing_id not in ingredient_cache]
    if missing_ids:
        for ing in Ingredient.objects.filter(id__in=missing_ids):
            ingredient_cache[ing.id] = ing

    # Estimate prices from Ingredient.price_per_kg — no DB queries here
    for ing_id, item in aggregated.items():
        ing = ingredient_cache.get(ing_id)
        if ing is None:
            continue
        price = get_portion_price(ing, item.total_quantity_g)
        if price is not None:
            item.estimated_price_eur = float(price)

    # Round quantities to avoid floating point artifacts
    reserve_factor = meal_plan.reserve_factor or 1.0
    for item in aggregated.values():
        item.total_quantity_g = round(item.total_quantity_g, 2)
        # Net/reserve breakdown: total is rounding-authoritative, reserve = total - net
        item.net_quantity_g = round(item.total_quantity_g / reserve_factor, 2)
        item.reserve_quantity_g = round(item.total_quantity_g - item.net_quantity_g, 2)
        if item.sources:
            for source in item.sources:
                source.quantity_g = round(source.quantity_g, 2)

    # Add display_quantity and natural_portions
    _enrich_display_fields(aggregated, raw_quantities)

    # Sort by retail section rank (Laden-Rundgang), then name
    rank_by_name = _retail_section_rank_map()
    result = sorted(
        aggregated.values(),
        key=lambda x: (rank_by_name.get(x.retail_section, 999), x.retail_section, x.ingredient_name),
    )
    return result


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

    Tolerant matching for Stück-/Verpackungsnamen, auch zusammengesetzte
    Namen wie "Stück (150g)" oder "Packung (500g)".
    """
    units_without_x = {
        "el",
        "tl",
        "esslöffel",
        "teelöffel",
        "g",
        "kg",
        "gramm",
        "kilogramm",
        "ml",
        "l",
        "milliliter",
        "liter",
        "st.",
        "stk",
        "stück",
        "prise",
        "pr.",
        "dose",
        "dosen",
        "tasse",
        "tassen",
        "becher",
        "portion",
        "portionen",
        "handvoll",
        "tropfen",
        "zehe",
        "zehen",
        "packung",
        "packungen",
        "beutel",
        "scheibe",
        "scheiben",
    }

    # Regex-Muster für Stück-/Verpackungsnamen, die mit diesen Wörtern beginnen
    # (inkl. zusammengesetzter Namen wie "Stück (150g)", "Packung (500g)")
    _piece_name_re = re.compile(
        r"^(stück|packung|packungen|stk|st\.|dose|dosen|beutel|becher|scheibe|scheiben)\b",
        re.IGNORECASE,
    )

    count = _clean_float_display(float(count))

    match = re.match(r"^(\d+(?:[.,]\d+)?)\s*(.*)$", name.strip())
    if match:
        val = float(match.group(1).replace(",", "."))
        rest = match.group(2).strip()
        multiplied = count * val
        multiplied = _clean_float_display(multiplied)
        return f"ca. {multiplied} {rest}" if rest else f"ca. {multiplied}"

    first_word = name.split()[0].lower().rstrip(".,")
    name_lower = name.lower()

    should_omit_x = (
        first_word in units_without_x or name_lower in units_without_x or bool(_piece_name_re.match(name_lower))
    )

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
    best_diff = float("inf")

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
        options.append(
            {
                "name": p.name,
                "display": display,
                "is_default": p.rank == 1,
                "weight_g": p.weight_g,
                "count": round(count, 1),
            }
        )

        # Find best portion (closest to 1 whole unit)
        diff = abs(count - 1.0)
        if (p.rank == 1 and diff <= 0.5) or diff < best_diff:
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
                item.display_quantity = format_weight(item.total_quantity_g)
            continue

        if not ing:
            item.display_quantity = format_weight(item.total_quantity_g)
            continue

        # Display quantity with smart unit conversion
        item.display_quantity = format_weight(item.total_quantity_g)

        # Natural portions — compute best match and all options
        portions = list(ing.portions.order_by("rank", "name"))
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
