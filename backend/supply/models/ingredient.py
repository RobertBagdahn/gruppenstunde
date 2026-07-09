"""Ingredient models — Ingredient, IngredientAlias, Portion."""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from pgvector.django import VectorField

from content.models import Tag

from ..choices import IngredientStatusChoices, PhysicalViscosityChoices, StorageTypeChoices
from .reference import NutritionalTag, RetailSection


class IngredientGroup(models.Model):
    """Simple grouping for ingredients (e.g. 'Nudeln', 'Reis', 'Kartoffeln').

    Groups multiple ingredients under a common term for search purposes —
    e.g. 'Spaghetti' and 'Fusilli' both in group 'Nudeln'.
    """

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        verbose_name = _("Zutaten-Gruppe")
        verbose_name_plural = _("Zutaten-Gruppen")
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=False)
        super().save(*args, **kwargs)


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
    energy_kcal = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Energie (kcal)"))
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

    # Micronutrients per 100g (only vitamin C retained)
    vitamin_c_mg = models.FloatField(null=True, blank=True, verbose_name=_("Vitamin C (mg)"))

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
    nan_art_id_rewe = models.BigIntegerField(null=True, blank=True, verbose_name=_("REWE Artikelnummer"))
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
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="ingredients",
        verbose_name=_("Tags"),
    )
    groups = models.ManyToManyField(
        IngredientGroup,
        blank=True,
        related_name="ingredients",
        verbose_name=_("Zutaten-Gruppen"),
    )
    # Standalone food (can be consumed raw without a recipe)
    is_standalone_food = models.BooleanField(
        default=False,
        verbose_name=_("Eigenständig konsumierbar"),
        help_text=_("Kann roh/direkt gegessen werden (z.B. Obst, Getränke, Süßigkeiten)"),
    )

    status = models.CharField(
        max_length=20,
        choices=IngredientStatusChoices.choices,
        default=IngredientStatusChoices.DRAFT,
        verbose_name=_("Status"),
    )

    # Ownership & Visibility (for breakfast wizard user-generated items)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredients_owned",
        verbose_name=_("Besitzer"),
        help_text=_("Null = System-Zutat, gesetzt = Nutzer-Zutat"),
    )
    visibility = models.CharField(
        max_length=20,
        choices=[("private", _("Privat")), ("shared", _("Geteilt"))],
        default="private",
        verbose_name=_("Sichtbarkeit"),
        help_text=_("Privat: nur für Owner + dessen Gruppe sichtbar. Geteilt: mit selected_groups"),
    )
    shared_groups = models.ManyToManyField(
        "profiles.Group",
        blank=True,
        related_name="shared_ingredients",
        verbose_name=_("Geteilte Gruppen"),
        help_text=_("Gruppen, mit denen diese Zutat geteilt wird (relevante wenn visibility=shared)"),
    )

    # Scout/camp fields
    storage_type = models.CharField(
        max_length=20,
        choices=StorageTypeChoices.choices,
        null=True,
        blank=True,
        verbose_name=_("Lagerungsart"),
    )
    cooking_factor = models.FloatField(
        default=1.0,
        null=True,
        blank=True,
        verbose_name=_("Kochfaktor"),
        help_text=_("Multiplikator Roh→Gekocht, z.B. 2.5 für Nudeln (aus 100g → 250g)"),
    )
    camp_suitable = models.BooleanField(
        default=False,
        verbose_name=_("Camp-geeignet"),
        help_text=_("Fürs Zeltlager geeignet (haltbar, leicht, kein Kühlschrank)"),
    )
    preparation_time_min = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Zubereitungsdauer (Minuten)"),
    )
    season_start = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        verbose_name=_("Saisonbeginn (Monat 1-12)"),
    )
    season_end = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        verbose_name=_("Saisonende (Monat 1-12)"),
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

    # Search & AI
    embedding = VectorField(dimensions=768, null=True, blank=True)
    embedding_updated_at = models.DateTimeField(null=True, blank=True)
    embedding_text_hash = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="SHA-256 hash of the simplified embedding text (name+description+retail_section). Used to detect changes.",
    )

    # Data quality
    quality_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name=_("Datenqualität (0-100)"),
    )
    quality_score_updated_at = models.DateTimeField(null=True, blank=True)

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
    is_generic = models.BooleanField(
        default=False,
        verbose_name=_("Generisch"),
        help_text=_(
            "Generische Aliase (z.B. 'Salz', 'Pfeffer', 'Nudeln') dürfen an mehreren Zutaten hängen "
            "und unterliegen keiner Namens-Eindeutigkeit."
        ),
    )

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
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "ingredient",
                name="unique_alias_name_per_ingredient",
            ),
            models.UniqueConstraint(
                Lower("name"),
                name="unique_alias_name_when_not_generic",
                condition=Q(is_generic=False),
            ),
        ]

    def __str__(self):
        return f"{self.name} → {self.ingredient.name}"


class Portion(models.Model):
    """A specific portion/packaging of an ingredient with a measuring unit."""

    name = models.CharField(max_length=255, verbose_name=_("Name"))
    measuring_unit = models.ForeignKey(
        "supply.MeasuringUnit",
        on_delete=models.PROTECT,
        verbose_name=_("Maßeinheit"),
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name="portions",
        verbose_name=_("Zutat"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    weight_g = models.FloatField(
        null=True,
        blank=True,
        default=None,
        verbose_name=_("Gewicht (g)"),
        validators=[MinValueValidator(0.01)],
        help_text=_("Gewicht einer Portion in Gramm. NULL = unbekannt."),
    )
    rank = models.IntegerField(default=1, verbose_name=_("Rang (1 = Normalportion)"))
    is_system = models.BooleanField(
        default=False,
        verbose_name=_("System-Portion"),
        help_text=_("Von der App erstellte Standardportionen (g, Packung, Stück) – nicht löschbar"),
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
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
        ordering = ["rank"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "ingredient_id",
                condition=Q(deleted_at__isnull=True),
                name="unique_portion_name_per_ingredient",
            ),
        ]

    def compute_weight_g(self, explicit: float | None = None) -> float | None:
        """Compute the weight of this portion in grams."""
        if explicit is not None:
            return explicit if explicit > 0 else None
        if self.measuring_unit:
            mu_qty = self.measuring_unit.quantity or 0
            factor = 1.0
            if self.measuring_unit.unit == "ml" and self.ingredient_id:
                try:
                    factor = self.ingredient.physical_density or 1.0
                except Exception:
                    pass
            calc = (self.quantity or 0) * mu_qty * factor
            return calc if calc > 0 else None
        return None

    def save(self, *args, **kwargs):
        self.weight_g = self.compute_weight_g(self.weight_g)
        super().save(*args, **kwargs)

    def soft_delete(self):
        """Mark this portion as deleted."""
        from django.utils import timezone

        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def restore(self):
        """Restore a soft-deleted portion."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @classmethod
    def system_portion_names(cls) -> set[str]:
        return {"g", "Packung", "Stück"}

    def __str__(self):
        unit = self.measuring_unit.name if self.measuring_unit else ""
        return f"{self.name} / {self.quantity} {unit} / {self.ingredient.name}"
