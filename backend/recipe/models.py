from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from django.core.validators import MaxValueValidator, MinValueValidator

from .choices import (
    CostsRatingChoices,
    DifficultyChoices,
    ExecutionTimeChoices,
    HintLevelChoices,
    HintMinMaxChoices,
    HintParameterChoices,
    MaterialQuantityType,
    PreparationTimeChoices,
    RecipeObjectiveChoices,
    RecipeStatusChoices,
    RecipeTypeChoices,
)


class TimeStampMixin(models.Model):
    """Abstract base model with timestamp fields."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )
    is_public = models.BooleanField(default=True)

    class Meta:
        abstract = True


# ---------------------------------------------------------------------------
# Recipe (standalone – no longer a type of Idea)
# ---------------------------------------------------------------------------


class Recipe(TimeStampMixin):
    """Standalone recipe model – separated from Idea."""

    # --- Idea-Basis fields (shared structure) ---
    title = models.CharField(max_length=255, verbose_name=_("Titel"))
    slug = models.SlugField(
        max_length=280,
        unique=True,
        blank=True,
        verbose_name=_("Slug"),
        help_text=_("URL-freundlicher Name, wird automatisch aus dem Titel generiert"),
    )
    summary = models.TextField(blank=True, default="", verbose_name=_("Kurzbeschreibung"))
    summary_long = models.TextField(blank=True, default="", verbose_name=_("Ausführliche Zusammenfassung"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung / Anleitung"))

    costs_rating = models.CharField(
        max_length=20,
        choices=CostsRatingChoices.choices,
        default=CostsRatingChoices.FREE,
        verbose_name=_("Kosten"),
    )
    execution_time = models.CharField(
        max_length=20,
        choices=ExecutionTimeChoices.choices,
        default=ExecutionTimeChoices.LESS_30,
        verbose_name=_("Zubereitungszeit"),
    )
    preparation_time = models.CharField(
        max_length=20,
        choices=PreparationTimeChoices.choices,
        default=PreparationTimeChoices.NONE,
        verbose_name=_("Vorbereitungszeit"),
    )
    difficulty = models.CharField(
        max_length=20,
        choices=DifficultyChoices.choices,
        default=DifficultyChoices.EASY,
        verbose_name=_("Schwierigkeit"),
    )
    status = models.CharField(
        max_length=20,
        choices=RecipeStatusChoices.choices,
        default=RecipeStatusChoices.DRAFT,
        verbose_name=_("Status"),
    )

    image = models.ImageField(upload_to="recipes/", blank=True, null=True, verbose_name=_("Bild"))
    like_score = models.IntegerField(default=0, verbose_name=_("Beliebtheit"))
    view_count = models.IntegerField(default=0, verbose_name=_("Aufrufe"))

    # Full-text search vector
    search_vector = SearchVectorField(null=True, blank=True)

    # Embedding for similarity search
    embedding = models.BinaryField(null=True, blank=True, verbose_name=_("Embedding"))

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
        default=4,
        blank=True,
        null=True,
        verbose_name=_("Portionen"),
        help_text=_("Anzahl der Portionen"),
    )

    # --- Relations (shared) ---
    scout_levels = models.ManyToManyField(
        "idea.ScoutLevel",
        blank=True,
        related_name="recipes",
        verbose_name=_("Pfadfinder-Stufen"),
    )
    tags = models.ManyToManyField(
        "idea.Tag",
        blank=True,
        related_name="recipes",
        verbose_name=_("Tags"),
    )
    authors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="authored_recipes",
        verbose_name=_("Autoren"),
    )
    nutritional_tags = models.ManyToManyField(
        "idea.NutritionalTag",
        blank=True,
        related_name="recipes",
        verbose_name=_("Ernährungstags"),
        help_text=_("Ernährungshinweise wie vegan, vegetarisch, etc."),
    )

    class Meta:
        verbose_name = _("Rezept")
        verbose_name_plural = _("Rezepte")
        ordering = ["-created_at"]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["recipe_type", "status", "-created_at"]),
            models.Index(fields=["-like_score"]),
            models.Index(fields=["-view_count"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title, allow_unicode=False)
            if not base_slug:
                base_slug = "rezept"
            slug = base_slug
            counter = 1
            while Recipe.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# RecipeItem (ingredient in a recipe)
# ---------------------------------------------------------------------------


class RecipeItem(models.Model):
    """Ingredient item for a recipe (Zutat im Rezept)."""

    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="recipe_items",
        verbose_name=_("Rezept"),
    )
    portion = models.ForeignKey(
        "idea.Portion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipe_items",
        verbose_name=_("Portion"),
    )
    ingredient = models.ForeignKey(
        "idea.Ingredient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipe_items",
        verbose_name=_("Zutat"),
        help_text=_("Direkte Zutat (wenn keine Portion gewählt)"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    measuring_unit = models.ForeignKey(
        "idea.MeasuringUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Maßeinheit"),
    )
    sort_order = models.IntegerField(default=0, verbose_name=_("Reihenfolge"))
    note = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Anmerkung"),
        help_text=_("z.B. 'gehackt', 'in Scheiben', 'optional'"),
    )
    quantity_type = models.CharField(
        max_length=20,
        choices=MaterialQuantityType.choices,
        default=MaterialQuantityType.ONCE,
        verbose_name=_("Mengenart"),
        help_text=_("Einmalig = Gesamtmenge, Pro Person = Menge pro Person"),
    )

    class Meta:
        verbose_name = _("Rezept-Zutat")
        verbose_name_plural = _("Rezept-Zutaten")
        ordering = ["sort_order"]

    def __str__(self):
        name = self.portion or self.ingredient or "?"
        return f"{self.quantity} x {name}"


# ---------------------------------------------------------------------------
# RecipeHint (rule-based improvement suggestions)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Recipe Comments
# ---------------------------------------------------------------------------


class RecipeComment(TimeStampMixin):
    """Comment on a recipe with moderation support."""

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="comments")
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    text = models.TextField(verbose_name=_("Kommentar"))
    author_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Name (anonym)"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipe_comments",
    )
    status = models.CharField(
        max_length=20,
        default="pending",
        verbose_name=_("Moderations-Status"),
    )

    class Meta:
        verbose_name = _("Rezept-Kommentar")
        verbose_name_plural = _("Rezept-Kommentare")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Kommentar zu {self.recipe.title}"


# ---------------------------------------------------------------------------
# Recipe Emotions / Reactions
# ---------------------------------------------------------------------------


class RecipeEmotion(models.Model):
    """Emotion/reaction on a recipe (anonymous allowed)."""

    EMOTION_CHOICES = [
        ("in_love", "Begeistert"),
        ("happy", "Gut"),
        ("disappointed", "Enttäuscht"),
        ("complex", "Zu komplex"),
    ]

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="emotions")
    emotion_type = models.CharField(max_length=20, choices=EMOTION_CHOICES)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Rezept-Bewertung")
        verbose_name_plural = _("Rezept-Bewertungen")

    def __str__(self):
        return f"{self.emotion_type} für {self.recipe.title}"


# ---------------------------------------------------------------------------
# Recipe View Logging
# ---------------------------------------------------------------------------


class RecipeView(models.Model):
    """Bot-free view logging with hashed IPs (DSGVO-compliant)."""

    import hashlib

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="views")
    session_key = models.CharField(max_length=40, db_index=True)
    ip_hash = models.CharField(max_length=64, help_text=_("SHA-256 gehashte IP"))
    user_agent = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    class Meta:
        verbose_name = _("Rezeptaufruf")
        verbose_name_plural = _("Rezeptaufrufe")
        indexes = [
            models.Index(fields=["recipe", "session_key", "created_at"]),
        ]

    def __str__(self):
        return f"View: {self.recipe.title} ({self.created_at})"

    @staticmethod
    def hash_ip(ip: str) -> str:
        """Hash an IP address with SHA-256 for DSGVO compliance."""
        import hashlib

        return hashlib.sha256(ip.encode()).hexdigest()
