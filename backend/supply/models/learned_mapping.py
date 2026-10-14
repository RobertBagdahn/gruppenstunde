"""Ingredient choices confirmed in the recipe import review, reused by the matcher."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class LearnedIngredientMapping(models.Model):
    """Normalized import query ("feta-käse") → ingredient a person confirmed for it."""

    query_key = models.CharField(max_length=255, unique=True, verbose_name=_("Suchbegriff (normalisiert)"))
    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        related_name="learned_mappings",
        verbose_name=_("Zutat"),
    )
    confirmations = models.PositiveIntegerField(default=0, verbose_name=_("Bestätigungen"))
    confirmed_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="learned_ingredient_mappings",
        verbose_name=_("Bestätigt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Gelernte Zutaten-Zuordnung")
        verbose_name_plural = _("Gelernte Zutaten-Zuordnungen")
        ordering = ["query_key"]

    def __str__(self) -> str:
        return f"{self.query_key} → {self.ingredient_id}"
