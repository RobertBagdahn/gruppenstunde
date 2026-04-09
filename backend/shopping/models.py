from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from supply.models.ingredient import Ingredient
from supply.models.reference import RetailSection


class SourceType(models.TextChoices):
    MANUAL = "manual", _("Manuell")
    RECIPE = "recipe", _("Rezept")
    MEAL_EVENT = "meal_event", _("Essensplan")


class CollaboratorRole(models.TextChoices):
    VIEWER = "viewer", _("Betrachter")
    EDITOR = "editor", _("Bearbeiter")
    ADMIN = "admin", _("Administrator")


class ShoppingList(models.Model):
    """Persistent, named shopping list with sharing and real-time collaboration."""

    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_shopping_lists",
        verbose_name=_("Besitzer"),
    )
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.MANUAL,
        verbose_name=_("Quelle"),
    )
    source_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Quell-ID"),
        help_text=_("ID des Rezepts oder MealEvents, aus dem die Liste erstellt wurde"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Einkaufsliste")
        verbose_name_plural = _("Einkaufslisten")
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.name


class ShoppingListItem(models.Model):
    """Single item on a shopping list, optionally linked to an Ingredient."""

    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("Einkaufsliste"),
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shopping_list_items",
        verbose_name=_("Zutat"),
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
    )
    quantity_g = models.FloatField(
        default=0,
        verbose_name=_("Menge in Gramm"),
    )
    unit = models.CharField(
        max_length=20,
        default="g",
        verbose_name=_("Einheit"),
    )
    retail_section = models.ForeignKey(
        RetailSection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shopping_list_items",
        verbose_name=_("Supermarkt-Abteilung"),
    )
    is_checked = models.BooleanField(
        default=False,
        verbose_name=_("Abgehakt"),
    )
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_shopping_items",
        verbose_name=_("Abgehakt von"),
    )
    checked_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Abgehakt am"),
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Sortierung"),
    )
    note = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name=_("Notiz"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Einkaufslisten-Eintrag")
        verbose_name_plural = _("Einkaufslisten-Einträge")
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        checked = " [x]" if self.is_checked else ""
        return f"{self.name} ({self.quantity_g}{self.unit}){checked}"


class ShoppingListCollaborator(models.Model):
    """Links a user to a shopping list with a specific role."""

    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name="collaborators",
        verbose_name=_("Einkaufsliste"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shopping_collaborations",
        verbose_name=_("Nutzer"),
    )
    role = models.CharField(
        max_length=10,
        choices=CollaboratorRole.choices,
        default=CollaboratorRole.VIEWER,
        verbose_name=_("Rolle"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Einkaufslisten-Mitglied")
        verbose_name_plural = _("Einkaufslisten-Mitglieder")
        unique_together = [("shopping_list", "user")]
        ordering = ["role", "user__username"]

    def __str__(self) -> str:
        return f"{self.user} – {self.get_role_display()} ({self.shopping_list.name})"
