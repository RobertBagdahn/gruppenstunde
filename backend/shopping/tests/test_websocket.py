"""WebSocket handshake through the full ASGI application (session cookie auth, routing)."""

import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client

from inspi.asgi import application
from shopping.models import CollaboratorRole, ShoppingList, ShoppingListCollaborator, SourceType

User = get_user_model()


def _session_cookie(user) -> bytes:
    client = Client()
    client.force_login(user)
    return f"{settings.SESSION_COOKIE_NAME}={client.cookies[settings.SESSION_COOKIE_NAME].value}".encode()


def _handshake(path: str, cookie: bytes | None) -> tuple[bool, int | None]:
    async def connect() -> tuple[bool, int | None]:
        headers = [(b"host", b"localhost")]
        if cookie:
            headers.append((b"cookie", cookie))
        communicator = WebsocketCommunicator(application, path, headers=headers)
        connected, close_code = await communicator.connect()
        await communicator.disconnect()
        return connected, close_code

    return async_to_sync(connect)()


@pytest.fixture
def owner(db):
    return User.objects.create_user(username="owner", email="owner@example.com", password="test123")


@pytest.fixture
def shopping_list(owner):
    return ShoppingList.objects.create(name="Lagereinkauf", owner=owner, source_type=SourceType.MANUAL)


@pytest.mark.django_db(transaction=True)
def test_owner_handshake_is_accepted(owner, shopping_list):
    connected, _ = _handshake(f"/ws/shopping-lists/{shopping_list.id}/", _session_cookie(owner))

    assert connected


@pytest.mark.django_db(transaction=True)
def test_viewer_handshake_is_accepted(shopping_list):
    viewer = User.objects.create_user(username="viewer", email="viewer@example.com", password="test123")
    ShoppingListCollaborator.objects.create(shopping_list=shopping_list, user=viewer, role=CollaboratorRole.VIEWER)

    connected, _ = _handshake(f"/ws/shopping-lists/{shopping_list.id}/", _session_cookie(viewer))

    assert connected


@pytest.mark.django_db(transaction=True)
def test_unrelated_user_handshake_is_rejected(shopping_list):
    stranger = User.objects.create_user(username="stranger", email="stranger@example.com", password="test123")

    connected, close_code = _handshake(f"/ws/shopping-lists/{shopping_list.id}/", _session_cookie(stranger))

    assert not connected
    assert close_code == 4403


@pytest.mark.django_db(transaction=True)
def test_anonymous_handshake_is_rejected(shopping_list):
    connected, close_code = _handshake(f"/ws/shopping-lists/{shopping_list.id}/", None)

    assert not connected
    assert close_code == 4403
