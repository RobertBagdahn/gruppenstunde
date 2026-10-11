"""Privacy tests: shopping list responses and websocket events never expose e-mail addresses."""

import json

import pytest
from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import Client

from profiles.tests import make_user_profile
from shopping.models import CollaboratorRole, ShoppingList, ShoppingListCollaborator, ShoppingListItem, SourceType
from shopping.routing import websocket_urlpatterns

User = get_user_model()

OWNER_EMAIL = "owner.secret@example.com"
COLLABORATOR_EMAIL = "collab.secret@example.com"


def _assert_no_email(payload: str) -> None:
    assert OWNER_EMAIL not in payload
    assert COLLABORATOR_EMAIL not in payload
    assert "@" not in payload


@pytest.fixture
def owner(db):
    user = User.objects.create_user(username=OWNER_EMAIL, email=OWNER_EMAIL, password="test123")
    make_user_profile(user=user, scout_name="Eule")
    return user


@pytest.fixture
def collaborator(db):
    # No profile and no name: the fallback must still not reveal the e-mail.
    return User.objects.create_user(username=COLLABORATOR_EMAIL, email=COLLABORATOR_EMAIL, password="test123")


@pytest.fixture
def shared_list(owner, collaborator):
    shopping_list = ShoppingList.objects.create(name="Lagereinkauf", owner=owner, source_type=SourceType.MANUAL)
    ShoppingListCollaborator.objects.create(
        shopping_list=shopping_list, user=collaborator, role=CollaboratorRole.EDITOR
    )
    ShoppingListItem.objects.create(
        shopping_list=shopping_list, name="Mehl", quantity_g=500, unit="g", is_checked=True, checked_by=collaborator
    )
    return shopping_list


@pytest.fixture
def collaborator_client(collaborator) -> Client:
    client = Client()
    client.force_login(collaborator)
    return client


@pytest.mark.django_db
class TestShoppingListPrivacy:
    def test_list_shows_owner_display_name_without_email(self, collaborator_client, shared_list):
        res = collaborator_client.get("/api/shopping-lists/")

        assert res.status_code == 200
        assert res.json()["items"][0]["owner_display_name"] == "Eule"
        _assert_no_email(res.content.decode())

    def test_detail_shows_display_names_without_email(self, collaborator_client, shared_list, collaborator):
        res = collaborator_client.get(f"/api/shopping-lists/{shared_list.id}/")

        assert res.status_code == 200
        data = res.json()
        assert data["owner_display_name"] == "Eule"
        assert data["collaborators"][0]["display_name"] == f"Inspi-Nutzer #{collaborator.id}"
        assert data["items"][0]["checked_by_display_name"] == f"Inspi-Nutzer #{collaborator.id}"
        _assert_no_email(res.content.decode())

    def test_item_update_response_has_no_email(self, collaborator_client, shared_list):
        item = shared_list.items.first()
        res = collaborator_client.patch(
            f"/api/shopping-lists/{shared_list.id}/items/{item.id}/",
            data=json.dumps({"is_checked": True}),
            content_type="application/json",
        )

        assert res.status_code == 200
        _assert_no_email(res.content.decode())

    def test_user_search_by_exact_email_returns_display_name_only(self, collaborator_client, owner):
        res = collaborator_client.get("/api/shopping-lists/users/", {"q": OWNER_EMAIL.upper()})

        assert res.status_code == 200
        assert res.json()["items"] == [{"id": owner.id, "display_name": "Eule"}]
        _assert_no_email(res.content.decode())

    def test_user_search_by_name_has_no_email(self, collaborator_client, owner):
        res = collaborator_client.get("/api/shopping-lists/users/", {"q": "eul"})

        assert res.status_code == 200
        assert [u["id"] for u in res.json()["items"]] == [owner.id]
        _assert_no_email(res.content.decode())


@pytest.mark.django_db(transaction=True)
def test_websocket_events_carry_display_name_not_email(shared_list, owner, collaborator):
    async def exchange() -> dict:
        sender = WebsocketCommunicator(URLRouter(websocket_urlpatterns), f"/ws/shopping-lists/{shared_list.id}/")
        sender.scope["user"] = collaborator
        receiver = WebsocketCommunicator(URLRouter(websocket_urlpatterns), f"/ws/shopping-lists/{shared_list.id}/")
        receiver.scope["user"] = owner
        sender_connected, _ = await sender.connect()
        receiver_connected, _ = await receiver.connect()
        assert sender_connected and receiver_connected
        try:
            await sender.send_json_to({"type": "item.checked", "data": {"item_id": 1}})
            return await receiver.receive_json_from(timeout=2)
        finally:
            await sender.disconnect()
            await receiver.disconnect()

    event = async_to_sync(exchange)()

    assert event["type"] == "item.checked"
    assert event["sender"] == f"Inspi-Nutzer #{collaborator.id}"
    assert event["sender_id"] == collaborator.id
    _assert_no_email(json.dumps(event))
