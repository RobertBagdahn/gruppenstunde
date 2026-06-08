"""Data quality models: DuplicateDismissal."""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class DuplicateDismissal(models.Model):
    """Tracks dismissed false-positive duplicate pairs."""

    source_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name="dup_source")
    source_object_id = models.PositiveIntegerField()
    source_object = GenericForeignKey("source_content_type", "source_object_id")

    target_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name="dup_target")
    target_object_id = models.PositiveIntegerField()
    target_object = GenericForeignKey("target_content_type", "target_object_id")

    dismissed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    dismissed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Duplikat-Ausblendung"
        verbose_name_plural = "Duplikat-Ausblendungen"
        unique_together = [
            ("source_content_type", "source_object_id", "target_content_type", "target_object_id"),
        ]
        indexes = [
            models.Index(fields=["source_content_type", "source_object_id"]),
        ]

    def __str__(self):
        return f"Dismissed duplicate: {self.source_object} ↔ {self.target_object}"
