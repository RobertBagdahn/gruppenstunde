"""
Tag and ScoutLevel models for content classification.
"""

import uuid

from django.conf import settings
from django.db import models


class Tag(models.Model):
    """Hierarchical content tag. Used by all content types via M2M."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=120)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    icon = models.CharField(max_length=50, blank=True, default="")
    group = models.CharField(max_length=50, default="general", blank=True)
    sort_order = models.IntegerField(default=0)
    is_approved = models.BooleanField(default=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name

    def get_descendants(self) -> models.QuerySet:
        """Return all descendant tags (recursive)."""
        descendants = Tag.objects.filter(parent=self)
        for child in Tag.objects.filter(parent=self):
            descendants = descendants | child.get_descendants()
        return descendants

    def get_ancestor_ids(self) -> list:
        """Return list of ancestor tag IDs (from root to parent)."""
        ancestors: list = []
        current = self.parent
        while current:
            ancestors.insert(0, str(current.id))
            current = current.parent
        return ancestors


class ScoutLevel(models.Model):
    """Scout age group / level. Used by all content types via M2M."""

    name = models.CharField(max_length=100)
    sorting = models.IntegerField(default=0)
    icon = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        ordering = ["sorting"]

    def __str__(self) -> str:
        return self.name


class TagSuggestion(models.Model):
    """User-suggested tag, pending admin approval."""

    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        Tag,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="suggestions",
    )
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="content_tag_suggestions",
    )
    is_processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name
