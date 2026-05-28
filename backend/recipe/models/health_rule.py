"""HealthRule model — configurable traffic-light thresholds for cockpit dashboard.

Evaluation uses a range-based model with four optional thresholds:

         rot    gelb       grün       gelb    rot
    ──────┼──────┼──────────────┼──────┼──────
      min_yellow min_green  max_green max_yellow

- Only max thresholds set → upper limit (too much is bad)
- Only min thresholds set → lower limit (too little is bad)
- Both set → value must be in range (e.g. energy)
"""

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

    Uses a range model: min_green/min_yellow for lower bound,
    max_green/max_yellow for upper bound. All nullable — set only what applies.
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
    min_green = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Min Grün"),
        help_text=_("Untergrenze für grünen Status (Wert muss >= sein)"),
    )
    min_yellow = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Min Gelb"),
        help_text=_("Untergrenze für gelben Status (darunter = rot)"),
    )
    max_green = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Max Grün"),
        help_text=_("Obergrenze für grünen Status (Wert muss <= sein)"),
    )
    max_yellow = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Max Gelb"),
        help_text=_("Obergrenze für gelben Status (darüber = rot)"),
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
        """Evaluate a value against thresholds. Returns 'green', 'yellow', or 'red'.

        Logic:
        - Check lower bound first (min): value too low → yellow/red
        - Check upper bound (max): value too high → yellow/red
        - Otherwise → green
        """
        # Check lower bound
        if self.min_yellow is not None and value < self.min_yellow:
            return "red"
        if self.min_green is not None and value < self.min_green:
            return "yellow"

        # Check upper bound
        if self.max_yellow is not None and value > self.max_yellow:
            return "red"
        if self.max_green is not None and value > self.max_green:
            return "yellow"

        return "green"
