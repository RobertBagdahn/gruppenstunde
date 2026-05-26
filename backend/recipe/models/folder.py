"""RecipeFolder model for organizing personal recipes."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class RecipeFolder(models.Model):
    """Folder for organizing personal recipes."""

    name = models.CharField(max_length=200, verbose_name=_("Name"))
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipe_folders",
        verbose_name=_("Besitzer"),
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
        verbose_name=_("Überordner"),
    )
    sort_order = models.IntegerField(default=0, verbose_name=_("Sortierung"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Rezept-Ordner")
        verbose_name_plural = _("Rezept-Ordner")
        ordering = ["sort_order", "name"]
        unique_together = [("owner", "name", "parent")]

    def __str__(self) -> str:
        return self.name
