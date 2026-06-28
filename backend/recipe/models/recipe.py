"""Recipe model — inherits from Content abstract base."""

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from content.models import Content
from supply.choices import RecipeTypeChoices


class RecipeVisibility(models.TextChoices):
    PRIVATE = "private", _("Privat")
    GROUP = "group", _("Gruppe")
    PUBLIC = "public", _("Öffentlich")


class Recipe(Content):
    """
    Standalone recipe model — inherits shared fields from Content.

    Recipe-specific fields: recipe_type, portions, nutritional_tags.
    Personal recipe fields: owner, forked_from, visibility.
    All other fields (title, slug, summary, description, difficulty,
    execution_time, preparation_time, status, image,
    like_score, view_count, search_vector, embedding, tags, scout_levels,
    authors, created_at, updated_at, created_by, updated_by, deleted_at)
    come from the Content abstract base.
    """

    # --- Recipe-specific fields ---
    recipe_type = models.CharField(
        max_length=20,
        choices=RecipeTypeChoices.choices,
        blank=True,
        default="",
        verbose_name=_("Rezepttyp"),
        help_text=_("Frühstück, Warme Mahlzeit, etc."),
    )
    portions = models.IntegerField(
        default=1,
        blank=True,
        null=True,
        verbose_name=_("Portionen"),
        help_text=_("Basis-Portionsanzahl (Normportionen)"),
    )

    # --- Personal recipe fields ---
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="owned_recipes",
        verbose_name=_("Besitzer"),
        help_text=_("Null = Inspi-verifiziertes Rezept, gesetzt = persönliches Rezept"),
    )
    forked_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="forks",
        verbose_name=_("Ursprungsrezept"),
        help_text=_("Referenz zum Original-Rezept bei persönlichen Kopien"),
    )
    visibility = models.CharField(
        max_length=10,
        choices=RecipeVisibility.choices,
        null=True,
        blank=True,
        verbose_name=_("Sichtbarkeit"),
        help_text=_("Nur relevant wenn owner gesetzt: private/group/public"),
    )
    folder = models.ForeignKey(
        "recipe.RecipeFolder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipes",
        verbose_name=_("Ordner"),
        help_text=_("Optionaler Ordner für persönliche Rezepte"),
    )

    # --- Popularity tracking ---
    usage_count = models.IntegerField(
        default=0,
        db_index=True,
        verbose_name=_("Verwendungsanzahl"),
        help_text=_("Wie oft dieses Rezept in Menüpläne eingefügt wurde (denormalisiert)"),
    )

    # --- Source URL (for imported recipes) ---
    source_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        verbose_name=_("Quell-URL"),
        help_text=_("Original-URL bei importierten Rezepten"),
    )

    # --- Cached nutritional values (denormalized, per-100g of total recipe) ---
    cached_energy_kcal = models.FloatField(null=True, blank=True, verbose_name=_("Energie (kcal, cached)"))
    cached_energy_total_kcal = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Gesamtenergie (kcal, cached)"),
    )
    cached_weight_g = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Gesamtgewicht (g, cached)"),
    )
    cached_protein_g = models.FloatField(null=True, blank=True, verbose_name=_("Eiweiß (g, cached)"))
    cached_fat_g = models.FloatField(null=True, blank=True, verbose_name=_("Fett (g, cached)"))
    cached_carbohydrate_g = models.FloatField(null=True, blank=True, verbose_name=_("Kohlenhydrate (g, cached)"))
    cached_sugar_g = models.FloatField(null=True, blank=True, verbose_name=_("Zucker (g, cached)"))
    cached_fibre_g = models.FloatField(null=True, blank=True, verbose_name=_("Ballaststoffe (g, cached)"))
    cached_salt_g = models.FloatField(null=True, blank=True, verbose_name=_("Salz (g, cached)"))
    cached_nutri_class = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Nutri-Score Klasse (cached)"),
        help_text=_("1=A, 2=B, 3=C, 4=D, 5=E"),
    )
    cached_price_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Gesamtpreis (cached)"),
    )
    # --- Cached micronutrient values (denormalized, per serving) ---
    cached_vitamin_c_mg = models.FloatField(null=True, blank=True, verbose_name=_("Vitamin C (mg, cached)"))
    cached_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Cache-Zeitpunkt"),
        help_text=_("Wann die gecachten Werte zuletzt berechnet wurden"),
    )

    # Data quality
    quality_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name=_("Datenqualität (0-100)"),
    )
    quality_score_updated_at = models.DateTimeField(null=True, blank=True)

    # --- Recipe-specific relations ---
    nutritional_tags = models.ManyToManyField(
        "supply.NutritionalTag",
        blank=True,
        related_name="recipes",
        verbose_name=_("Ernährungstags (auto-synchronisiert)"),
        help_text=_("Aus Zutaten berechnete Ernährungshinweise (auto-synchronisiert)"),
    )
    manual_nutritional_tags = models.ManyToManyField(
        "supply.NutritionalTag",
        blank=True,
        related_name="manual_recipes",
        verbose_name=_("Ernährungstags (manuell)"),
        help_text=_("Manuell gesetzte Ernährungshinweise, bleiben bei Sync erhalten"),
    )

    class Meta(Content.Meta):
        verbose_name = _("Rezept")
        verbose_name_plural = _("Rezepte")
        indexes = [
            GinIndex(fields=["search_vector"], name="recipe_search_idx"),
            models.Index(fields=["status", "created_at"], name="recipe_status_created_idx"),
            models.Index(fields=["recipe_type", "status", "created_at"], name="recipe_type_status_idx"),
            models.Index(fields=["like_score"], name="recipe_like_score_idx"),
            models.Index(fields=["view_count"], name="recipe_view_count_idx"),
            models.Index(fields=["owner", "visibility", "status"], name="recipe_owner_vis_status_idx"),
        ]

    @staticmethod
    def visible_for_user(user) -> models.Q:
        """Return Q filter for recipes visible to the given user.

        Visibility rules:
        - System recipes (owner=null) with status=approved -> visible to all
        - Community recipes (visibility=public, status=approved) -> visible to all
        - Owner's own recipes -> always visible to the owner
        - Private/group recipes from other users -> not visible
        """
        from content.choices import ContentStatus

        q = models.Q(owner__isnull=True, status=ContentStatus.APPROVED) | models.Q(
            visibility="public", status=ContentStatus.APPROVED
        )
        if user and user.is_authenticated:
            q = q | models.Q(owner=user)
        return q
