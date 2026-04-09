"""Recipe model — inherits from Content abstract base."""

from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.utils.translation import gettext_lazy as _

from content.models import Content
from supply.choices import RecipeTypeChoices


class Recipe(Content):
    """
    Standalone recipe model — inherits shared fields from Content.

    Recipe-specific fields: recipe_type, servings, nutritional_tags.
    All other fields (title, slug, summary, description, difficulty,
    costs_rating, execution_time, preparation_time, status, image,
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
        help_text=_("Frühstück, Warme Mahlzeit, Snack, etc."),
    )
    servings = models.IntegerField(
        default=1,
        blank=True,
        null=True,
        verbose_name=_("Portionen"),
        help_text=_("Basis-Portionsanzahl (Normportionen)"),
    )

    # --- Cached nutritional values (denormalized, per-100g of total recipe) ---
    cached_energy_kj = models.FloatField(null=True, blank=True, verbose_name=_("Energie (kJ, cached)"))
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
    cached_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Cache-Zeitpunkt"),
        help_text=_("Wann die gecachten Werte zuletzt berechnet wurden"),
    )

    # --- Recipe-specific relations ---
    nutritional_tags = models.ManyToManyField(
        "supply.NutritionalTag",
        blank=True,
        related_name="recipes",
        verbose_name=_("Ernährungstags"),
        help_text=_("Ernährungshinweise wie vegan, vegetarisch, etc."),
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
        ]
