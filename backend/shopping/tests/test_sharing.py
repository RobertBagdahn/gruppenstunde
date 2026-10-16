"""Invitation link: guests without an account work on a list; attribution, limits, revocation."""

import json

import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import Client

from inspi.asgi import application
from shopping.models import (
    CollaboratorRole,
    ShoppingList,
    ShoppingListCollaborator,
    ShoppingListGuest,
    ShoppingListItem,
    ShoppingListItemSource,
)

User = get_user_model()
BASE = "/api/shopping-lists"


def _send(client: Client, method: str, url: str, body: dict | None = None, guest: str | None = None):
    extra = {"HTTP_X_GUEST_TOKEN": guest} if guest else {}
    kwargs = {"data": json.dumps(body), "content_type": "application/json"} if body is not None else {}
    return getattr(client, method)(url, **kwargs, **extra)


@pytest.fixture
def owner(db):
    return User.objects.create_user(username="peter", email="peter@example.com", password="x")


@pytest.fixture
def owner_client(owner) -> Client:
    client = Client()
    client.force_login(owner)
    return client


@pytest.fixture
def shopping_list(owner):
    return ShoppingList.objects.create(name="Lagereinkauf", owner=owner)


@pytest.fixture
def shared(owner_client, shopping_list):
    response = owner_client.post(f"{BASE}/{shopping_list.id}/share/")
    assert response.status_code == 200
    shopping_list.refresh_from_db()
    return shopping_list


def _join(shared: ShoppingList, name: str = "Anna") -> str:
    response = Client().post(
        f"{BASE}/shared/{shared.share_token}/join/", json.dumps({"name": name}), content_type="application/json"
    )
    assert response.status_code == 200, response.content
    return response.json()["guest_token"]


def test_enable_sharing_is_idempotent_and_owner_sees_token(owner_client, shopping_list):
    first = owner_client.post(f"{BASE}/{shopping_list.id}/share/").json()
    second = owner_client.post(f"{BASE}/{shopping_list.id}/share/").json()

    assert first["share_token"] == second["share_token"]
    detail = owner_client.get(f"{BASE}/{shopping_list.id}/").json()
    assert detail["share_token"] == first["share_token"]
    assert detail["can_manage"] is True


def test_only_admins_manage_sharing(shopping_list):
    editor = User.objects.create_user(username="ed", email="ed@example.com", password="x")
    ShoppingListCollaborator.objects.create(shopping_list=shopping_list, user=editor, role=CollaboratorRole.EDITOR)
    client = Client()
    client.force_login(editor)

    assert client.post(f"{BASE}/{shopping_list.id}/share/").status_code == 403
    assert Client().post(f"{BASE}/{shopping_list.id}/share/").status_code == 401


def test_preview_shows_no_entries_and_unknown_token_is_404(shared):
    ShoppingListItem.objects.create(shopping_list=shared, name="Milch")

    body = Client().get(f"{BASE}/shared/{shared.share_token}/").json()

    assert body["name"] == "Lagereinkauf"
    assert body["items_count"] == 1
    assert "items" not in body
    assert body["already_member"] is False
    assert Client().get(f"{BASE}/shared/00000000-0000-0000-0000-000000000000/").status_code == 404
    assert Client().get(f"{BASE}/shared/not-a-uuid/").status_code == 404


def test_join_requires_a_name(shared):
    response = Client().post(
        f"{BASE}/shared/{shared.share_token}/join/", json.dumps({"name": "  "}), content_type="application/json"
    )

    assert response.status_code == 422


def test_guest_reads_and_adds_with_attribution(shared, owner_client):
    token = _join(shared, "Anna")
    guest = Client()

    detail = _send(guest, "get", f"{BASE}/{shared.id}/", guest=token).json()
    assert detail["can_edit"] is True
    assert detail["can_manage"] is False
    assert detail["viewer_display_name"] == "Anna"
    assert detail["collaborators"] == []
    assert detail["share_token"] is None

    added = _send(guest, "post", f"{BASE}/{shared.id}/items/", {"name": "Brot"}, guest=token).json()
    assert added["added_by_display_name"] == "Anna"
    assert added["can_delete"] is True
    assert added["created_at"]

    checked = _send(
        guest, "patch", f"{BASE}/{shared.id}/items/{added['id']}/", {"is_checked": True}, guest=token
    ).json()
    assert checked["checked_by_display_name"] == "Anna"
    assert checked["checked_at"]

    owner_view = owner_client.get(f"{BASE}/{shared.id}/").json()
    assert owner_view["items"][0]["added_by_display_name"] == "Anna"
    assert [g["name"] for g in owner_view["guests"]] == ["Anna"]
    assert "token" not in owner_view["guests"][0]


