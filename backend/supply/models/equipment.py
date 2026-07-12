"""Equipment model — kitchen tools and appliances for recipes."""

from django.db import models
from django.utils.text import slugify


class Equipment(models.Model):
    """Kitchen equipment / appliance (Topf, Pfanne, Ofen, etc.)."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    sort_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Equipment"
        verbose_name_plural = "Equipment"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
