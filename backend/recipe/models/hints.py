"""RecipeHint model — rule-based improvement suggestions."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from supply.choices import (
    HintLevelChoices,
    HintMinMaxChoices,
    HintParameterChoices,
    RecipeObjectiveChoices,
    RecipeTypeChoices,
)


class RecipeHint(models.Model):
    """Rule-based improvement suggestion for recipes."""

    name = models.CharField(max_length=255, verbose_name=_("Name"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    parameter = models.CharField(
        max_length=20,
        choices=HintParameterChoices.choices,
        verbose_name=_("Parameter"),
        help_text=_("Nährwertfeld das geprüft wird"),
    )
    min_value = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Mindestwert"),
    )
    max_value = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Höchstwert"),
    )
    min_max = models.CharField(
        max_length=10,
        choices=HintMinMaxChoices.choices,
        default=HintMinMaxChoices.MAX,
        verbose_name=_("Regeltyp"),
    )
    hint_level = models.CharField(
        max_length=10,
        choices=HintLevelChoices.choices,
        default=HintLevelChoices.INFO,
        verbose_name=_("Hinweis-Stufe"),
    )
    recipe_type = models.CharField(
        max_length=20,
        choices=RecipeTypeChoices.choices,
        blank=True,
        default="",
        verbose_name=_("Rezepttyp"),
        help_text=_("Optional: Gilt nur für diesen Rezepttyp"),
    )
    recipe_objective = models.CharField(
        max_length=20,
        choices=RecipeObjectiveChoices.choices,
        blank=True,
        default="",
        verbose_name=_("Bewertungsdimension"),
        help_text=_("Gesundheit, Geschmack, Kosten oder Sättigung"),
    )

    class Meta:
        verbose_name = _("Rezept-Hinweis")
        verbose_name_plural = _("Rezept-Hinweise")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.parameter})"
