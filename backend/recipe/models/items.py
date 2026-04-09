"""RecipeItem model — ingredient in a recipe."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from supply.choices import MaterialQuantityType


class RecipeItem(models.Model):
    """Ingredient item for a recipe (Zutat im Rezept)."""

    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.CASCADE,
        related_name="recipe_items",
        verbose_name=_("Rezept"),
    )
    portion = models.ForeignKey(
        "supply.Portion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipe_items",
        verbose_name=_("Portion"),
    )
    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipe_items",
        verbose_name=_("Zutat"),
        help_text=_("Direkte Zutat (wenn keine Portion gewählt)"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    measuring_unit = models.ForeignKey(
        "supply.MeasuringUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Maßeinheit"),
    )
    sort_order = models.IntegerField(default=0, verbose_name=_("Reihenfolge"))
    note = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Anmerkung"),
        help_text=_("z.B. 'gehackt', 'in Scheiben', 'optional'"),
    )
    quantity_type = models.CharField(
        max_length=20,
        choices=MaterialQuantityType.choices,
        default=MaterialQuantityType.ONCE,
        verbose_name=_("Mengenart"),
        help_text=_("Einmalig = Gesamtmenge, Pro Person = Menge pro Person"),
    )

    class Meta:
        verbose_name = _("Rezept-Zutat")
        verbose_name_plural = _("Rezept-Zutaten")
        ordering = ["sort_order"]

    def __str__(self):
        name = self.portion or self.ingredient or "?"
        return f"{self.quantity} x {name}"
