"""PackingList app privacy data collector."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model

from profiles.services.privacy import PrivacyDataCollector

User = get_user_model()


class PackingListPrivacyCollector(PrivacyDataCollector):
    """Collects and anonymizes PackingList data."""

    def collect(self, user: User) -> dict[str, Any]:
        from packinglist.models import PackingList

        packing_lists = list(
            PackingList.objects.filter(owner=user).values("id", "title", "description", "is_template", "created_at")
        )
        for p in packing_lists:
            p["created_at"] = str(p["created_at"])

        return {
            "packing_lists": {"count": len(packing_lists), "items": packing_lists},
        }

    def anonymize(self, user: User) -> None:
        from packinglist.models import PackingList

        PackingList.objects.filter(owner=user).delete()
