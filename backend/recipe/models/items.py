"""RecipeItem model — ingredient in a recipe."""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class RecipeItemExchangeGroup(models.Model):
    """A group of interchangeable RecipeItems within a recipe.

    Members are regular RecipeItem rows linked via exchange_group; the member with
    exchange_position=0 is the default/original. When planning a meal, variants are
    created by selecting active RecipeItems via MealItem.active_recipe_item_ids.
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
        null=True,
        blank=True,
        related_name="recipe_items",
        verbose_name=_("Portion"),
        help_text=_("NULL = Gramm (quantity wird direkt als Gramm interpretiert)"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    client_request_id = models.CharField(max_length=64, null=True, blank=True)
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
            models.UniqueConstraint(
                fields=["recipe", "client_request_id"],
                condition=Q(client_request_id__isnull=False),
                name="unique_recipe_item_client_request",
            ),
        ]

    def __str__(self):
        name = self.portion or "?"
        return f"{self.quantity} x {name}"


class RecipeItemIdempotencyRecord(models.Model):
    """Tracks idempotency keys for recipe-item mutations."""

    OPERATION_CREATE = "create"
    OPERATION_REPLACE = "replace"
    OPERATION_CHOICES = [
        (OPERATION_CREATE, "Create"),
        (OPERATION_REPLACE, "Replace"),
    ]

    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.CASCADE,
        related_name="idempotency_records",
        verbose_name=_("Rezept"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipe_item_idempotency_records",
        verbose_name=_("Benutzer"),
    )
    operation = models.CharField(
        max_length=32,
        choices=OPERATION_CHOICES,
        default=OPERATION_CREATE,
        verbose_name=_("Operation"),
    )
    request_key = models.CharField(
        max_length=64,
        verbose_name=_("Request-Key"),
    )
    payload_hash = models.CharField(
        max_length=64,
        verbose_name=_("Payload-Hash"),
    )
    recipe_item = models.ForeignKey(
        "recipe.RecipeItem",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="idempotency_records",
        verbose_name=_("Rezept-Zutat"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Rezept-Zutat Idempotenz-Eintrag")
        verbose_name_plural = _("Rezept-Zutat Idempotenz-Einträge")
        constraints = [
            models.UniqueConstraint(
                fields=["user", "recipe", "operation", "request_key"],
                name="unique_recipe_item_idempotency_scope",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.operation}:{self.request_key} -> item {self.recipe_item_id}"
