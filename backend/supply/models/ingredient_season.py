"""IngredientSeason model — maps ingredients to their seasonal months."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class IngredientSeason(models.Model):
    """Maps an ingredient to a month when it's in season.

    Used for context-aware recipe suggestions — a recipe's season score
    is the proportion of its ingredients that are in season for the current month.
    """

    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        related_name="seasons",
        verbose_name=_("Zutat"),
    )
    month = models.IntegerField(
        choices=[(m, m) for m in range(1, 13)],
        verbose_name=_("Monat"),
        help_text=_("Monat (1-12) in dem die Zutat Saison hat"),
    )
    is_high_season = models.BooleanField(
        default=True,
        verbose_name=_("Hauptsaison"),
        help_text=_("True = Haupterntezeit, False = Nebensaison"),
    )

    class Meta:
        verbose_name = _("Zutaten-Saison")
        verbose_name_plural = _("Zutaten-Saisons")
        unique_together = [("ingredient", "month")]
        ordering = ["ingredient", "month"]

    def __str__(self) -> str:
        return f"{self.ingredient.name} – Monat {self.month}"
