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
        max_length=3,
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
        help_text=_("z.B. 'Vegan', 'Eiallergie', 'Laktoseunverträglichkeit'"),
    )
    name_opposite = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Gegenbezeichnung"),
        help_text=_("z.B. 'Tierische Produkte', 'Ei und Eierzeugnisse', 'Laktose'"),
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


class DgeGenderChoices(models.TextChoices):
    MALE = "male", _("Männlich")
    FEMALE = "female", _("Weiblich")


class DgeReference(models.Model):
    """DGE (Deutsche Gesellschaft für Ernährung) reference values per day.

    Admin-manageable model replacing the static dge_reference.py data.
    Source: DGE, ÖGE, SGE D-A-CH Referenzwerte für die Nährstoffzufuhr.
    """

    age_min = models.IntegerField(verbose_name=_("Alter von"))
    age_max = models.IntegerField(verbose_name=_("Alter bis"))
    gender = models.CharField(
        max_length=10,
        choices=DgeGenderChoices.choices,
        verbose_name=_("Geschlecht"),
    )

    # Macronutrients per day
    energy_kcal = models.FloatField(null=True, blank=True, verbose_name=_("Energie (kcal)"))
    protein_g = models.FloatField(null=True, blank=True, verbose_name=_("Eiweiß (g)"))
    fat_g = models.FloatField(null=True, blank=True, verbose_name=_("Fett (g)"))
    carbohydrate_g = models.FloatField(null=True, blank=True, verbose_name=_("Kohlenhydrate (g)"))
    fibre_g = models.FloatField(null=True, blank=True, verbose_name=_("Ballaststoffe (g)"))

    # Max limits per day
    sugar_g_max = models.FloatField(null=True, blank=True, verbose_name=_("Zucker max (g)"))
    salt_g_max = models.FloatField(null=True, blank=True, verbose_name=_("Salz max (g)"))
    fat_sat_g_max = models.FloatField(null=True, blank=True, verbose_name=_("Gesättigte Fettsäuren max (g)"))
    sodium_mg_max = models.FloatField(null=True, blank=True, verbose_name=_("Natrium max (mg)"))

    # Vitamins per day (only vitamin C retained)
    vitamin_c_mg = models.FloatField(null=True, blank=True, verbose_name=_("Vitamin C (mg)"))

    class Meta:
        verbose_name = _("DGE-Referenzwert")
        verbose_name_plural = _("DGE-Referenzwerte")
        ordering = ["age_min", "gender"]
        unique_together = ["age_min", "age_max", "gender"]

    def __str__(self):
        return f"DGE {self.age_min}-{self.age_max} ({self.get_gender_display()})"
