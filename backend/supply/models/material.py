"""Material models — abstract Supply base, Material, ContentMaterialItem."""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.text import slugify

from content.models import SoftDeleteModel

from ..choices import MaterialCategory, MaterialQuantityType


class Supply(SoftDeleteModel):
    """
    Abstract base model for all supply types (Material).

    Inherits SoftDeleteModel for soft delete support.
    Each concrete subclass gets its own database table.
    """

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, default="")
    image = models.ImageField(upload_to="supplies/", blank=True, null=True)

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
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        """Auto-generate slug from name with collision handling."""
        if not self.slug:
            base_slug = slugify(self.name)
            if not base_slug:
                base_slug = "item"
            slug = base_slug
            counter = 1
            model_class = type(self)
            while model_class.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Material(Supply):
    """
    Tools and equipment: knife, cutting board, oven, paper, pens, etc.

    Replaces the old MaterialName model from the idea app.
    """

    material_category = models.CharField(
        max_length=20,
        choices=MaterialCategory.choices,
        default=MaterialCategory.OTHER,
    )
    is_consumable = models.BooleanField(
        default=False,
        help_text="True if the material is consumed during use (e.g., paper, glue).",
    )
    purchase_links = models.JSONField(
        default=list,
        blank=True,
        help_text='List of purchase links: [{"url": "...", "shop_name": "...", "price": 9.99}]',
    )

    class Meta(Supply.Meta):
        verbose_name = "Material"
        verbose_name_plural = "Materialien"


class ContentMaterialItem(models.Model):
    """
    Links a Material to any Content type (GroupSession, Game, Recipe, etc.)
    via GenericForeignKey. Tracks quantity and whether it's per-person or total.
    """

    # Content reference (GenericFK)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="material_items",
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    # Material reference
    material = models.ForeignKey(
        Material,
        on_delete=models.CASCADE,
        related_name="content_usages",
    )

    # Quantity
    quantity = models.CharField(max_length=50, blank=True, default="")
    quantity_type = models.CharField(
        max_length=20,
        choices=MaterialQuantityType.choices,
        default=MaterialQuantityType.ONCE,
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]
        indexes = [
            models.Index(
                fields=["content_type", "object_id"],
                name="contentmaterialitem_ct_oid_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.quantity} {self.material.name}"
