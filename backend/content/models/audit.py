"""Change audit log model for tracking field-level changes."""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class ChangeAuditLog(models.Model):
    """Field-level change log for Ingredients, Recipes, and other models."""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    field_name = models.CharField(max_length=100)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Änderungseintrag"
        verbose_name_plural = "Änderungseinträge"
        ordering = ["-changed_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["changed_at"]),
        ]

    def __str__(self):
        return f"{self.content_type} #{self.object_id}: {self.field_name} changed at {self.changed_at}"


class StaffFoodAccessLog(models.Model):
    """Short-lived audit record for Staff access to private Food data."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    resource_type = models.CharField(max_length=50)
    object_id = models.PositiveIntegerField()
    endpoint = models.CharField(max_length=255)
    success = models.BooleanField(default=True)
    accessed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["resource_type", "object_id"]),
            models.Index(fields=["user", "accessed_at"]),
        ]

    def __str__(self) -> str:
        return f"Staff access {self.resource_type} #{self.object_id} via {self.endpoint}"
