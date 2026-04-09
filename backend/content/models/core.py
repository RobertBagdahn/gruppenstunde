"""
Core content models: SoftDeleteModel and Content abstract base.
"""

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from ..choices import (
    ContentStatus,
    CostsRatingChoices,
    DifficultyChoices,
    ExecutionTimeChoices,
    PreparationTimeChoices,
)


# ---------------------------------------------------------------------------
# Soft Delete Infrastructure
# ---------------------------------------------------------------------------


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that excludes soft-deleted objects by default."""

    def delete(self):
        """Soft delete all objects in the queryset."""
        return self.update(deleted_at=timezone.now())

    def hard_delete(self):
        """Permanently delete all objects in the queryset."""
        return super().delete()

    def alive(self):
        """Return only non-deleted objects."""
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        """Return only soft-deleted objects."""
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted objects by default."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()


class AllObjectsManager(models.Manager):
    """Manager that includes soft-deleted objects."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    """Abstract base model with soft delete support."""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    def soft_delete(self):
        """Mark this object as deleted."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def restore(self):
        """Restore a soft-deleted object."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    class Meta:
        abstract = True


# ---------------------------------------------------------------------------
# Content Abstract Base
# ---------------------------------------------------------------------------


class Content(SoftDeleteModel):
    """
    Abstract base model for all content types.

    Inherits from SoftDeleteModel. Provides shared fields for:
    - Metadata (title, slug, summary, description)
    - Ratings & filters (difficulty, costs, execution_time, preparation_time)
    - Status & workflow (status with approval flow)
    - Media (image)
    - Search & AI (search_vector, embedding)
    - Analytics (view_count, like_score)
    - Relations (authors M2M, tags M2M, scout_levels M2M)
    - Timestamps (created_at, updated_at, created_by, updated_by)

    Each concrete subclass gets its own database table with all fields.
    """

    # --- Metadata ---
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    summary = models.TextField(blank=True, default="")
    summary_long = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")

    # --- Ratings & Filters ---
    costs_rating = models.CharField(
        max_length=20,
        choices=CostsRatingChoices.choices,
        default=CostsRatingChoices.FREE,
    )
    execution_time = models.CharField(
        max_length=20,
        choices=ExecutionTimeChoices.choices,
        default=ExecutionTimeChoices.LESS_30,
    )
    preparation_time = models.CharField(
        max_length=20,
        choices=PreparationTimeChoices.choices,
        default=PreparationTimeChoices.NONE,
    )
    difficulty = models.CharField(
        max_length=20,
        choices=DifficultyChoices.choices,
        default=DifficultyChoices.EASY,
    )

    # --- Status & Workflow ---
    status = models.CharField(
        max_length=20,
        choices=ContentStatus.choices,
        default=ContentStatus.DRAFT,
    )

    # --- Media ---
    image = models.ImageField(upload_to="content/", blank=True, null=True)

    # --- Search & AI ---
    search_vector = SearchVectorField(null=True, blank=True)
    # Embedding stored as binary for now.
    # Will be migrated to pgvector VectorField(dimensions=768) in Slice 8.
    embedding = models.BinaryField(null=True, blank=True)
    embedding_updated_at = models.DateTimeField(null=True, blank=True)

    # --- Analytics ---
    view_count = models.IntegerField(default=0)
    like_score = models.IntegerField(default=0)

    # --- Relations ---
    tags = models.ManyToManyField(
        "content.Tag",
        blank=True,
        related_name="%(class)s_set",
    )
    scout_levels = models.ManyToManyField(
        "content.ScoutLevel",
        blank=True,
        related_name="%(class)s_set",
    )
    authors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="authored_%(class)s_set",
    )

    # --- Timestamps & Audit ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        """Auto-generate slug from title with collision handling."""
        if not self.slug:
            base_slug = slugify(self.title)
            if not base_slug:
                base_slug = "untitled"
            slug = base_slug
            counter = 1
            # Check for collision in the concrete model's table
            model_class = type(self)
            while model_class.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
