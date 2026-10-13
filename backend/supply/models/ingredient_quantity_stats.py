"""Typical grams per person of an ingredient across recipes (outlier baseline)."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class IngredientQuantityStats(models.Model):
    """Median and 90th percentile of grams per person over approved recipes.

    ``by_recipe_type`` holds the same values per recipe type:
    ``{"warm_meal": {"sample_count": 12, "median_g": 40.0, "p90_g": 90.0}}``.
    Recalculated by ``recalculate_ingredient_quantity_stats``.
    """

    ingredient = models.OneToOneField(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        related_name="quantity_stats",
        verbose_name=_("Zutat"),
    )
    sample_count = models.PositiveIntegerField(default=0, verbose_name=_("Anzahl Rezepte"))
    median_g = models.FloatField(null=True, blank=True, verbose_name=_("Median (g pro Person)"))
    p90_g = models.FloatField(null=True, blank=True, verbose_name=_("90-%-Wert (g pro Person)"))
    by_recipe_type = models.JSONField(default=dict, blank=True, verbose_name=_("Je Rezepttyp"))
    calculated_at = models.DateTimeField(auto_now=True, verbose_name=_("Berechnet am"))

    class Meta:
        verbose_name = _("Mengenstatistik einer Zutat")
        verbose_name_plural = _("Mengenstatistiken der Zutaten")

    def __str__(self) -> str:
        return f"{self.ingredient_id}: {self.median_g} g (n={self.sample_count})"
