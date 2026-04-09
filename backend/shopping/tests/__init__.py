"""Factories for creating test data (shopping app)."""

from model_bakery import baker

from shopping.models import (
    CollaboratorRole,
    ShoppingList,
    ShoppingListCollaborator,
    ShoppingListItem,
    SourceType,
)


def make_shopping_list(owner=None, **kwargs) -> ShoppingList:
    defaults = {
        "name": "Wocheneinkauf",
        "source_type": SourceType.MANUAL,
    }
    defaults.update(kwargs)
    return baker.make(ShoppingList, owner=owner, **defaults)


def make_shopping_list_item(shopping_list: ShoppingList | None = None, **kwargs) -> ShoppingListItem:
    if shopping_list is None:
        shopping_list = make_shopping_list()
    defaults = {
        "name": "Mehl",
        "quantity_g": 500,
        "unit": "g",
        "sort_order": 0,
    }
    defaults.update(kwargs)
    return baker.make(ShoppingListItem, shopping_list=shopping_list, **defaults)


def make_collaborator(
    shopping_list: ShoppingList,
    user=None,
    role: str = CollaboratorRole.EDITOR,
    **kwargs,
) -> ShoppingListCollaborator:
    return baker.make(
        ShoppingListCollaborator,
        shopping_list=shopping_list,
        user=user,
        role=role,
        **kwargs,
    )
