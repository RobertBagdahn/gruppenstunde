"""
Game model — a concrete content type for scout games.

Inherits all shared fields from Content (title, slug, summary, description,
difficulty, costs, status, tags, scout_levels, authors, etc.)
and adds game-specific fields.
"""

from django.contrib.postgres.indexes import GinIndex
from django.db import models

from content.models import Content

from .choices import GameType, PlayArea


class Game(Content):
    """
    A scout game — games, icebreakers, cooperation challenges etc.

    Includes game-specific fields for player counts, area requirements,
    duration, and detailed rules.
    """

    game_type = models.CharField(
        max_length=20,
        choices=GameType.choices,
        default=GameType.GROUP_GAME,
    )
    min_players = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Minimum number of players.",
    )
    max_players = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of players.",
    )
    play_area = models.CharField(
        max_length=20,
        choices=PlayArea.choices,
        default=PlayArea.ANY,
    )
    game_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Estimated game duration in minutes.",
    )
    rules = models.TextField(
        blank=True,
        default="",
        help_text="Detailed game rules (Markdown).",
    )

    class Meta(Content.Meta):
        verbose_name = "Spiel"
        verbose_name_plural = "Spiele"
        indexes = [
            GinIndex(fields=["search_vector"], name="game_search_idx"),
            models.Index(fields=["status", "created_at"], name="game_status_created_idx"),
            models.Index(fields=["like_score"], name="game_like_score_idx"),
            models.Index(fields=["view_count"], name="game_view_count_idx"),
        ]
