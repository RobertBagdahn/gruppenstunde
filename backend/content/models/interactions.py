"""
Content interaction models: Comments, Emotions, Views.
"""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from ..choices import CommentStatus, EmotionType


class ContentComment(models.Model):
    """
    Comment on any content type. Uses GenericForeignKey for polymorphism.

    Supports nested replies via self-referential parent FK.
    Anonymous comments require admin moderation (status=pending).
    """

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="content_comments",
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    text = models.TextField()
    author_name = models.CharField(max_length=100, blank=True, default="")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="content_comments",
    )
    status = models.CharField(
        max_length=20,
        choices=CommentStatus.choices,
        default=CommentStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["content_type", "object_id"],
                name="contentcomment_ct_oid_idx",
            ),
        ]

    def __str__(self) -> str:
        author = self.user.email if self.user else self.author_name
        return f"Comment by {author} on {self.content_type} #{self.object_id}"


class ContentEmotion(models.Model):
    """
    Emotion/reaction on any content type. Uses GenericForeignKey.

    Each user (or anonymous session) can have one emotion per content item.
    """

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="content_emotions",
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    emotion_type = models.CharField(max_length=20, choices=EmotionType.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="content_emotions",
    )
    session_key = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["content_type", "object_id"],
                name="contentemotion_ct_oid_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.emotion_type} on {self.content_type} #{self.object_id}"


class ContentView(models.Model):
    """
    View tracking for any content type. Uses GenericForeignKey.

    GDPR-compliant: stores hashed IP, no raw IPs.
    Bot-free: record_view in content.api.helpers filters bots by user-agent.
    """

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="content_views",
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    session_key = models.CharField(max_length=40, db_index=True)
    ip_hash = models.CharField(max_length=64)
    user_agent = models.CharField(max_length=255)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="content_views",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["content_type", "object_id"],
                name="contentview_ct_oid_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"View on {self.content_type} #{self.object_id} at {self.created_at}"

    @staticmethod
    def hash_ip(ip: str) -> str:
        """Hash an IP address for GDPR-compliant storage."""
        import hashlib

        return hashlib.sha256(ip.encode()).hexdigest()