def test_first_checker_stays_and_uncheck_clears(shared):
    anna, ben = _join(shared, "Anna"), _join(shared, "Ben")
    item = ShoppingListItem.objects.create(shopping_list=shared, name="Käse")
    url = f"{BASE}/{shared.id}/items/{item.id}/"

    _send(Client(), "patch", url, {"is_checked": True}, guest=anna)
    second = _send(Client(), "patch", url, {"is_checked": True}, guest=ben).json()
    assert second["checked_by_display_name"] == "Anna"

    cleared = _send(Client(), "patch", url, {"is_checked": False}, guest=ben).json()
    assert cleared["checked_by_display_name"] is None


def test_guest_deletes_only_own_manual_entries(shared):
    anna, ben = _join(shared, "Anna"), _join(shared, "Ben")
    own = _send(Client(), "post", f"{BASE}/{shared.id}/items/", {"name": "Nudeln"}, guest=anna).json()
    foreign = ShoppingListItem.objects.create(shopping_list=shared, name="Reis")

    assert _send(Client(), "delete", f"{BASE}/{shared.id}/items/{own['id']}/", guest=ben).status_code == 403
    assert _send(Client(), "delete", f"{BASE}/{shared.id}/items/{foreign.id}/", guest=anna).status_code == 403
    assert _send(Client(), "delete", f"{BASE}/{shared.id}/items/{own['id']}/", guest=anna).status_code == 200

    detail = _send(Client(), "get", f"{BASE}/{shared.id}/", guest=anna).json()
    assert [i["can_delete"] for i in detail["items"]] == [False]


def test_generated_entries_are_not_deletable_flagged(shared, owner_client):
    item = ShoppingListItem.objects.create(shopping_list=shared, name="Mehl")
    ShoppingListItemSource.objects.create(shopping_list_item=item, recipe_name="Brot", quantity_g=500)

    detail = owner_client.get(f"{BASE}/{shared.id}/").json()

    assert detail["items"][0]["can_delete"] is False


def test_guest_cannot_manage_or_use_member_features(shared):
    token = _join(shared)

    assert _send(Client(), "post", f"{BASE}/{shared.id}/share/", guest=token).status_code == 401
    assert _send(Client(), "patch", f"{BASE}/{shared.id}/", {"name": "Neu"}, guest=token).status_code == 401
    assert _send(Client(), "delete", f"{BASE}/{shared.id}/", guest=token).status_code == 401
    assert _send(Client(), "post", f"{BASE}/{shared.id}/rewe-export-token/", {}, guest=token).status_code == 401


def test_guest_token_does_not_open_another_list(shared, owner):
    other = ShoppingList.objects.create(name="Privat", owner=owner)
    token = _join(shared)

    assert _send(Client(), "get", f"{BASE}/{other.id}/", guest=token).status_code == 404
    assert _send(Client(), "post", f"{BASE}/{other.id}/items/", {"name": "x"}, guest=token).status_code == 404


def test_anonymous_without_token_is_unauthorized_and_garbage_token_not_found(shared):
    assert Client().get(f"{BASE}/{shared.id}/").status_code == 401
    assert _send(Client(), "get", f"{BASE}/{shared.id}/", guest="garbage").status_code == 404
    assert (
        _send(Client(), "get", f"{BASE}/{shared.id}/", guest="00000000-0000-0000-0000-000000000000").status_code == 404
    )


