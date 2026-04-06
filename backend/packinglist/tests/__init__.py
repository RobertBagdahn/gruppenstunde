"""Factories for creating test data (packinglist app)."""

from model_bakery import baker

from packinglist.models import PackingCategory, PackingItem, PackingList


# ---------------------------------------------------------------------------
# PackingList
# ---------------------------------------------------------------------------


def make_packing_list(owner=None, **kwargs) -> PackingList:
    if owner is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        owner = baker.make(User)
    defaults = {
        "title": "Sommerlager Packliste",
        "description": "Was du alles für das Sommerlager brauchst",
    }
    defaults.update(kwargs)
    return baker.make(PackingList, owner=owner, **defaults)


# ---------------------------------------------------------------------------
# PackingCategory
# ---------------------------------------------------------------------------


def make_packing_category(packing_list: PackingList | None = None, **kwargs) -> PackingCategory:
    if packing_list is None:
        packing_list = make_packing_list()
    defaults = {
        "name": "Kleidung",
        "sort_order": 0,
    }
    defaults.update(kwargs)
    return baker.make(PackingCategory, packing_list=packing_list, **defaults)


# ---------------------------------------------------------------------------
# PackingItem
# ---------------------------------------------------------------------------


def make_packing_item(category: PackingCategory | None = None, **kwargs) -> PackingItem:
    if category is None:
        category = make_packing_category()
    defaults = {
        "name": "Regenjacke",
        "quantity": "1",
        "description": "Wasserdichte Regenjacke",
        "sort_order": 0,
    }
    defaults.update(kwargs)
    return baker.make(PackingItem, category=category, **defaults)
