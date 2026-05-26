"""Privacy service: orchestrates data collection, export, and anonymization across apps."""

from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction

logger = logging.getLogger(__name__)
User = get_user_model()


class PrivacyDataCollector(ABC):
    """Base class for app-specific privacy data collectors.

    Each Django app registers a subclass that knows how to collect
    and anonymize personal data within that app's domain.
    """

    @abstractmethod
    def collect(self, user: User) -> dict[str, Any]:
        """Collect all personal data for the given user.

        Returns a dict with category keys and their data.
        """

    @abstractmethod
    def anonymize(self, user: User) -> None:
        """Anonymize or delete all personal data for the given user."""


class PrivacyService:
    """Central orchestrator for GDPR privacy operations."""

    _collectors: list[PrivacyDataCollector] = []

    @classmethod
    def register(cls, collector: PrivacyDataCollector) -> None:
        """Register a privacy data collector."""
        cls._collectors.append(collector)

    @classmethod
    def clear_collectors(cls) -> None:
        """Clear all registered collectors (useful for tests)."""
        cls._collectors = []

    @classmethod
    def collect_user_data(cls, user: User) -> dict[str, Any]:
        """Collect all personal data across all registered apps."""
        result: dict[str, Any] = {}
        for collector in cls._collectors:
            data = collector.collect(user)
            result.update(data)
        return result

    @classmethod
    def export_user_data(cls, user: User) -> dict[str, Any]:
        """Build a complete data export for the user (GDPR Art. 20)."""
        from datetime import datetime, timezone

        data = cls.collect_user_data(user)
        return {
            "metadata": {
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "user_email": user.email,
                "platform": "Inspi (gruppenstunde.de)",
                "data_categories": list(data.keys()),
            },
            **data,
        }

    @classmethod
    @transaction.atomic
    def anonymize_user(cls, user: User) -> None:
        """Anonymize all personal data and deactivate the user account.

        Runs everything in a single DB transaction for consistency.
        """
        # Let each collector anonymize its own data first
        for collector in cls._collectors:
            collector.anonymize(user)

        # Anonymize the User model itself
        anon_id = uuid.uuid4().hex[:12]
        user.email = f"deleted-{anon_id}@anon.local"
        user.username = f"deleted-{anon_id}"
        user.first_name = ""
        user.last_name = ""
        user.is_active = False
        user.set_unusable_password()
        user.save()


class ProfilePrivacyCollector(PrivacyDataCollector):
    """Collects and anonymizes profile, preference, and group membership data."""

    def collect(self, user: User) -> dict[str, Any]:
        from profiles.models import GroupMembership, UserProfile

        profile_data: dict[str, Any] = {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

        try:
            profile = user.profile
            profile_data.update(
                {
                    "scout_name": profile.scout_name,
                    "gender": profile.gender,
                    "birthday": str(profile.birthday) if profile.birthday else None,
                    "about_me": profile.about_me,
                    "profile_picture_url": profile.profile_picture.url if profile.profile_picture else None,
                    "nutritional_tags": list(profile.nutritional_tags.values_list("name", flat=True)),
                    "is_public": profile.is_public,
                }
            )
        except UserProfile.DoesNotExist:
            pass

        preferences: dict[str, Any] | None = None
        try:
            pref = user.user_preference
            preferences = {
                "preferred_scout_level": str(pref.preferred_scout_level) if pref.preferred_scout_level else None,
                "preferred_group_size_min": pref.preferred_group_size_min,
                "preferred_group_size_max": pref.preferred_group_size_max,
                "preferred_difficulty": pref.preferred_difficulty,
                "preferred_location": pref.preferred_location,
            }
        except Exception:
            pass

        memberships = list(
            GroupMembership.objects.filter(user=user, is_active=True)
            .select_related("group")
            .values("group__name", "role", "date_joined")
        )
        group_items = [
            {
                "group_name": m["group__name"],
                "role": m["role"],
                "date_joined": str(m["date_joined"]),
            }
            for m in memberships
        ]

        return {
            "profile": profile_data,
            "preferences": preferences,
            "groups": {"count": len(group_items), "items": group_items},
        }

    def anonymize(self, user: User) -> None:
        from profiles.models import GroupJoinRequest, GroupMembership, UserProfile

        try:
            profile = user.profile
            # Delete profile picture from storage
            if profile.profile_picture:
                try:
                    profile.profile_picture.delete(save=False)
                except Exception:
                    logger.warning("Failed to delete profile picture for user %s", user.pk)

            profile.scout_name = ""
            profile.first_name = ""
            profile.last_name = ""
            profile.gender = "no_answer"
            profile.birthday = None
            profile.about_me = ""
            profile.profile_picture = None
            profile.is_public = False
            profile.nutritional_tags.clear()
            profile.save()
        except UserProfile.DoesNotExist:
            pass

        try:
            pref = user.user_preference
            pref.preferred_scout_level = None
            pref.preferred_group_size_min = None
            pref.preferred_group_size_max = None
            pref.preferred_difficulty = ""
            pref.preferred_location = ""
            pref.save()
        except Exception:
            pass

        GroupMembership.objects.filter(user=user).delete()
        GroupJoinRequest.objects.filter(user=user).delete()
