"""
Blog model — a concrete content type for knowledge articles and guides.

Inherits all shared fields from Content (title, slug, summary, description,
difficulty, costs, status, tags, scout_levels, authors, etc.)
and adds blog-specific fields.
"""

from django.contrib.postgres.indexes import GinIndex
from django.db import models

from content.models import Content

from .choices import BlogType


class Blog(Content):
    """
    A knowledge article / blog post.

    Replaces the old Idea model with idea_type='knowledge'.
    Blog posts are typically longer, have no material list,
    and include a table of contents.
    """

    blog_type = models.CharField(
        max_length=20,
        choices=BlogType.choices,
        default=BlogType.GUIDE,
    )
    reading_time_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Estimated reading time in minutes (auto-calculated).",
    )
    show_table_of_contents = models.BooleanField(
        default=True,
        help_text="Whether to show an auto-generated table of contents.",
    )

    class Meta(Content.Meta):
        verbose_name = "Blog"
        verbose_name_plural = "Blogs"
        indexes = [
            GinIndex(fields=["search_vector"], name="blog_search_idx"),
            models.Index(fields=["status", "created_at"], name="blog_status_created_idx"),
            models.Index(fields=["like_score"], name="blog_like_score_idx"),
            models.Index(fields=["view_count"], name="blog_view_count_idx"),
            models.Index(fields=["blog_type"], name="blog_type_idx"),
        ]

    def save(self, *args, **kwargs):
        """Auto-calculate reading time from description word count."""
        if self.description:
            word_count = len(self.description.split())
            self.reading_time_minutes = max(1, round(word_count / 200))
        super().save(*args, **kwargs)
