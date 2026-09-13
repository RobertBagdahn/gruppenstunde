"""TimelineService — centralized audit logging for event actions."""

from __future__ import annotations

from typing import Any

from django.contrib.auth.models import User

from event.models import Event, Participant
from event.models.timeline import TimelineEntry


class TimelineService:
    """Provides a single entry point for logging event timeline entries."""

    @staticmethod
    def log(
        event: Event,
        action_type: str,
        description: str = "",
        participant: Participant | None = None,
        user: User | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> TimelineEntry:
        """Create a timeline entry for the given event.

        Args:
            event: The Event instance.
            action_type: One of TimelineActionChoices values.
            description: Human-readable description of the action.
            participant: Optional Participant involved.
            user: Optional User who performed the action.
            metadata: Optional JSON-serializable dict with extra data.

        Returns:
            The created TimelineEntry instance.
        """
        return TimelineEntry.objects.create(
            event=event,
            action_type=action_type,
            description=description,
            participant=participant,
            user=user,
            metadata=metadata or {},
        )
