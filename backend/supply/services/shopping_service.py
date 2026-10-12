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

from supply.services.portion_resolution import resolve_trusted_weight

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from planner.models import MealItem, MealPlan
    from recipe.models import RecipeItem
    from supply.models import Ingredient


def _retail_section_rank_map() -> dict[str, int]:
    """Name -> rank lookup for sorting the shopping list in store-walkthrough order."""
    from supply.models.reference import RetailSection

    return dict(RetailSection.objects.values_list("name", "rank"))


@dataclass
class ShoppingItemSource:
    """Tracks where a portion of an ingredient came from."""

    recipe_id: int | None
    recipe_name: str
    recipe_slug: str
    meal_label: str
    quantity_g: float
    ingredient_id: int | None = None
    meal_id: int | None = None


@dataclass
class ShoppingListItem:
    """A single item in the shopping list."""

    ingredient_id: int
    ingredient_name: str
    ingredient_slug: str = ""
    total_quantity_g: float = 0.0
    net_quantity_g: float = 0.0
    reserve_quantity_g: float = 0.0
    # Display quantity in `unit` ("g", or "ml" for beverages/liquids).
    quantity: float = 0.0
    unit: str = "g"
    retail_section: str = ""
    estimated_price_eur: float | None = None
    piece_equivalent: dict | None = None
    portion_options: list[dict] | None = None
    package_options: list[dict] | None = None
    package_surplus_g: float | None = None
    # Human-readable amount for items without a gram weight (e.g. "2 Stück"); stored as the list item note.
    display_text: str = ""
    sources: list[ShoppingItemSource] | None = None


@dataclass
class IngredientContribution:
    """One ingredient line of one meal item, scaled to the meal's portions.

    ``quantity`` is per person in the entry's own unit (overrides applied,
    before the meal item factor). ``weight_g`` is the scaled total including
    the plan reserve. When no trusted gram weight exists, ``raw_quantity``
    carries the scaled count of ``raw_portion_name`` instead.
    """

    ingredient: Ingredient
    meal_item: MealItem
    recipe_item: RecipeItem | None
    quantity: float
    weight_g: float
    effective_portions: float
    raw_quantity: float | None = None
    raw_portion_name: str = ""


@dataclass
class CollectedContributions:
    contributions: list[IngredientContribution]
    reserve_factor: float


