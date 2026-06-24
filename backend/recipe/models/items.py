"""RecipeItem model — ingredient in a recipe."""

from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class RecipeItemExchangeGroup(models.Model):
    """A group of interchangeable RecipeItems within a recipe.

    Members are regular RecipeItem rows linked via exchange_group; the member with
    exchange_position=0 is the default/original. When planning a meal, the planner
    splits portions across the members of a group (see planner.MealItemSplit).
    """

    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.CASCADE,
        related_name="exchange_groups",
        verbose_name=_("Rezept"),
    )
    name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Name"),
        help_text=_("z.B. 'Käse-Ersatz' — nur im Editor sichtbar"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Austausch-Gruppe")
        verbose_name_plural = _("Austausch-Gruppen")
        ordering = ["id"]

    def __str__(self) -> str:
        return self.name or f"Austausch-Gruppe {self.pk}"


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
    is_optional = models.BooleanField(
        default=False,
        verbose_name=_("Optional"),
        help_text=_("Beim Einplanen entscheidet der Planer, ob die Zutat dabei ist"),
    )
    exchange_group = models.ForeignKey(
        "recipe.RecipeItemExchangeGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
        verbose_name=_("Austausch-Gruppe"),
    )
    exchange_position = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Position in der Austausch-Gruppe"),
        help_text=_("0 = Original/Default"),
    )

    class Meta:
        verbose_name = _("Rezept-Zutat")
        verbose_name_plural = _("Rezept-Zutaten")
        ordering = ["sort_order"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="recipe_item_quantity_positive",
            ),
            # A RecipeItem is either optional OR part of an exchange group — never both.
            models.CheckConstraint(
                condition=~(Q(is_optional=True) & Q(exchange_group__isnull=False)),
                name="recipe_item_optional_xor_exchange",
            ),
        ]

    def __str__(self):
        name = self.portion or "?"
        return f"{self.quantity} x {name}"
