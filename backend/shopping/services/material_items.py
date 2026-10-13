"""Add consumable materials to a shopping list (devices are never bought)."""

from __future__ import annotations

from shopping.models import ShoppingList, ShoppingListItem, ShoppingListItemSource
from supply.services.material_aggregation import MaterialList

PIECE_UNIT = "Stück"


def add_consumable_items(shopping_list: ShoppingList, material_list: MaterialList, start_sort_order: int = 0) -> int:
    """Create one item per consumable material; the piece count is stored in `quantity_g`.

    Returns the number of created items.
    """
    created = 0
    for requirement in material_list.consumables:
        material = requirement.material
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            material=material,
            name=material.name,
            quantity_g=requirement.amount,
            unit=PIECE_UNIT,
            retail_section=material.retail_section,
            sort_order=start_sort_order + created,
        )
        for ref in requirement.recipes:
            ShoppingListItemSource.objects.create(
                shopping_list_item=item,
                recipe_id=ref.id,
                quantity_g=ref.amount,
                recipe_name=ref.title,
                recipe_slug=ref.slug,
                meal_label="",
            )
        created += 1
    return created
