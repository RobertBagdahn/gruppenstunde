"""Compact board: minimal payload, per-viewer rights, cached per list state."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from shopping.models import ShoppingList, ShoppingListItem, ShoppingListItemSource

BASE = "/api/shopping-lists"


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def owner(db):
    return get_user_model().objects.create_user(username="peter", email="peter@example.com", password="x")


@pytest.fixture
def owner_client(owner) -> Client:
    client = Client()
    client.force_login(owner)
    return client


@pytest.fixture
def shopping_list(owner):
    return ShoppingList.objects.create(name="Lager", owner=owner)


def _join(shopping_list: ShoppingList, name: str) -> str:
    response = Client().post(
        f"{BASE}/shared/{shopping_list.share_token}/join/",
        json.dumps({"name": name}),
        content_type="application/json",
    )
    assert response.status_code == 200, response.content
    return response.json()["guest_token"]


def _send(client: Client, method: str, url: str, body: dict | None = None, guest: str | None = None):
    extra = {"HTTP_X_GUEST_TOKEN": guest} if guest else {}
    kwargs = {"data": json.dumps(body), "content_type": "application/json"} if body is not None else {}
    return getattr(client, method)(url, **kwargs, **extra)


def _share(owner_client: Client, shopping_list: ShoppingList) -> None:
    assert owner_client.post(f"{BASE}/{shopping_list.id}/share/").status_code == 200
    shopping_list.refresh_from_db()


def test_board_payload_is_compact(owner_client, shopping_list):
    ShoppingListItem.objects.create(shopping_list=shopping_list, name="Milch", quantity_g=1000)

    body = owner_client.get(f"{BASE}/{shopping_list.id}/board/").json()

    assert set(body) == {"id", "name", "stamp", "can_edit", "viewer_display_name", "total", "checked", "items"}
    assert set(body["items"][0]) == {
        "id", "name", "quantity", "unit", "retail_section_id", "retail_section_name", "is_material",
        "is_checked", "checked_by_name", "claimed_by_name", "claimed_by_me", "can_delete", "sort_order", "note",
    }  # fmt: skip
    assert body["total"] == 1 and body["checked"] == 0


def test_owner_may_delete_manual_entries_and_claims_are_per_viewer(owner_client, shopping_list):
    item = ShoppingListItem.objects.create(shopping_list=shopping_list, name="Milch")
    owner_client.patch(
        f"{BASE}/{shopping_list.id}/items/{item.id}/",
        json.dumps({"claimed": True}),
        content_type="application/json",
    )

    row = owner_client.get(f"{BASE}/{shopping_list.id}/board/").json()["items"][0]

    assert row["can_delete"] is True
    assert row["claimed_by_me"] is True


def test_generated_entries_are_not_deletable(owner_client, shopping_list):
    generated = ShoppingListItem.objects.create(shopping_list=shopping_list, name="Reis")
    ShoppingListItemSource.objects.create(shopping_list_item=generated)

    rows = {r["name"]: r for r in owner_client.get(f"{BASE}/{shopping_list.id}/board/").json()["items"]}

    assert rows["Reis"]["can_delete"] is False


def test_guest_may_delete_only_own_entries(owner_client, shopping_list):
    _share(owner_client, shopping_list)
    anna, ben = _join(shopping_list, "Anna"), _join(shopping_list, "Ben")
    own = _send(Client(), "post", f"{BASE}/{shopping_list.id}/items/", {"name": "Nudeln"}, guest=anna).json()
    ShoppingListItem.objects.create(shopping_list=shopping_list, name="Reis")

    rows = {r["name"]: r for r in Client().get(
        f"{BASE}/{shopping_list.id}/board/", HTTP_X_GUEST_TOKEN=anna
    ).json()["items"]}  # fmt: skip
    assert rows["Nudeln"]["can_delete"] is True and rows["Reis"]["can_delete"] is False

    other = {r["name"]: r for r in Client().get(
        f"{BASE}/{shopping_list.id}/board/", HTTP_X_GUEST_TOKEN=ben
    ).json()["items"]}  # fmt: skip
    assert other["Nudeln"]["can_delete"] is False
    assert own["name"] == "Nudeln"


def test_board_is_cached_until_the_list_changes(owner_client, shopping_list):
    ShoppingListItem.objects.create(shopping_list=shopping_list, name="Milch")

    with CaptureQueriesContext(connection) as miss:
        owner_client.get(f"{BASE}/{shopping_list.id}/board/")
    with CaptureQueriesContext(connection) as hit:
        owner_client.get(f"{BASE}/{shopping_list.id}/board/")
    assert len(hit) < len(miss)

    ShoppingListItem.objects.create(shopping_list=shopping_list, name="Brot")
    body = owner_client.get(f"{BASE}/{shopping_list.id}/board/").json()
    assert body["total"] == 2


def test_board_query_count_is_independent_of_item_count(owner_client, shopping_list):
    def count() -> int:
        cache.clear()
        with CaptureQueriesContext(connection) as ctx:
            assert owner_client.get(f"{BASE}/{shopping_list.id}/board/").status_code == 200
        return len(ctx)

    for i in range(3):
        ShoppingListItem.objects.create(shopping_list=shopping_list, name=f"a{i}")
    small = count()
    for i in range(30):
        ShoppingListItem.objects.create(shopping_list=shopping_list, name=f"b{i}")

    assert count() == small


def test_anonymous_without_access_is_rejected(shopping_list):
    response = Client().get(f"{BASE}/{shopping_list.id}/board/")

    assert response.status_code in (401, 403)