def test_regenerate_and_disable_revoke_guests(shared, owner_client):
    old_link = shared.share_token
    token = _join(shared)

    regenerated = owner_client.post(f"{BASE}/{shared.id}/share/regenerate/").json()
    assert regenerated["share_token"] != str(old_link)
    assert regenerated["guests"] == []
    assert _send(Client(), "get", f"{BASE}/{shared.id}/", guest=token).status_code == 404
    assert Client().get(f"{BASE}/shared/{old_link}/").status_code == 404

    owner_client.delete(f"{BASE}/{shared.id}/share/")
    shared.refresh_from_db()
    assert shared.share_token is None


def test_disable_keeps_entries_but_drops_attribution(shared, owner_client):
    token = _join(shared)
    _send(Client(), "post", f"{BASE}/{shared.id}/items/", {"name": "Brot"}, guest=token)

    owner_client.delete(f"{BASE}/{shared.id}/share/")

    item = ShoppingListItem.objects.get()
    assert item.added_by_guest is None
    assert owner_client.get(f"{BASE}/{shared.id}/").json()["items"][0]["added_by_display_name"] is None


def test_removing_one_guest_keeps_link_for_others(shared, owner_client):
    anna, ben = _join(shared, "Anna"), _join(shared, "Ben")
    anna_id = ShoppingListGuest.objects.get(name="Anna").id

    assert owner_client.delete(f"{BASE}/{shared.id}/guests/{anna_id}/").status_code == 200

    assert _send(Client(), "get", f"{BASE}/{shared.id}/", guest=anna).status_code == 404
    assert _send(Client(), "get", f"{BASE}/{shared.id}/", guest=ben).status_code == 200


def test_returning_guest_keeps_identity_and_can_rename(shared):
    token = _join(shared, "Anna")
    response = _send(Client(), "post", f"{BASE}/shared/{shared.share_token}/join/", {"name": "Anna K."}, guest=token)

    assert response.json()["guest_token"] == token
    assert ShoppingListGuest.objects.count() == 1
    assert ShoppingListGuest.objects.get().name == "Anna K."
    preview = _send(Client(), "get", f"{BASE}/shared/{shared.share_token}/", guest=token).json()
    assert preview["already_member"] is True
    assert preview["guest_name"] == "Anna K."


def test_logged_in_user_joins_as_editor(shared):
    visitor = User.objects.create_user(username="vis", email="vis@example.com", password="x")
    client = Client()
    client.force_login(visitor)

    response = _send(client, "post", f"{BASE}/shared/{shared.share_token}/join/", {})

    assert response.status_code == 200
    assert response.json()["guest_token"] is None
    assert ShoppingListCollaborator.objects.get(user=visitor).role == CollaboratorRole.EDITOR
    assert client.get(f"{BASE}/{shared.id}/").json()["can_edit"] is True


def test_guest_limit(shared, monkeypatch):
    monkeypatch.setattr("shopping.api.MAX_GUESTS_PER_LIST", 2)
    _join(shared, "A")
    _join(shared, "B")

    response = Client().post(
        f"{BASE}/shared/{shared.share_token}/join/", json.dumps({"name": "C"}), content_type="application/json"
    )

    assert response.status_code == 400


def test_pulse_changes_with_any_edit(shared, owner_client):
    token = _join(shared)
    pulse = lambda: _send(Client(), "get", f"{BASE}/{shared.id}/pulse/", guest=token).json()["stamp"]
    before = pulse()

    item = _send(Client(), "post", f"{BASE}/{shared.id}/items/", {"name": "Brot"}, guest=token).json()
    after_add = pulse()
    _send(Client(), "patch", f"{BASE}/{shared.id}/items/{item['id']}/", {"is_checked": True}, guest=token)
    after_check = pulse()
    owner_client.delete(f"{BASE}/{shared.id}/items/{item['id']}/")
    after_delete = pulse()

    # Deleting the only entry returns to the empty-list state; every step differs from its predecessor.
    assert len({before, after_add, after_check}) == 3
    assert after_delete != after_check
    assert Client().get(f"{BASE}/{shared.id}/pulse/").status_code == 401


