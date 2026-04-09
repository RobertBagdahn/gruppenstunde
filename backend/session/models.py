"""
GroupSession model — a concrete content type for scout group sessions.

Inherits all shared fields from Content (title, slug, summary, description,
difficulty, costs, status, tags, scout_levels, authors, etc.)
and adds session-specific fields.
"""

from django.contrib.postgres.indexes import GinIndex
from django.db import models

from content.models import Content

from .choices import LocationType, SessionType


class GroupSession(Content):
    """
    A scout group session idea — the primary content type.

    Replaces the old Idea model with idea_type='idea'.
    Includes session-specific fields for categorization and planning.
    """

    session_type = models.CharField(
        max_length=20,
        choices=SessionType.choices,
        default=SessionType.SCOUT_SKILLS,
    )
    min_participants = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Minimum number of participants.",
    )
    max_participants = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of participants.",
    )
    location_type = models.CharField(
        max_length=20,
        choices=LocationType.choices,
        default=LocationType.BOTH,
    )

    class Meta(Content.Meta):
        verbose_name = "Gruppenstunde"
        verbose_name_plural = "Gruppenstunden"
        indexes = [
            GinIndex(fields=["search_vector"], name="session_search_idx"),
            models.Index(fields=["status", "created_at"], name="session_status_created_idx"),
            models.Index(fields=["like_score"], name="session_like_score_idx"),
            models.Index(fields=["view_count"], name="session_view_count_idx"),
        ]
