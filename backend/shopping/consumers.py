"""WebSocket consumer for real-time shopping list collaboration."""

from datetime import datetime

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from core.services.user_directory import public_display_name

from .models import ShoppingList, ShoppingListCollaborator


class ShoppingListConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for a single shopping list.

    Handles real-time events: item.checked, item.unchecked, item.added,
    item.removed, item.updated, list.updated.
    """

    async def connect(self) -> None:
        self.shopping_list_id = self.scope["url_route"]["kwargs"]["shopping_list_id"]
        self.group_name = f"shopping_list_{self.shopping_list_id}"

        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close(code=4403)
            return

        # Check access
        has_access = await self._check_access(user)
        if not has_access:
            await self.close(code=4403)
            return

        self.sender_id: int = user.id
        self.sender_display_name: str = await self._display_name(user)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code: int) -> None:
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content: dict, **kwargs) -> None:
        """Handle incoming WebSocket messages from clients.

        Clients send events which are broadcast to all group members.
        The actual data mutation is done via REST API; WebSocket is for
        notification/sync only.
        """
        event_type = content.get("type")
        if not event_type:
            return

        # Broadcast the event to the group
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "shopping_event",
                "event_type": event_type,
                "data": content.get("data", {}),
                "sender": self.sender_display_name,
                "sender_id": self.sender_id,
                "timestamp": datetime.now().isoformat(),
            },
        )

    async def shopping_event(self, event: dict) -> None:
        """Send shopping list event to WebSocket client."""
        await self.send_json(
            {
                "type": event["event_type"],
                "data": event.get("data", {}),
                "sender": event.get("sender", ""),
                "sender_id": event.get("sender_id"),
                "timestamp": event.get("timestamp", ""),
            }
        )

    @database_sync_to_async
    def _display_name(self, user) -> str:
        return public_display_name(user)

    @database_sync_to_async
    def _check_access(self, user) -> bool:
        """Check if the user has access to this shopping list."""
        try:
            shopping_list = ShoppingList.objects.get(id=self.shopping_list_id)
        except ShoppingList.DoesNotExist:
            return False

        if shopping_list.owner_id == user.id:
            return True

        return ShoppingListCollaborator.objects.filter(shopping_list=shopping_list, user=user).exists()