def test_item_input_is_validated(owner_client, shopping_list):
    items_url = f"{BASE}/{shopping_list.id}/items/"
    created = _send(owner_client, "post", items_url, {"name": "Äpfel"}).json()

    assert _send(owner_client, "post", items_url, {"name": ""}).status_code == 422
    assert _send(owner_client, "post", items_url, {"name": "   "}).status_code == 422
    assert _send(owner_client, "post", items_url, {"name": "x" * 256}).status_code == 422
    assert _send(owner_client, "patch", f"{items_url}{created['id']}/", {"name": None}).status_code == 200
    assert _send(owner_client, "patch", f"{items_url}{created['id']}/", {"name": ""}).status_code == 422
    assert _send(owner_client, "patch", f"{BASE}/{shopping_list.id}/", {"name": None}).status_code == 200
    assert _send(owner_client, "patch", f"{BASE}/{shopping_list.id}/", {"name": ""}).status_code == 422
    assert ShoppingListItem.objects.get(id=created["id"]).name == "Äpfel"


def test_null_is_checked_does_not_uncheck(owner_client, shopping_list):
    item = ShoppingListItem.objects.create(shopping_list=shopping_list, name="Salz", is_checked=True)

    response = _send(
        owner_client, "patch", f"{BASE}/{shopping_list.id}/items/{item.id}/", {"is_checked": None, "note": "fein"}
    )

    assert response.status_code == 200
    item.refresh_from_db()
    assert item.is_checked is True and item.note == "fein"


def _ws_connect(path: str):
    async def connect():
        communicator = WebsocketCommunicator(application, path, headers=[(b"host", b"localhost")])
        connected, code = await communicator.connect()
        await communicator.disconnect()
        return connected, code

    return async_to_sync(connect)()


@pytest.mark.django_db(transaction=True)
def test_guest_websocket_handshake(shopping_list, owner_client):
    owner_client.post(f"{BASE}/{shopping_list.id}/share/")
    shopping_list.refresh_from_db()
    token = _join(shopping_list)
    path = f"/ws/shopping-lists/{shopping_list.id}/"

    assert _ws_connect(f"{path}?guest={token}")[0] is True
    assert _ws_connect(f"{path}?guest=00000000-0000-0000-0000-000000000000") == (False, 4403)
    assert _ws_connect(f"{path}?guest=nonsense") == (False, 4403)

    owner_client.delete(f"{BASE}/{shopping_list.id}/share/")
    assert _ws_connect(f"{path}?guest={token}") == (False, 4403)


def test_detail_stamp_matches_pulse(shared, owner_client):
    detail = owner_client.get(f"{BASE}/{shared.id}/").json()
    pulse = owner_client.get(f"{BASE}/{shared.id}/pulse/").json()

    assert detail["stamp"] == pulse["stamp"]


def test_claim_release_and_conflict(shared, owner_client):
    anna, ben = _join(shared, "Anna"), _join(shared, "Ben")
    item = ShoppingListItem.objects.create(shopping_list=shared, name="Käse")
    url = f"{BASE}/{shared.id}/items/{item.id}/"

    mine = _send(Client(), "patch", url, {"claimed": True}, guest=anna).json()
    assert mine["claimed_by_display_name"] == "Anna"
    assert mine["claimed_by_me"] is True

    # Anna taking it again is harmless; Ben is told who has it.
    assert _send(Client(), "patch", url, {"claimed": True}, guest=anna).status_code == 200
    taken = _send(Client(), "patch", url, {"claimed": True}, guest=ben)
    assert taken.status_code == 409
    assert _send(Client(), "patch", url, {"claimed": False}, guest=ben).status_code == 403

    detail = _send(Client(), "get", f"{BASE}/{shared.id}/", guest=ben).json()
    assert detail["items"][0]["claimed_by_display_name"] == "Anna"
    assert detail["items"][0]["claimed_by_me"] is False

    # The owner may release anyone's claim; afterwards Ben can take it.
    assert owner_client.patch(url, json.dumps({"claimed": False}), content_type="application/json").status_code == 200
    assert _send(Client(), "patch", url, {"claimed": True}, guest=ben).json()["claimed_by_me"] is True
    assert _send(Client(), "patch", url, {"claimed": False}, guest=ben).json()["claimed_by_display_name"] is None
