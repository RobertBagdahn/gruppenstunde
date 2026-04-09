"""WebSocket URL routing for the Shopping app."""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/shopping-lists/(?P<shopping_list_id>\d+)/$",
        consumers.ShoppingListConsumer.as_asgi(),
    ),
]
