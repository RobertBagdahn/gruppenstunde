"""List detail stays fast: no per-entry queries and no quantity warnings on load."""

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from shopping.models import ShoppingList, ShoppingListItem
from supply.models import Ingredient

BASE = "/api/shopping-lists"


@pytest.fixture
def owner(db):
    return get_user_model().objects.create_user(username="peter", email="peter@example.com", password="x")


@pytest.fixture
def owner_client(owner) -> Client:
    client = Client()
    client.force_login(owner)
    return client


def _add_items(shopping_list: ShoppingList, prefix: str, count: int) -> None:
    for i in range(count):
        ingredient = Ingredient.objects.create(name=f"{prefix}{i}", slug=f"{prefix}-{i}")
        ShoppingListItem.objects.create(
            shopping_list=shopping_list, name=f"{prefix}{i}", quantity_g=500, ingredient=ingredient
        )


def _query_count(client: Client, shopping_list: ShoppingList) -> int:
    with CaptureQueriesContext(connection) as ctx:
        assert client.get(f"{BASE}/{shopping_list.id}/").status_code == 200
    return len(ctx)


def test_detail_query_count_is_independent_of_item_count(owner_client, owner):
    shopping_list = ShoppingList.objects.create(name="Lager", owner=owner)
    _add_items(shopping_list, "a", 3)
    small = _query_count(owner_client, shopping_list)
    _add_items(shopping_list, "b", 20)

    assert _query_count(owner_client, shopping_list) == small


def test_detail_has_no_warnings_field(owner_client, owner):
    shopping_list = ShoppingList.objects.create(name="Lager", owner=owner)

    body = owner_client.get(f"{BASE}/{shopping_list.id}/").json()

    assert "warnings" not in body


def test_warnings_endpoint_is_empty_for_manual_list(owner_client, owner):
    shopping_list = ShoppingList.objects.create(name="Lager", owner=owner)

    response = owner_client.get(f"{BASE}/{shopping_list.id}/warnings/")

    assert response.status_code == 200
    assert response.json() == []


def test_warnings_endpoint_requires_access(owner):
    shopping_list = ShoppingList.objects.create(name="Lager", owner=owner)

    response = Client().get(f"{BASE}/{shopping_list.id}/warnings/")

    assert response.status_code in (401, 403)