def collect_ingredient_contributions(
    meal_plan: MealPlan,
    scaling_override: float | None = None,
) -> CollectedContributions:
    """Collect every scaled ingredient contribution of a meal plan.

    Single source for the shopping list and the plan quantity overview so
    both always show identical amounts.
    """
    from planner.models import MealItem
    from planner.services.calculation_context import active_recipe_items
    from planner.services.meal_item_helpers import _resolve_ingredient_weight_g
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient
    from supply.models import Portion

    # A reserve factor <= 0 is invalid; fall back to no reserve (1.0) so that
    # neither the scaling factor nor the net/reserve breakdown can divide by zero.
    reserve_factor = meal_plan.reserve_factor if (meal_plan.reserve_factor or 0) > 0 else 1.0
    scaling = scaling_override if scaling_override is not None else meal_plan.norm_portions * reserve_factor

    # Collect all MealItems from non-reference, non-external meals
    meal_items = list(
        MealItem.objects.filter(
            meal__meal_plan=meal_plan,
            meal__is_reference=False,
            meal__is_external=False,
        )
        .select_related(
            "recipe",
            "meal",
            "ingredient",
            "ingredient__retail_section",
            "measuring_unit",
            "portion__measuring_unit",
        )
        .prefetch_related(
            "recipe__recipe_items__portion__ingredient__retail_section",
            "recipe__recipe_items__ingredient__retail_section",
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
            deleted_at__isnull=True,
        ).select_related("measuring_unit"):
            if p.measuring_unit_id is not None:
                portion_lookup[(p.ingredient_id, p.measuring_unit_id)] = p

    contributions: list[IngredientContribution] = []

    for mi in meal_items:
        meal = mi.meal
        if meal and meal.override_portions is not None:
            meal_scaling = meal.override_portions * reserve_factor
            effective_portions: float = meal.override_portions
        else:
            meal_scaling = scaling
            effective_portions = float(meal_plan.norm_portions or 1)

        if mi.recipe:
            recipe = mi.recipe
            if recipe.deleted_at is not None:
                continue

            for active_item in active_recipe_items(mi):
                ri = active_item.recipe_item
                portion = ri.portion
                ing = get_recipe_item_ingredient(ri)
                if not ing:
                    continue

                # Recipe quantities are stored per person.
                weight_g = (active_item.weight_g or 0) * mi.factor * meal_scaling
                contribution = IngredientContribution(
                    ingredient=ing,
                    meal_item=mi,
                    recipe_item=ri,
                    quantity=active_item.quantity,
                    weight_g=weight_g,
                    effective_portions=effective_portions,
                )
                if portion is not None and resolve_trusted_weight(portion) is None:
                    contribution.raw_quantity = active_item.quantity * mi.factor * meal_scaling
                    contribution.raw_portion_name = portion.name or ""
                contributions.append(contribution)

        elif mi.ingredient and mi.ingredient.deleted_at is None:
            ing = mi.ingredient

            # Use canonical helper with pre-loaded portion cache (no N+1)
            base_weight_g = _resolve_ingredient_weight_g(mi, portion_cache=portion_lookup)
            contribution = IngredientContribution(
                ingredient=ing,
                meal_item=mi,
                recipe_item=None,
                quantity=float(mi.quantity or 0),
                weight_g=base_weight_g * mi.factor * meal_scaling,
                effective_portions=effective_portions,
            )
            if base_weight_g <= 0:
                # No weight resolved — track as raw quantity for display
                portion = mi.portion or (
                    portion_lookup.get((ing.id, mi.measuring_unit_id)) if mi.measuring_unit_id else None
                )
                contribution.raw_quantity = float(mi.quantity or 0) * mi.factor * meal_scaling
                contribution.raw_portion_name = (
                    portion.name if portion else (mi.measuring_unit.name if mi.measuring_unit else "")
                )
            contributions.append(contribution)

    return CollectedContributions(contributions=contributions, reserve_factor=reserve_factor)


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
    return aggregate_contributions(collect_ingredient_contributions(meal_plan, scaling_override))


def aggregate_contributions(collected: CollectedContributions) -> list[ShoppingListItem]:
    """Aggregate contributions per ingredient into sorted shopping list items."""
    from supply.models import Ingredient
    from supply.services.price_service import get_portion_price

    reserve_factor = collected.reserve_factor
    ingredient_cache: dict[int, Ingredient] = {}
    aggregated: dict[int, ShoppingListItem] = {}
    # ingredient_id -> {(recipe_id, meal_id) -> source}
    sources_map: dict[int, dict[tuple[int | None, int | None], ShoppingItemSource]] = {}
    # ingredient_id -> (total raw quantity, portion name) for items without grams
    raw_quantities: dict[int, tuple[float, str]] = {}

    for contribution in collected.contributions:
        ing = contribution.ingredient
        mi = contribution.meal_item
        weight_g = contribution.weight_g
        if contribution.recipe_item is None:
            ingredient_cache[ing.id] = ing

        if contribution.raw_quantity is not None:
            previous = raw_quantities.get(ing.id)
            if previous:
                raw_quantities[ing.id] = (
                    previous[0] + contribution.raw_quantity,
                    previous[1] or contribution.raw_portion_name,
                )
            else:
                raw_quantities[ing.id] = (contribution.raw_quantity, contribution.raw_portion_name)

        if ing.id in aggregated:
            aggregated[ing.id].total_quantity_g += weight_g
        else:
            aggregated[ing.id] = ShoppingListItem(
                ingredient_id=ing.id,
                ingredient_name=ing.name,
                ingredient_slug=ing.slug if hasattr(ing, "slug") else "",
                total_quantity_g=weight_g,
                unit="g",
                retail_section=ing.retail_section.name if ing.retail_section else "",
                sources=[],
            )
            sources_map[ing.id] = {}

        meal_label = str(mi.meal) if mi.meal else ""
        recipe = mi.recipe if contribution.recipe_item is not None else None
        source_key: tuple[int | None, int | None] = (recipe.id if recipe else None, mi.meal_id)
        if source_key in sources_map[ing.id]:
            sources_map[ing.id][source_key].quantity_g += weight_g
        elif recipe is not None:
            sources_map[ing.id][source_key] = ShoppingItemSource(
                recipe_id=recipe.id,
                meal_id=mi.meal_id,
                recipe_name=recipe.title if hasattr(recipe, "title") else str(recipe),
                recipe_slug=recipe.slug if hasattr(recipe, "slug") else "",
                meal_label=meal_label,
                quantity_g=weight_g,
            )
        else:
            sources_map[ing.id][source_key] = ShoppingItemSource(
                recipe_id=None,
                ingredient_id=ing.id,
                meal_id=mi.meal_id,
                recipe_name="Direkte Zutat" if not mi.display_name else mi.display_name,
                recipe_slug="",
                meal_label=meal_label,
                quantity_g=weight_g,
            )

    # Attach sources to items
    for ing_id, item in aggregated.items():
        item.sources = list(sources_map.get(ing_id, {}).values())

    # Bulk-load any ingredients not yet in cache (recipe-path ingredients)
    missing_ids = [ing_id for ing_id in aggregated if ing_id not in ingredient_cache]
    if missing_ids:
        for ing in Ingredient.objects.filter(id__in=missing_ids):
            ingredient_cache[ing.id] = ing

    # Estimate prices from Ingredient.price_per_kg — no DB queries here
    for ing_id, item in aggregated.items():
        cached_ingredient = ingredient_cache.get(ing_id)
        if cached_ingredient is None:
            continue
        price = get_portion_price(cached_ingredient, item.total_quantity_g)
        if price is not None:
            item.estimated_price_eur = float(price)

    # Round quantities to avoid floating point artifacts
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

    from supply.utils import _format_quantity

    count = _clean_float_display(float(count))

    match = re.match(r"^(\d+(?:[.,]\d+)?)\s*(.*)$", name.strip())
    if match:
        val = float(match.group(1).replace(",", "."))
        rest = match.group(2).strip()
        multiplied = _clean_float_display(count * val)
        multiplied_str = _format_quantity(multiplied)
        return f"ca. {multiplied_str} {rest}" if rest else f"ca. {multiplied_str}"

    first_word = name.split()[0].lower().rstrip(".,")
    name_lower = name.lower()

    should_omit_x = (
        first_word in units_without_x or name_lower in units_without_x or bool(_piece_name_re.match(name_lower))
    )

    count_str = _format_quantity(count)
    if should_omit_x:
        return f"ca. {count_str} {name}"
    return f"ca. {count_str} x {name}"


def _rounded_piece_count(count: float) -> float:
    """Round a piece count to 1 decimal, snapping to a whole number at ≥1
    (matches the ``quantity-display-formatting`` "≈3 Stück" vs "≈2,5 Stück"
    rule: only fractional counts keep a decimal)."""
    count_display = round(count, 1)
    if count_display < 1:
        count_display = 1
    elif count_display == int(count_display):
        count_display = int(count_display)
    return count_display


def compute_portion_options(
    quantity_g: float,
    portions: list,
) -> tuple[dict | None, list[dict]]:
    """Compute the best-matching natural portion and all portion options as
    structured data (no formatted strings — the caller/frontend formats).

    Returns (best_option_or_None, list_of_option_dicts). Each option dict has
    ``name``, ``is_default``, ``weight_g``, ``count`` — no ``display``.
    """
    options: list[dict] = []
    best_portion = None
    best_diff = float("inf")
    # The standard portion (rank 1) is how people think about an ingredient
    # ("≈ 44 Zwiebeln", not "≈ 30 Portionen à 120 g"), so it wins whenever it
    # yields at least half a unit.
    default_portion = None

    for p in portions:
        if resolve_trusted_weight(p) is None:
            continue
        count = quantity_g / p.weight_g
        if count < 0.5:
            continue

        options.append(
            {
                "name": p.name,
                "is_default": p.rank == 1,
                "weight_g": p.weight_g,
                "count": _rounded_piece_count(count),
            }
        )

        if p.rank == 1 and default_portion is None:
            default_portion = p

        # Fallback: portion closest to 1 whole unit
        diff = abs(count - 1.0)
        if (p.rank == 1 and diff <= 0.5) or diff < best_diff:
            best_diff = diff
            best_portion = p

    if default_portion is not None:
        best_portion = default_portion
    if not best_portion or not options:
        return (None, options)

    best = {
        "name": best_portion.name,
        "is_default": best_portion.rank == 1,
        "weight_g": best_portion.weight_g,
        "count": _rounded_piece_count(quantity_g / best_portion.weight_g),
    }
    return (best, options)


def _enrich_display_fields(
    aggregated: dict[int, ShoppingListItem],
    raw_quantities: dict[int, tuple[float, str]] | None = None,
) -> None:
    """Add piece_equivalent, portion_options, and package_options (structured
    data — the frontend formats) to shopping list items."""
    from supply.models import Ingredient
    from supply.utils import compute_package_need, get_shopping_portion, shopping_quantity

    if raw_quantities is None:
        raw_quantities = {}

    ingredient_ids = list(aggregated.keys())
    ingredients = {ing.id: ing for ing in Ingredient.objects.filter(id__in=ingredient_ids).prefetch_related("portions")}

    for ing_id, item in aggregated.items():
        ing = ingredients.get(ing_id)
        item.quantity = item.total_quantity_g

        # If this item has no gram weight (weight_g=0), use the raw quantity +
        # portion name captured while aggregating (e.g. a Stück-only ingredient).
        if item.total_quantity_g == 0 and ing_id in raw_quantities:
            raw_qty, portion_name = raw_quantities[ing_id]
            if portion_name:
                qty_display = round(raw_qty, 1)
                if qty_display == int(qty_display):
                    qty_display = int(qty_display)
                item.piece_equivalent = {"count": qty_display, "portion_name": portion_name}
                item.display_text = f"{qty_display} {portion_name}"
            continue

        if not ing:
            continue

        # Natural portions — compute best match and all options
        # (soft-deleted portions must not appear as options)
        portions = [p for p in ing.portions.all() if p.deleted_at is None]
        portions.sort(key=lambda p: (p.rank, p.name))
        if portions:
            best, options = compute_portion_options(item.total_quantity_g, portions)
            if best:
                item.piece_equivalent = {"count": best["count"], "portion_name": best["name"]}
            item.portion_options = options

        item.quantity, item.unit = shopping_quantity(item.total_quantity_g, ing)

        package = get_shopping_portion(ing)
        need = compute_package_need(item.total_quantity_g, package.weight_g) if package else None
        if package and need:
            count, surplus_g = need
            package_amount, package_unit = shopping_quantity(float(package.weight_g or 0), ing)
            item.package_options = [
                {
                    "count": count,
                    "package_name": package.name,
                    "weight_g": package.weight_g,
                    "volume_ml": package_amount if package_unit == "ml" else None,
                }
            ]
            item.package_surplus_g = surplus_g


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
