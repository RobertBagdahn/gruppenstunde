"""
Content approval and featured content models.
"""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from ..choices import ApprovalAction


class ApprovalLog(models.Model):
    """Audit trail for content approval workflow actions."""

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="approval_logs",
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    action = models.CharField(max_length=20, choices=ApprovalAction.choices)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approval_actions",
    )
    reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["content_type", "object_id"],
                name="approvallog_ct_oid_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} on {self.content_type} #{self.object_id}"


class FeaturedContent(models.Model):
    """
    Featured content item (replaces IdeaOfTheWeek).

    Can feature any content type for a date range.
    """

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="featured_entries",
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    featured_from = models.DateField()
    featured_until = models.DateField()
    reason = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="featured_content",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-featured_from"]
        indexes = [
            models.Index(
                fields=["content_type", "object_id"],
                name="featuredcontent_ct_oid_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"Featured {self.content_type} #{self.object_id} ({self.featured_from} – {self.featured_until})"
