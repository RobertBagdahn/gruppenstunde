"""
Content linking models: ContentLink and EmbeddingFeedback.
"""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from ..choices import EmbeddingFeedbackType, LinkType


class ContentLink(models.Model):
    """
    Link between any two content items. Uses dual GenericForeignKey.

    Supports manual links, embedding-based recommendations, and AI suggestions.
    Admins can reject inappropriate recommendations.
    """

    # Source content
    source_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="outgoing_links",
    )
    source_object_id = models.PositiveIntegerField()
    source = GenericForeignKey("source_content_type", "source_object_id")

    # Target content
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="incoming_links",
    )
    target_object_id = models.PositiveIntegerField()
    target = GenericForeignKey("target_content_type", "target_object_id")

    # Link metadata
    link_type = models.CharField(
        max_length=20,
        choices=LinkType.choices,
        default=LinkType.MANUAL,
    )
    relevance_score = models.FloatField(null=True, blank=True)
    is_rejected = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_content_links",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-relevance_score", "-created_at"]
        indexes = [
            models.Index(
                fields=["source_content_type", "source_object_id"],
                name="contentlink_src_ct_oid_idx",
            ),
            models.Index(
                fields=["target_content_type", "target_object_id"],
                name="contentlink_tgt_ct_oid_idx",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.link_type}: {self.source_content_type} #{self.source_object_id} "
            f"→ {self.target_content_type} #{self.target_object_id}"
        )


class EmbeddingFeedback(models.Model):
    """Feedback on an embedding-based recommendation (ContentLink)."""

    content_link = models.ForeignKey(
        ContentLink,
        on_delete=models.CASCADE,
        related_name="feedback",
    )
    feedback_type = models.CharField(
        max_length=20,
        choices=EmbeddingFeedbackType.choices,
    )
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="embedding_feedback",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.feedback_type} on link #{self.content_link_id}"
