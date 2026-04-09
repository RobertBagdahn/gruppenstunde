"""HealthRule model — configurable traffic-light thresholds for cockpit dashboard."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class HealthRuleScopeChoices(models.TextChoices):
    MEAL_EVENT = "meal_event", _("Essensplan")
    DAY = "day", _("Tag")
    MEAL = "meal", _("Mahlzeit")
    RECIPE = "recipe", _("Rezept")
    INGREDIENT = "ingredient", _("Zutat")


class HealthRule(models.Model):
    """Configurable threshold rule for the cockpit traffic-light system.

    Each rule defines green/yellow/red thresholds for a nutritional parameter
    at a specific scope (meal_event, day, meal, recipe, ingredient).
    """

    name = models.CharField(
        max_length=100,
        verbose_name=_("Name"),
        help_text=_("z.B. 'Zuckergehalt pro Tag'"),
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Beschreibung"),
    )
    parameter = models.CharField(
        max_length=50,
        verbose_name=_("Parameter"),
        help_text=_("z.B. 'energy_kj', 'sugar_g', 'price_total', 'nutri_class'"),
    )
    scope = models.CharField(
        max_length=20,
        choices=HealthRuleScopeChoices.choices,
        verbose_name=_("Geltungsbereich"),
        help_text=_("Auf welcher Ebene wird die Regel ausgewertet"),
    )
    threshold_green = models.FloatField(
        verbose_name=_("Schwellenwert Grün"),
        help_text=_("Bis zu diesem Wert ist der Status grün"),
    )
    threshold_yellow = models.FloatField(
        verbose_name=_("Schwellenwert Gelb"),
        help_text=_("Bis zu diesem Wert ist der Status gelb, darüber rot"),
    )
    unit = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name=_("Einheit"),
        help_text=_("z.B. 'g', 'kJ', 'EUR'"),
    )
    tip_text = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Tipp-Text"),
        help_text=_("Empfehlung bei Gelb/Rot-Status"),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Aktiv"),
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Sortierung"),
    )

    class Meta:
        verbose_name = _("Gesundheitsregel")
        verbose_name_plural = _("Gesundheitsregeln")
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.name} ({self.scope}/{self.parameter})"

    def evaluate(self, value: float) -> str:
        """Evaluate a value against thresholds. Returns 'green', 'yellow', or 'red'."""
        if value <= self.threshold_green:
            return "green"
        if value <= self.threshold_yellow:
            return "yellow"
        return "red"
