"""Shopping lists: server-side sort/filter, stable paging, liquid display from grams."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from shopping.models import ShoppingList
from shopping.tests import make_shopping_list, make_shopping_list_item

User = get_user_model()


def _all_pages(client: Client, query: str, page_size: int = 5) -> list[dict]:
    first = client.get(f"/api/shopping-lists/?{query}&page=1&page_size={page_size}").json()
    items = list(first["items"])
    for page in range(2, first["total_pages"] + 1):
        items += client.get(f"/api/shopping-lists/?{query}&page={page}&page_size={page_size}").json()["items"]
    return items


@pytest.mark.django_db
class TestShoppingListOrdering:
    def test_newest_lists_every_list_exactly_once_across_pages(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        for index in range(13):
            make_shopping_list(owner=user, name=f"Liste {index}")
        # Same timestamp for all: only the id tie-breaker keeps paging stable.
        ShoppingList.objects.update(updated_at=timezone.now())

        items = _all_pages(client, "sort=newest")

        ids = [item["id"] for item in items]
        assert len(ids) == 13
        assert len(set(ids)) == 13

    def test_newest_puts_most_recently_updated_first(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        old = make_shopping_list(owner=user, name="Alt")
        new = make_shopping_list(owner=user, name="Neu")
        ShoppingList.objects.filter(id=old.id).update(updated_at=timezone.now() - timedelta(days=30))

        assert [i["id"] for i in client.get("/api/shopping-lists/?sort=newest").json()["items"]] == [new.id, old.id]
        assert [i["id"] for i in client.get("/api/shopping-lists/?sort=oldest").json()["items"]] == [old.id, new.id]

    def test_name_sort_ignores_case(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        for name in ["beta", "Alpha", "Charlie"]:
            make_shopping_list(owner=user, name=name)

        names = [i["name"] for i in client.get("/api/shopping-lists/?sort=name_asc").json()["items"]]

        assert names == ["Alpha", "beta", "Charlie"]

    def test_mine_filters_on_the_server(self, client: Client):
        from shopping.tests import make_collaborator

        user = baker.make(User)
        other = baker.make(User)
        client.force_login(user)
        for index in range(3):
            make_shopping_list(owner=user, name=f"Meine {index}")
        shared = make_shopping_list(owner=other, name="Fremd")
        make_collaborator(shared, user=user)

        everything = client.get("/api/shopping-lists/").json()
        mine = client.get("/api/shopping-lists/?mine=true").json()

        assert everything["total"] == 4
        assert mine["total"] == 3
        assert all(item["name"].startswith("Meine") for item in mine["items"])

    def test_anonymous_is_rejected(self, client: Client):
        assert client.get("/api/shopping-lists/").status_code in (401, 403)


@pytest.mark.django_db
class TestLiquidDisplayFromGrams:
    def test_generated_list_shows_same_millilitres_as_the_plan(self, client: Client):
        from planner.tests import make_meal, make_meal_plan
        from supply.tests import make_ingredient, make_portion

        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        honey = make_ingredient(name="Blütenhonig", physical_density=1.4, physical_viscosity="liquid")
        portion = make_portion(honey, name="Löffel", quantity=1.0, weight_g=14.0, rank=1, weight_status="confirmed")
        baker.make("planner.MealItem", meal=meal, ingredient=honey, portion=portion, quantity=1)

        created = client.post(f"/api/shopping-lists/from-meal-plan/{plan.id}/")
        assert created.status_code == 200, created.content
        detail = client.get(f"/api/shopping-lists/{created.json()['id']}/").json()
        item = next(i for i in detail["items"] if i["name"] == "Blütenhonig")

        # 14 g × 10 persons = 140 g, honey density 1.4 g/ml => 100 ml
        assert item["quantity_g"] == pytest.approx(140.0)
        assert item["unit"] == "ml"
        assert item["quantity"] == pytest.approx(100.0)

    def test_free_text_entry_keeps_stored_unit(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        shopping_list = make_shopping_list(owner=user)
        make_shopping_list_item(shopping_list, name="Grillkohle", quantity_g=3000, unit="g", ingredient=None)

        item = client.get(f"/api/shopping-lists/{shopping_list.id}/").json()["items"][0]

        assert item["name"] == "Grillkohle"
        assert item["quantity_g"] == 3000
