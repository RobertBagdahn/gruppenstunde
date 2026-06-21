"""RecipeTypeStats model — cached category aggregation for benchmarking."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class RecipeTypeStats(models.Model):
    """Cached statistics for a recipe type category.

    Aggregated from all published recipes of the same recipe_type.
    Recalculated via signal on Recipe save/delete.
    """

    recipe_type = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_("Rezepttyp"),
        help_text=_("Einer der RecipeTypeChoices"),
    )
    count = models.IntegerField(
        default=0,
        verbose_name=_("Anzahl Rezepte"),
    )

    # Price per portion stats
    price_min = models.FloatField(null=True, blank=True)
    price_max = models.FloatField(null=True, blank=True)
    price_avg = models.FloatField(null=True, blank=True)
    price_median = models.FloatField(null=True, blank=True)

    # Energy per portion stats (kcal)
    energy_min = models.FloatField(null=True, blank=True)
    energy_max = models.FloatField(null=True, blank=True)
    energy_avg = models.FloatField(null=True, blank=True)
    energy_median = models.FloatField(null=True, blank=True)

    # Macro averages per portion
    protein_avg = models.FloatField(null=True, blank=True)
    fat_avg = models.FloatField(null=True, blank=True)
    carbs_avg = models.FloatField(null=True, blank=True)

    # Weight per portion stats (grams)
    weight_min = models.FloatField(null=True, blank=True)
    weight_max = models.FloatField(null=True, blank=True)
    weight_avg = models.FloatField(null=True, blank=True)
    weight_median = models.FloatField(null=True, blank=True)

    # Nutri-Score distribution
    nutri_score_dist = models.JSONField(
        default=dict, blank=True,
        verbose_name=_("Nutri-Score Verteilung"),
        help_text=_('{"A": 5, "B": 12, "C": 18, "D": 8, "E": 4}'),
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Rezepttyp-Statistik")
        verbose_name_plural = _("Rezepttyp-Statistiken")
        db_table = "recipe_recipetypestats"

    def __str__(self):
        return f"{self.recipe_type} ({self.count} recipes)"
