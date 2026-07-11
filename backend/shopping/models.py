import uuid

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
        help_text=_("ID des Rezepts oder MealPlans, aus dem die Liste erstellt wurde"),
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
    rewe_added_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Zu REWE übertragen am"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Einkaufslisten-Eintrag")
        verbose_name_plural = _("Einkaufslisten-Einträge")
        ordering = ["sort_order", "id"]

    def save(self, *args, **kwargs):
        self.quantity_g = round(self.quantity_g, 2)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        checked = " [x]" if self.is_checked else ""
        return f"{self.name} ({self.quantity_g}{self.unit}){checked}"


class ShoppingListItemSource(models.Model):
    """Tracks which recipe/meal contributed to a shopping list item's quantity."""

    shopping_list_item = models.ForeignKey(
        ShoppingListItem,
        on_delete=models.CASCADE,
        related_name="sources",
        verbose_name=_("Einkaufslisten-Eintrag"),
    )
    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shopping_item_sources",
        verbose_name=_("Rezept"),
    )
    meal = models.ForeignKey(
        "planner.Meal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shopping_item_sources",
        verbose_name=_("Mahlzeit"),
    )
    quantity_g = models.FloatField(
        default=0,
        verbose_name=_("Menge in Gramm"),
    )
    recipe_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Rezeptname (cached)"),
    )
    meal_label = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Mahlzeit-Label (cached)"),
    )
    recipe_slug = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Rezept-Slug (cached)"),
    )

    class Meta:
        verbose_name = _("Einkaufslisten-Herkunft")
        verbose_name_plural = _("Einkaufslisten-Herkünfte")
        ordering = ["-quantity_g"]

    def save(self, *args, **kwargs):
        self.quantity_g = round(self.quantity_g, 2)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.recipe_name} – {self.quantity_g}g"


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


class KitchenReminderCategory(models.Model):
    """Category for kitchen reminder items (e.g. Reinigung, Hygiene, Kochen)."""

    name = models.CharField(
        max_length=100,
        verbose_name=_("Name"),
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Sortierung"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Küchenbedarf-Kategorie")
        verbose_name_plural = _("Küchenbedarf-Kategorien")
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class KitchenReminder(models.Model):
    """A kitchen supply reminder item shown at the bottom of every shopping list."""

    name = models.CharField(
        max_length=200,
        verbose_name=_("Name"),
    )
    category = models.ForeignKey(
        KitchenReminderCategory,
        on_delete=models.CASCADE,
        related_name="reminders",
        verbose_name=_("Kategorie"),
        null=True,
        blank=True,
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Sortierung"),
    )
    is_published = models.BooleanField(
        default=False,
        verbose_name=_("Veröffentlicht"),
    )
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kitchen_reminder_suggestions",
        verbose_name=_("Vorgeschlagen von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Küchenbedarf-Erinnerung")
        verbose_name_plural = _("Küchenbedarf-Erinnerungen")
        ordering = ["category__sort_order", "sort_order", "name"]

    def __str__(self) -> str:
        status = "✓" if self.is_published else "○"
        return f"{status} {self.name}"


class ReweExportToken(models.Model):
    """Short-lived token granting read access to a shopping list's export data."""

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name=_("Token"),
    )
    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name="export_tokens",
        verbose_name=_("Einkaufsliste"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rewe_export_tokens",
        verbose_name=_("Nutzer"),
    )
    expires_at = models.DateTimeField(
        verbose_name=_("Läuft ab um"),
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Erstellt am"),
    )

    class Meta:
        verbose_name = _("REWE-Export-Token")
        verbose_name_plural = _("REWE-Export-Tokens")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Token für {self.shopping_list.name} von {self.user}"

    def is_valid(self) -> bool:
        from django.utils import timezone

        return self.expires_at > timezone.now()
