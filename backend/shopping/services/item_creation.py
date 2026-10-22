"""Turn aggregated plan demand into persistent list entries with their sources."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from shopping.models import ShoppingList, ShoppingListItem, ShoppingListItemSource
from supply.models import Ingredient
from supply.services.shopping_service import ShoppingListItem as AggregatedIngredient


@dataclass(frozen=True)
class SourceSpec:
    """Provenance of a share of an entry's quantity."""

    quantity_g: float
    recipe_id: int | None = None
    meal_id: int | None = None
    ingredient_id: int | None = None
    recipe_name: str = ""
    recipe_slug: str = ""
    meal_label: str = ""


def write_sources(entry: ShoppingListItem, specs: Iterable[SourceSpec]) -> None:
    from planner.models import Meal
    from recipe.models import Recipe

    specs = list(specs)
    meals = Meal.objects.in_bulk({s.meal_id for s in specs if s.meal_id})
    recipes = Recipe.objects.in_bulk({s.recipe_id for s in specs if s.recipe_id})
    ingredients = Ingredient.objects.in_bulk({s.ingredient_id for s in specs if s.ingredient_id})
    ShoppingListItemSource.objects.bulk_create(
        ShoppingListItemSource(
            shopping_list_item=entry,
            recipe=recipes.get(spec.recipe_id),
            meal=meals.get(spec.meal_id),
            ingredient=ingredients.get(spec.ingredient_id) if spec.ingredient_id else entry.ingredient,
            # bulk_create skips save(), so the two-decimal rounding is applied here
            quantity_g=round(spec.quantity_g, 2),
            recipe_name=spec.recipe_name,
            recipe_slug=spec.recipe_slug,
            meal_label=spec.meal_label,
        )
        for spec in specs
    )


def specs_of(aggregated: AggregatedIngredient, scale: float = 1.0) -> list[SourceSpec]:
    return [
        SourceSpec(
            quantity_g=s.quantity_g * scale,
            recipe_id=s.recipe_id,
            meal_id=s.meal_id,
            ingredient_id=s.ingredient_id,
            recipe_name=s.recipe_name,
            recipe_slug=s.recipe_slug,
            meal_label=s.meal_label,
        )
        for s in aggregated.sources or []
    ]


def add_ingredient_items(
    shopping_list: ShoppingList,
    items: Iterable[AggregatedIngredient],
    start_sort_order: int = 0,
    scales: dict[int, float] | None = None,
) -> int:
    """One entry per ingredient; the sources keep recipe, meal and the share of the quantity.

    `scales` (ingredient id -> factor) shrinks an entry and its sources, e.g. to what is still missing.
    """
    items = list(items)
    ingredients = Ingredient.objects.select_related("retail_section").in_bulk({i.ingredient_id for i in items})
    created = 0
    for aggregated in items:
        scale = (scales or {}).get(aggregated.ingredient_id, 1.0)
        quantity = aggregated.total_quantity_g * scale
        ingredient = ingredients.get(aggregated.ingredient_id)
        entry = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            ingredient=ingredient,
            name=aggregated.ingredient_name,
            quantity_g=quantity,
            # quantity_g is grams; the display unit is derived from it on read.
            unit="g",
            note=aggregated.display_text if not quantity and aggregated.display_text else "",
            retail_section=ingredient.retail_section if ingredient else None,
            sort_order=start_sort_order + created,
        )
        write_sources(entry, specs_of(aggregated, scale))
        created += 1
    return created
