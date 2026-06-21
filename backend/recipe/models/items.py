"""RecipeItem model — ingredient in a recipe."""

from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class RecipeItem(models.Model):
    """Ingredient item for a recipe (Zutat im Rezept).

    quantity is always a multiplier on the portion.
    Total weight = quantity × portion.weight_g
    """

    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.CASCADE,
        related_name="recipe_items",
        verbose_name=_("Rezept"),
    )
    portion = models.ForeignKey(
        "supply.Portion",
        on_delete=models.PROTECT,
        related_name="recipe_items",
        verbose_name=_("Portion"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    sort_order = models.IntegerField(default=0, verbose_name=_("Reihenfolge"))
    note = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Anmerkung"),
        help_text=_("z.B. 'gehackt', 'in Scheiben', 'optional'"),
    )

    class Meta:
        verbose_name = _("Rezept-Zutat")
        verbose_name_plural = _("Rezept-Zutaten")
        ordering = ["sort_order"]
        constraints = [
            models.CheckConstraint(
                check=Q(quantity__gt=0),
                name="recipe_item_quantity_positive",
            ),
        ]

    def __str__(self):
        name = self.portion or "?"
        return f"{self.quantity} x {name}"
