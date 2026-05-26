"""Shopping app privacy data collector."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model

from profiles.services.privacy import PrivacyDataCollector

User = get_user_model()


class ShoppingPrivacyCollector(PrivacyDataCollector):
    """Collects and anonymizes ShoppingList and ShoppingListCollaborator data."""

    def collect(self, user: User) -> dict[str, Any]:
        from shopping.models import ShoppingList, ShoppingListCollaborator

        shopping_lists = list(ShoppingList.objects.filter(owner=user).values("id", "name", "source_type", "created_at"))
        for s in shopping_lists:
            s["created_at"] = str(s["created_at"])

        collaborations = list(
            ShoppingListCollaborator.objects.filter(user=user)
            .select_related("shopping_list")
            .values("shopping_list__name", "role", "created_at")
        )
        for c in collaborations:
            c["created_at"] = str(c["created_at"])

        items = [
            *[{"type": "owned", **s} for s in shopping_lists],
            *[{"type": "collaboration", **c} for c in collaborations],
        ]

        return {
            "shopping_lists": {"count": len(items), "items": items},
        }

    def anonymize(self, user: User) -> None:
        from shopping.models import ShoppingList, ShoppingListCollaborator

        ShoppingList.objects.filter(owner=user).delete()
        ShoppingListCollaborator.objects.filter(user=user).delete()
