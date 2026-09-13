"""PackingList app privacy data collector."""

from __future__ import annotations

from typing import Any, cast

from django.contrib.auth.models import User

from profiles.services.privacy import PrivacyDataCollector


class PackingListPrivacyCollector(PrivacyDataCollector):
    """Collects and anonymizes PackingList data."""

    def collect(self, user: User) -> dict[str, Any]:
        from packinglist.models import PackingList

        packing_lists = list(
            PackingList.objects.filter(owner=user).values("id", "title", "description", "is_template", "created_at")
        )
        for p in packing_lists:
            p_any = cast(dict[str, Any], p)
            p_any["created_at"] = str(p_any["created_at"])

        return {
            "packing_lists": {"count": len(packing_lists), "items": packing_lists},
        }

    def anonymize(self, user: User) -> None:
        from packinglist.models import PackingList

        PackingList.objects.filter(owner=user).delete()
