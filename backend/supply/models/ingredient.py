"""Ingredient models — Ingredient, IngredientAlias, Portion."""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from ..choices import IngredientStatusChoices, PhysicalViscosityChoices
from .reference import NutritionalTag, RetailSection


class Ingredient(models.Model):
    """
    Ingredient for recipes (Zutat).

    Standalone model — does NOT inherit from Supply because Ingredient has
    30+ nutritional/score fields that have nothing in common with Material.
    """

    name = models.CharField(max_length=255, verbose_name=_("Name"))
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))

    # Physical properties
    physical_density = models.FloatField(default=1, verbose_name=_("Dichte"))
    physical_viscosity = models.CharField(
        max_length=10,
        choices=PhysicalViscosityChoices.choices,
        default=PhysicalViscosityChoices.SOLID,
        verbose_name=_("Aggregatzustand"),
    )
    durability_in_days = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Haltbarkeit (Tage)"),
    )
    max_storage_temperature = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Max. Lagertemperatur (°C)"),
    )

    # Legacy field
    standard_recipe_weight_g = models.FloatField(
        default=100,
        help_text=_("Standard-Gewicht in Gramm für ein Rezept"),
        blank=True,
        null=True,
        verbose_name=_("Standard-Rezeptgewicht (g)"),
    )

    # Nutritional values per 100g
    energy_kj = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Energie (kJ)"))
    protein_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Eiweiß (g)"))
    fat_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Fett (g)"))
    fat_sat_g = models.FloatField(null=True, blank=True, verbose_name=_("Gesättigte Fettsäuren (g)"))
    carbohydrate_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Kohlenhydrate (g)"))
    sugar_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Zucker (g)"))
    fibre_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Ballaststoffe (g)"))
    salt_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Salz (g)"))
    sodium_mg = models.FloatField(null=True, blank=True, verbose_name=_("Natrium (mg)"))
    fructose_g = models.FloatField(null=True, blank=True, verbose_name=_("Fructose (g)"))
    lactose_g = models.FloatField(null=True, blank=True, verbose_name=_("Laktose (g)"))

    # Scores
    child_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name=_("Kinderfreundlichkeit (1-10)"),
    )
    scout_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name=_("Pfadfindereignung (1-10)"),
    )
    environmental_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name=_("Umweltfreundlichkeit (1-10)"),
    )
    nova_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        verbose_name=_("NOVA-Verarbeitungsgrad (1-4)"),
    )
    fruit_factor = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name=_("Obst-/Gemüse-Anteil (0-1)"),
    )

    # Calculated fields
    nutri_score = models.IntegerField(null=True, blank=True, verbose_name=_("Nutri-Score (Punkte)"))
    nutri_class = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name=_("Nutri-Score Klasse (1=A bis 5=E)"),
    )
    price_per_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Preis pro kg (EUR)"),
    )

    # External references
    fdc_id = models.IntegerField(null=True, blank=True, verbose_name=_("USDA FoodData Central ID"))
    ean = models.CharField(max_length=20, blank=True, default="", verbose_name=_("EAN-Barcode"))

    # Relations
    ingredient_ref = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Referenz-Zutat"),
    )
    retail_section = models.ForeignKey(
        RetailSection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredients",
        verbose_name=_("Supermarkt-Abteilung"),
    )
    nutritional_tags = models.ManyToManyField(
        NutritionalTag,
        blank=True,
        related_name="ingredients",
        verbose_name=_("Ernährungstags"),
    )
    status = models.CharField(
        max_length=20,
        choices=IngredientStatusChoices.choices,
        default=IngredientStatusChoices.DRAFT,
        verbose_name=_("Status"),
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredients_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredients_updated",
    )

    class Meta:
        verbose_name = _("Zutat")
        verbose_name_plural = _("Zutaten")
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=False)
            if not base_slug:
                base_slug = "zutat"
            slug = base_slug
            counter = 1
            while Ingredient.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class IngredientAlias(models.Model):
    """Alternative name for an ingredient."""

    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name="aliases",
    )
    name = models.CharField(
        max_length=100,
        verbose_name=_("Alternativname"),
        help_text=_("Alternativer Name für die Zutat"),
    )
    rank = models.IntegerField(default=1)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredient_aliases_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredient_aliases_updated",
    )

    class Meta:
        verbose_name = _("Zutaten-Alias")
        verbose_name_plural = _("Zutaten-Aliase")
        ordering = ["-rank", "name"]
        unique_together = ["ingredient", "rank"]

    def __str__(self):
        return f"{self.name} → {self.ingredient.name}"


class Portion(models.Model):
    """A specific portion/packaging of an ingredient with a measuring unit."""

    name = models.CharField(max_length=255, blank=True, default="", verbose_name=_("Name"))
    measuring_unit = models.ForeignKey(
        "supply.MeasuringUnit",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_("Maßeinheit"),
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name="portions",
        verbose_name=_("Zutat"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    weight_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Gewicht (g)"))
    rank = models.IntegerField(default=1)
    priority = models.IntegerField(default=0, verbose_name=_("Priorität"))
    is_default = models.BooleanField(default=False, verbose_name=_("Standard-Portion"))

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portions_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portions_updated",
    )

    class Meta:
        verbose_name = _("Portion")
        verbose_name_plural = _("Portionen")
        ordering = ["-priority", "rank", "name"]

    def save(self, *args, **kwargs):
        if self.is_default:
            Portion.objects.filter(ingredient=self.ingredient, is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )
        super().save(*args, **kwargs)

    def __str__(self):
        unit = self.measuring_unit.name if self.measuring_unit else ""
        return f"{self.name} / {self.quantity} {unit} / {self.ingredient.name}"
