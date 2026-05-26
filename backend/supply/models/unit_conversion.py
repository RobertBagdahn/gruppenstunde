"""Unit conversion model for converting between measuring units."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class UnitConversion(models.Model):
    """Conversion factor between two measuring units.

    If ingredient is null, it's a generic conversion (e.g. 1 EL = 15 ml).
    If ingredient is set, it's ingredient-specific (e.g. 1 EL Mehl = 8g).
    """

    from_unit = models.ForeignKey(
        "supply.MeasuringUnit",
        on_delete=models.CASCADE,
        related_name="conversions_from",
        verbose_name=_("Von Einheit"),
    )
    to_unit = models.ForeignKey(
        "supply.MeasuringUnit",
        on_delete=models.CASCADE,
        related_name="conversions_to",
        verbose_name=_("Zu Einheit"),
    )
    factor = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        verbose_name=_("Umrechnungsfaktor"),
        help_text=_("1 × Von-Einheit = factor × Zu-Einheit"),
    )
    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="unit_conversions",
        verbose_name=_("Zutat (optional)"),
        help_text=_("Leer = generische Umrechnung"),
    )

    class Meta:
        verbose_name = _("Einheiten-Umrechnung")
        verbose_name_plural = _("Einheiten-Umrechnungen")
        unique_together = [("from_unit", "to_unit", "ingredient")]
        ordering = ["from_unit__name", "to_unit__name"]

    def __str__(self) -> str:
        ingredient_str = f" ({self.ingredient.name})" if self.ingredient else ""
        return f"1 {self.from_unit.name} = {self.factor} {self.to_unit.name}{ingredient_str}"
