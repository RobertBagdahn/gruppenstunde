from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import BudgetCategoryChoices


class BudgetItem(models.Model):
    """A budget line item (expense or income) for an event."""

    event = models.ForeignKey(
        "event.Event",
        on_delete=models.CASCADE,
        related_name="budget_items",
        verbose_name=_("Event"),
    )
    description = models.CharField(max_length=200, verbose_name=_("Beschreibung"))
    amount = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        verbose_name=_("Betrag"),
    )
    category = models.CharField(
        max_length=20,
        choices=BudgetCategoryChoices.choices,
        default=BudgetCategoryChoices.OTHER,
        verbose_name=_("Kategorie"),
    )
    is_expense = models.BooleanField(
        default=True,
        verbose_name=_("Ist Ausgabe"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_budget_items",
        verbose_name=_("Erstellt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))

    class Meta:
        verbose_name = _("Budget-Posten")
        verbose_name_plural = _("Budget-Posten")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        prefix = "Ausgabe" if self.is_expense else "Einnahme"
        return f"{prefix}: {self.description} ({self.amount}€)"
