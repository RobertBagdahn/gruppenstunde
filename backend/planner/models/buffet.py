"""Buffet templates: which roles a buffet uses and how much per person."""

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from .meal_plan import MealTypeChoices

BUFFET_TAG_GROUP = "buffet"


class BuffetUnitChoices(models.TextChoices):
    GRAM = "g", _("Gramm")
    MILLILITER = "ml", _("Milliliter")


class BuffetTemplate(models.Model):
    """A staff-maintained buffet preset, e.g. "Belegte Baguettes"."""

    name = models.CharField(max_length=100, verbose_name=_("Name"))
    slug = models.SlugField(max_length=100, unique=True, verbose_name=_("Slug"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    meal_types = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_("Mahlzeitentypen"),
        help_text=_('Liste von Mahlzeitentypen, z. B. ["lunch", "dinner"]'),
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Aktiv"))
    sort_order = models.IntegerField(default=0, verbose_name=_("Reihenfolge"))

    class Meta:
        verbose_name = _("Buffet-Vorlage")
        verbose_name_plural = _("Buffet-Vorlagen")
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        valid = set(MealTypeChoices.values)
        if not isinstance(self.meal_types, list) or any(value not in valid for value in self.meal_types):
            raise ValidationError(
                {"meal_types": _("Nur gültige Mahlzeitentypen erlaubt: %(types)s") % {"types": ", ".join(valid)}}
            )


class BuffetTemplateRole(models.Model):
    """One role (buffet tag) of a template with its amount per person."""

    template = models.ForeignKey(
        BuffetTemplate,
        on_delete=models.CASCADE,
        related_name="roles",
        verbose_name=_("Vorlage"),
    )
    role = models.ForeignKey(
        "content.Tag",
        on_delete=models.PROTECT,
        limit_choices_to={"group": BUFFET_TAG_GROUP},
        related_name="buffet_template_roles",
        verbose_name=_("Rolle"),
    )
    amount_per_person = models.FloatField(
        validators=[MinValueValidator(0.1)],
        verbose_name=_("Menge pro Person"),
    )
    unit = models.CharField(
        max_length=2,
        choices=BuffetUnitChoices.choices,
        default=BuffetUnitChoices.GRAM,
        verbose_name=_("Einheit"),
    )
    enabled_by_default = models.BooleanField(default=True, verbose_name=_("Standardmäßig aktiv"))
    sort_order = models.IntegerField(default=0, verbose_name=_("Reihenfolge"))
    default_ingredients = models.ManyToManyField(
        "supply.Ingredient",
        blank=True,
        related_name="buffet_template_roles",
        verbose_name=_("Standard-Zutaten"),
    )
    default_recipes = models.ManyToManyField(
        "recipe.Recipe",
        blank=True,
        related_name="buffet_template_roles",
        verbose_name=_("Standard-Rezepte"),
    )

    class Meta:
        verbose_name = _("Buffet-Rolle")
        verbose_name_plural = _("Buffet-Rollen")
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["template", "role"], name="unique_role_per_buffet_template"),
        ]

    def __str__(self) -> str:
        return f"{self.template} – {self.role}"

    def clean(self) -> None:
        if self.role_id and self.role.group != BUFFET_TAG_GROUP:
            raise ValidationError({"role": _("Nur Buffet-Rollen-Tags sind erlaubt.")})
