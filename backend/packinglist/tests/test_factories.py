"""Tests to validate that all packinglist app factories produce valid model instances."""

import pytest

from packinglist.tests import (
    make_packing_category,
    make_packing_item,
    make_packing_list,
)


@pytest.mark.django_db
class TestPackingListFactories:
    def test_make_packing_list(self):
        pl = make_packing_list()
        assert pl.pk is not None
        assert pl.owner is not None
        assert pl.title == "Sommerlager Packliste"

    def test_make_packing_list_with_group(self):
        from profiles.tests import make_user_group

        group = make_user_group()
        pl = make_packing_list(group=group)
        assert pl.group == group

    def test_make_packing_category(self):
        cat = make_packing_category()
        assert cat.pk is not None
        assert cat.packing_list is not None
        assert cat.name == "Kleidung"

    def test_make_packing_item(self):
        item = make_packing_item()
        assert item.pk is not None
        assert item.category is not None
        assert item.name == "Regenjacke"
        assert item.quantity == "1"

    def test_full_packing_list_hierarchy(self):
        pl = make_packing_list()
        cat_clothing = make_packing_category(packing_list=pl, name="Kleidung", sort_order=0)
        cat_gear = make_packing_category(packing_list=pl, name="Ausrüstung", sort_order=1)
        item1 = make_packing_item(category=cat_clothing, name="Regenjacke")
        item2 = make_packing_item(category=cat_clothing, name="Wanderschuhe")
        item3 = make_packing_item(category=cat_gear, name="Taschenlampe")

        assert pl.categories.count() == 2
        assert cat_clothing.items.count() == 2
        assert cat_gear.items.count() == 1
