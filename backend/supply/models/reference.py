"""Reference/lookup models — MeasuringUnit, NutritionalTag, RetailSection."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import MeasuringUnitType


class MeasuringUnit(models.Model):
    """Measuring unit with conversion factor (g, ml, Stück, etc.)."""

    name = models.CharField(max_length=255, verbose_name=_("Name"))
    description = models.CharField(max_length=255, blank=True, default="", verbose_name=_("Beschreibung"))
    quantity = models.FloatField(default=1, verbose_name=_("Umrechnungsfaktor"))
    unit = models.CharField(
        max_length=2,
        choices=MeasuringUnitType.choices,
        default=MeasuringUnitType.MASS,
        verbose_name=_("Einheit"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Maßeinheit")
        verbose_name_plural = _("Maßeinheiten")

    def __str__(self):
        return self.name


class NutritionalTag(models.Model):
    """Dietary classification tags (vegan, vegetarian, gluten-free, etc.)."""

    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("z.B. 'Fleisch', 'Alkohol', 'Nüsse', 'Scharf'"),
    )
    name_opposite = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Gegenbezeichnung"),
        help_text=_("z.B. 'Vegan', 'Vegetarisch', 'Alkoholfrei'"),
    )
    description = models.CharField(max_length=255, blank=True, default="")
    rank = models.IntegerField(default=1)
    is_dangerous = models.BooleanField(
        default=False,
        help_text=_("Kennzeichnet potenziell gefährliche Inhaltsstoffe (Allergene)"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Ernährungstag")
        verbose_name_plural = _("Ernährungstags")
        ordering = ["rank", "name"]

    def __str__(self):
        return self.name


class RetailSection(models.Model):
    """Supermarket aisle/section for shopping list grouping."""

    name = models.CharField(max_length=255, verbose_name=_("Name"))
    description = models.CharField(max_length=255, blank=True, default="", verbose_name=_("Beschreibung"))
    rank = models.IntegerField(default=0, verbose_name=_("Sortierung"))

    class Meta:
        verbose_name = _("Supermarkt-Abteilung")
        verbose_name_plural = _("Supermarkt-Abteilungen")
        ordering = ["rank", "name"]

    def __str__(self):
        return self.name
