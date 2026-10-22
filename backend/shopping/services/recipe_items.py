"""Add the ingredients of a recipe to a shopping list, merging into open entries of the same ingredient."""

from __future__ import annotations

from shopping.models import ShoppingList, ShoppingListItem, ShoppingListItemSource
from shopping.services.material_items import PIECE_UNIT


def _next_sort_order(shopping_list: ShoppingList) -> int:
    last = shopping_list.items.order_by("-sort_order").values_list("sort_order", flat=True).first()
    return 0 if last is None else last + 1


def _add_source(item: ShoppingListItem, recipe, quantity: float, ingredient=None) -> None:
    ShoppingListItemSource.objects.create(
        shopping_list_item=item,
        recipe=recipe,
        ingredient=ingredient,
        quantity_g=quantity,
        recipe_name=recipe.title,
        recipe_slug=getattr(recipe, "slug", ""),
        meal_label="",
    )


def _open_match(shopping_list: ShoppingList, unit: str, **lookup) -> ShoppingListItem | None:
    """Open entry to merge into; checked entries stay as bought, so they never match."""
    return shopping_list.items.filter(is_checked=False, unit=unit, **lookup).order_by("id").first()


def add_recipe_to_list(shopping_list: ShoppingList, recipe, portions: int, include_consumables: bool) -> None:
    from planner.services.calculation_context import resolve_active_recipe_items
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient
    from supply.services.material_aggregation import aggregate_materials

    active_items = {item.recipe_item.id: item for item in resolve_active_recipe_items(recipe)}
    recipe_items = recipe.recipe_items.select_related(
        "portion__ingredient__retail_section", "portion__measuring_unit", "ingredient__retail_section"
    )

    sort_idx = _next_sort_order(shopping_list)
    for ri in recipe_items:
        # Inactive exchange alternatives and soft-deleted portions are not bought.
        active_item = active_items.get(ri.id)
        if not active_item:
            continue

        ing = get_recipe_item_ingredient(ri)
        # Recipe quantities are stored per person.
        weight_g = (active_item.weight_g or 0) * portions
        portion_unit = ri.portion.measuring_unit.name if ri.portion and ri.portion.measuring_unit else ""
        unit = "g" if active_item.weight_g is not None else portion_unit
        name = ing.name if ing is not None else (ri.note or "Unbekannte Zutat")

        existing = (
            _open_match(shopping_list, unit, ingredient=ing)
            if ing is not None
            else _open_match(shopping_list, unit, ingredient__isnull=True, material__isnull=True, name__iexact=name)
        )
        if existing is not None and active_item.weight_g is not None:
            existing.quantity_g += weight_g
            existing.save(update_fields=["quantity_g", "updated_at"])
            item = existing
        else:
            if active_item.weight_g is not None:
                note = ""
            elif ing is None:
                note = f"Menge: {active_item.quantity:g}; Gewicht unbekannt"
            else:
                note = f"Menge: {active_item.quantity:g} {portion_unit}".rstrip() + "; Gewicht unbekannt"
            item = ShoppingListItem.objects.create(
                shopping_list=shopping_list,
                ingredient=ing,
                name=name,
                quantity_g=weight_g,
                unit=unit,
                note=note,
                retail_section=ing.retail_section if ing is not None else None,
                sort_order=sort_idx,
            )
            sort_idx += 1

        # Every generated entry keeps its recipe source so it is never treated as a manual entry.
        _add_source(item, recipe, weight_g, ing)

    if include_consumables:
        for requirement in aggregate_materials([(recipe, portions)]).consumables:
            existing = _open_match(shopping_list, PIECE_UNIT, material=requirement.material)
            if existing is not None:
                existing.quantity_g += requirement.amount
                existing.save(update_fields=["quantity_g", "updated_at"])
                item = existing
            else:
                item = ShoppingListItem.objects.create(
                    shopping_list=shopping_list,
                    material=requirement.material,
                    name=requirement.material.name,
                    quantity_g=requirement.amount,
                    unit=PIECE_UNIT,
                    retail_section=requirement.material.retail_section,
                    sort_order=sort_idx,
                )
                sort_idx += 1
            for ref in requirement.recipes:
                _add_source(item, recipe, ref.amount)
