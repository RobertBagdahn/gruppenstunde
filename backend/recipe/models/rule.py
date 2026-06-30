"""Rule model — unified configurable threshold rules for suggestions and recipe checks.

Replaces both HealthRule (meal plan cockpit) and RecipeHint (recipe improvements).

Evaluation uses a range-based model with four optional thresholds:

         rot    gelb       grün       gelb    rot
    ──────┼──────┼──────────────┼──────┼──────
      min_yellow min_green  max_green max_yellow

- Only max thresholds set → upper limit (too much is bad)
- Only min thresholds set → lower limit (too little is bad)
- Both set → value must be in range (e.g. energy)
"""

from itertools import pairwise

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


class RuleScopeChoices(models.TextChoices):
    MEAL_EVENT = "meal_event", _("Essensplan")
    DAY = "day", _("Tag")
    MEAL = "meal", _("Mahlzeit")
    RECIPE = "recipe", _("Rezept")


class RuleTypeChoices(models.TextChoices):
    NUTRITION = "nutrition", _("Nährwert")


class RuleHintLevelChoices(models.TextChoices):
    INFO = "info", _("Info")
    WARN = "warn", _("Warnung")
    ERROR = "error", _("Fehler")


class Rule(models.Model):
    """Unified threshold rule for the suggestion system.

    Each rule defines green/yellow/red thresholds for a nutritional parameter
    at a specific scope (meal_event, day, meal, recipe).

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
        help_text=_("z.B. 'energy_kcal', 'sugar_g', 'protein_g'"),
    )
    scope = models.CharField(
        max_length=20,
        choices=RuleScopeChoices.choices,
        verbose_name=_("Geltungsbereich"),
        help_text=_("Auf welcher Ebene wird die Regel ausgewertet"),
    )
    rule_type = models.CharField(
        max_length=20,
        choices=RuleTypeChoices.choices,
        default=RuleTypeChoices.NUTRITION,
        verbose_name=_("Regeltyp"),
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
        help_text=_("z.B. 'g', 'kcal', 'mg'"),
    )
    hint_level = models.CharField(
        max_length=10,
        choices=RuleHintLevelChoices.choices,
        default=RuleHintLevelChoices.WARN,
        verbose_name=_("Hinweis-Stufe"),
    )
    tip_text = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Tipp-Text"),
        help_text=_("Empfehlung bei Gelb/Rot-Status"),
    )
    improvement_text = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Verbesserungsvorschlag"),
        help_text=_("Konkreter, umsetzbarer Verbesserungsvorschlag"),
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
        verbose_name = _("Regel")
        verbose_name_plural = _("Regeln")
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.scope}/{self.parameter})"

    def clean(self) -> None:
        """Validate that the four thresholds are ordered consistently.

        The ampel only behaves sensibly when, going from low to high values:
        ``min_yellow ≤ min_green ≤ max_green ≤ max_yellow``. Without this guard an
        admin can configure thresholds (e.g. only ``min_green`` + ``max_green``)
        that make ``evaluate()`` produce misleadingly lenient verdicts. Only the
        thresholds that are actually set are checked, so partial rules (min-only /
        max-only) remain valid.
        """
        super().clean()
        # Build the ordered chain of the thresholds that are set.
        ordered = [
            ("min_yellow", self.min_yellow),
            ("min_green", self.min_green),
            ("max_green", self.max_green),
            ("max_yellow", self.max_yellow),
        ]
        present = [(name, val) for name, val in ordered if val is not None]
        for (prev_name, prev_val), (cur_name, cur_val) in pairwise(present):
            if prev_val > cur_val:
                raise ValidationError(
                    {
                        cur_name: _(
                            "Schwellen müssen aufsteigend sein: %(prev)s (%(prev_val)s) "
                            "darf nicht größer als %(cur)s (%(cur_val)s) sein."
                        )
                        % {
                            "prev": prev_name,
                            "prev_val": prev_val,
                            "cur": cur_name,
                            "cur_val": cur_val,
                        }
                    }
                )

    @property
    def min_max(self) -> str:
        """Backward compatibility helper for old RecipeHint min_max field."""
        if self.max_green is not None or self.max_yellow is not None:
            return "max"
        return "min"

    @property
    def value(self) -> float:
        """Backward compatibility helper for old RecipeHint limit value field."""
        if self.min_max == "max":
            return self.max_green if self.max_green is not None else (self.max_yellow or 0.0)
        return self.min_green if self.min_green is not None else (self.min_yellow or 0.0)

    @property
    def hint(self) -> str:
        """Backward compatibility helper for old RecipeHint hint field (tip_text)."""
        return self.tip_text

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
