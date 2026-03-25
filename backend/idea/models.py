import hashlib

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from django.core.validators import MaxValueValidator, MinValueValidator

from .choices import (
    CommentStatus,
    CostsRatingChoices,
    DifficultyChoices,
    EmotionType,
    ExecutionTimeChoices,
    IdeaTypeChoices,
    IngredientStatusChoices,
    MaterialQuantityType,
    MeasuringUnitType,
    PhysicalViscosityChoices,
    PreparationTimeChoices,
    RecipeTypeChoices,
    StatusChoices,
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
# Hierarchical Tags (replaces Topic, TagCategory, ActivityType, Location, TimeSlot)
# ---------------------------------------------------------------------------


class Tag(models.Model):
    """Hierarchical tag with parent-child structure."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=120)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    icon = models.CharField(max_length=50, blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_approved = models.BooleanField(
        default=True,
        help_text=_("False für User-Vorschläge die noch nicht freigegeben sind"),
    )
    embedding = models.BinaryField(null=True, blank=True, verbose_name=_("Embedding"))

    class Meta:
        verbose_name = _("Tag")
        verbose_name_plural = _("Tags")
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def get_descendants(self):
        """Return all descendant tags (children, grandchildren, etc.)."""
        descendants = list(self.children.all())
        for child in list(descendants):
            descendants.extend(child.get_descendants())
        return descendants

    def get_ancestor_ids(self):
        """Return IDs of all ancestors up to root."""
        ids = []
        current = self.parent
        while current:
            ids.append(current.id)
            current = current.parent
        return ids


class TagSuggestion(TimeStampMixin):
    """User-suggested tags that need admin approval."""

    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        Tag,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="suggestions",
    )
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    is_processed = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Tag-Vorschlag")
        verbose_name_plural = _("Tag-Vorschläge")

    def __str__(self):
        return f"Vorschlag: {self.name}"


# ---------------------------------------------------------------------------
# Scout Levels (kept separate – not a tag)
# ---------------------------------------------------------------------------


class ScoutLevel(models.Model):
    """Scout level (Wölflinge, Jungpfadfinder, Pfadfinder, Rover)."""

    name = models.CharField(max_length=100)
    sorting = models.IntegerField(default=0)
    icon = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        verbose_name = _("Pfadfinder-Stufe")
        verbose_name_plural = _("Pfadfinder-Stufen")
        ordering = ["sorting"]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Material
# ---------------------------------------------------------------------------


class MaterialName(models.Model):
    """Predefined material names."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, default="")
    default_unit = models.ForeignKey(
        "MeasuringUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _("Materialname")
        verbose_name_plural = _("Materialnamen")

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=False)
            if not base_slug:
                base_slug = "material"
            slug = base_slug
            counter = 1
            while MaterialName.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Measuring Units (from inspi/food – for recipe ingredients)
# ---------------------------------------------------------------------------


class MeasuringUnit(TimeStampMixin):
    """Measuring unit with conversion factor (g, ml, Stück, etc.)."""

    name = models.CharField(max_length=255, verbose_name=_("Name"))
    description = models.CharField(max_length=255, blank=True, default="", verbose_name=_("Beschreibung"))
    quantity = models.FloatField(default=1, verbose_name=_("Umrechnungsfaktor"))
    unit = models.CharField(
        max_length=2,
        choices=MeasuringUnitType.choices,
        default=MeasuringUnitType.MASS,
        verbose_name=_("Einheit"),
    )

    class Meta:
        verbose_name = _("Maßeinheit")
        verbose_name_plural = _("Maßeinheiten")

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Nutritional Tags (dietary classification)
# ---------------------------------------------------------------------------


class NutritionalTag(TimeStampMixin):
    """Dietary classification tags (vegan, vegetarian, gluten-free, etc.)."""

    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("z.B. 'Fleisch', 'Alkohol', 'Nüsse', 'Scharf'"),
    )
    name_opposite = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Gegenbezeichnung"),
        help_text=_("z.B. 'Vegan', 'Vegetarisch', 'Alkoholfrei'"),
    )
    description = models.CharField(max_length=255, blank=True, default="")
    rank = models.IntegerField(default=1)
    is_dangerous = models.BooleanField(
        default=False,
        help_text=_("Kennzeichnet potenziell gefährliche Inhaltsstoffe (Allergene)"),
    )

    class Meta:
        verbose_name = _("Ernährungstag")
        verbose_name_plural = _("Ernährungstags")
        ordering = ["rank", "name"]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Ingredients (from inspi/food – ingredient database)
# ---------------------------------------------------------------------------


class Ingredient(TimeStampMixin):
    """Ingredient for recipes (Zutat)."""

    name = models.CharField(max_length=255, verbose_name=_("Name"))
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    physical_density = models.FloatField(default=1, verbose_name=_("Dichte"))
    physical_viscosity = models.CharField(
        max_length=10,
        choices=PhysicalViscosityChoices.choices,
        default=PhysicalViscosityChoices.SOLID,
        verbose_name=_("Aggregatzustand"),
    )
    standard_recipe_weight_g = models.FloatField(
        default=100,
        help_text=_("Standard-Gewicht in Gramm für ein Rezept"),
        blank=True,
        null=True,
        verbose_name=_("Standard-Rezeptgewicht (g)"),
    )
    energy_kj = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Energie (kJ)"))
    protein_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Eiweiß (g)"))
    fat_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Fett (g)"))
    carbohydrate_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Kohlenhydrate (g)"))
    sugar_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Zucker (g)"))
    fibre_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Ballaststoffe (g)"))
    salt_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Salz (g)"))
    ingredient_ref = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name=_("Referenz-Zutat"),
    )
    nutritional_tags = models.ManyToManyField(
        NutritionalTag, blank=True, related_name="ingredients",
        verbose_name=_("Ernährungstags"),
    )
    status = models.CharField(
        max_length=20,
        choices=IngredientStatusChoices.choices,
        default=IngredientStatusChoices.DRAFT,
        verbose_name=_("Status"),
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


class IngredientAlias(TimeStampMixin):
    """Alternative name for an ingredient."""

    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name="aliases",
    )
    name = models.CharField(
        max_length=100,
        verbose_name=_("Alternativname"),
        help_text=_("Alternativer Name für die Zutat"),
    )
    rank = models.IntegerField(default=1)

    class Meta:
        verbose_name = _("Zutaten-Alias")
        verbose_name_plural = _("Zutaten-Aliase")
        ordering = ["-rank", "name"]
        unique_together = ["ingredient", "rank"]

    def __str__(self):
        return f"{self.name} → {self.ingredient.name}"


# ---------------------------------------------------------------------------
# Portions (from inspi/food – specific portion of an ingredient)
# ---------------------------------------------------------------------------


class Portion(TimeStampMixin):
    """A specific portion/packaging of an ingredient with a measuring unit."""

    name = models.CharField(max_length=255, blank=True, default="", verbose_name=_("Name"))
    measuring_unit = models.ForeignKey(
        MeasuringUnit, on_delete=models.SET_NULL, blank=True, null=True,
        verbose_name=_("Maßeinheit"),
    )
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name="portions",
        verbose_name=_("Zutat"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    weight_g = models.FloatField(default=0, blank=True, null=True, verbose_name=_("Gewicht (g)"))
    rank = models.IntegerField(default=1)

    class Meta:
        verbose_name = _("Portion")
        verbose_name_plural = _("Portionen")
        ordering = ["name"]

    def __str__(self):
        unit = self.measuring_unit.name if self.measuring_unit else ""
        return f"{self.name} / {self.quantity} {unit} / {self.ingredient.name}"


# ---------------------------------------------------------------------------
# Idea (core model – replaces Activity)
# ---------------------------------------------------------------------------


class Idea(TimeStampMixin):
    """Core model: an idea for a Gruppenstunde."""

    idea_type = models.CharField(
        max_length=20,
        choices=IdeaTypeChoices.choices,
        default=IdeaTypeChoices.IDEA,
        verbose_name=_("Typ"),
        help_text=_("Idee, Wissensbeitrag oder Rezept"),
    )
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
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))

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
        verbose_name=_("Durchführungszeit"),
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
        choices=StatusChoices.choices,
        default=StatusChoices.DRAFT,
        verbose_name=_("Status"),
    )

    image = models.ImageField(upload_to="ideas/", blank=True, null=True, verbose_name=_("Bild"))
    like_score = models.IntegerField(default=0, verbose_name=_("Beliebtheit"))
    view_count = models.IntegerField(default=0, verbose_name=_("Aufrufe"))

    # Full-text search vector (auto-updated via trigger or signal)
    search_vector = SearchVectorField(null=True, blank=True)

    # pgvector embedding for similarity search (768 dimensions for Gemini embeddings)
    # Uses django-pgvector: from pgvector.django import VectorField
    # embedding = VectorField(dimensions=768, null=True, blank=True)
    # NOTE: Enable once django-pgvector is installed and pgvector extension is active
    embedding = models.BinaryField(null=True, blank=True, verbose_name=_("Embedding"))

    # Recipe-specific fields (only used when idea_type == 'recipe')
    servings = models.IntegerField(
        default=4,
        blank=True,
        null=True,
        verbose_name=_("Portionen"),
        help_text=_("Anzahl der Portionen (nur für Rezepte)"),
    )
    recipe_type = models.CharField(
        max_length=20,
        choices=RecipeTypeChoices.choices,
        blank=True,
        default="",
        verbose_name=_("Rezepttyp"),
        help_text=_("Frühstück, Warme Mahlzeit, Snack, etc. (nur für Rezepte)"),
    )

    # Relations
    scout_levels = models.ManyToManyField(ScoutLevel, blank=True, related_name="ideas")
    tags = models.ManyToManyField(Tag, blank=True, related_name="ideas")
    authors = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="authored_ideas")
    nutritional_tags = models.ManyToManyField(
        NutritionalTag, blank=True, related_name="ideas",
        verbose_name=_("Ernährungstags"),
        help_text=_("Ernährungshinweise wie vegan, vegetarisch, etc. (nur für Rezepte)"),
    )

    class Meta:
        verbose_name = _("Idee")
        verbose_name_plural = _("Ideen")
        ordering = ["-created_at"]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["idea_type", "status", "-created_at"]),
            models.Index(fields=["-like_score"]),
            models.Index(fields=["-view_count"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title, allow_unicode=False)
            if not base_slug:
                base_slug = "idee"
            slug = base_slug
            counter = 1
            while Idea.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class MaterialItem(models.Model):
    """Material item for an idea (used for idea_type='idea')."""

    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="materials")
    quantity = models.CharField(max_length=50, blank=True, default="")
    material_name = models.ForeignKey(MaterialName, on_delete=models.SET_NULL, null=True, blank=True)
    material_unit = models.ForeignKey(MeasuringUnit, on_delete=models.SET_NULL, null=True, blank=True)
    quantity_type = models.CharField(
        max_length=20,
        choices=MaterialQuantityType.choices,
        default=MaterialQuantityType.ONCE,
        verbose_name=_("Mengenart"),
        help_text=_("Einmalig = wird einmal benötigt, Pro Person = Menge pro Person"),
    )

    class Meta:
        verbose_name = _("Material")
        verbose_name_plural = _("Materialien")

    def __str__(self):
        return f"{self.quantity} {self.material_name}"


class RecipeItem(models.Model):
    """Ingredient item for a recipe-type idea (Zutat im Rezept)."""

    idea = models.ForeignKey(
        Idea, on_delete=models.CASCADE, related_name="recipe_items",
        verbose_name=_("Rezept"),
    )
    portion = models.ForeignKey(
        Portion, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="recipe_items",
        verbose_name=_("Portion"),
    )
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="recipe_items",
        verbose_name=_("Zutat"),
        help_text=_("Direkte Zutat (wenn keine Portion gewählt)"),
    )
    quantity = models.FloatField(default=1, verbose_name=_("Menge"))
    measuring_unit = models.ForeignKey(
        MeasuringUnit, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name=_("Maßeinheit"),
    )
    sort_order = models.IntegerField(default=0, verbose_name=_("Reihenfolge"))
    note = models.CharField(
        max_length=255, blank=True, default="",
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
# Comments (with moderation)
# ---------------------------------------------------------------------------


class Comment(TimeStampMixin):
    """Nested comment on an idea with moderation support."""

    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="comments")
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
        related_name="comments",
    )
    status = models.CharField(
        max_length=20,
        choices=CommentStatus.choices,
        default=CommentStatus.PENDING,
        verbose_name=_("Moderations-Status"),
    )

    class Meta:
        verbose_name = _("Kommentar")
        verbose_name_plural = _("Kommentare")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Kommentar zu {self.idea.title}"


# ---------------------------------------------------------------------------
# Emotions / Reactions
# ---------------------------------------------------------------------------


class Emotion(models.Model):
    """Emotion/reaction on an idea (anonymous allowed)."""

    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="emotions")
    emotion_type = models.CharField(max_length=20, choices=EmotionType.choices)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Bewertung")
        verbose_name_plural = _("Bewertungen")

    def __str__(self):
        return f"{self.emotion_type} für {self.idea.title}"


# ---------------------------------------------------------------------------
# Idea of the Week
# ---------------------------------------------------------------------------


class IdeaOfTheWeek(models.Model):
    """Featured idea of the week."""

    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="featured_weeks")
    release_date = models.DateField(unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = _("Idee der Woche")
        verbose_name_plural = _("Ideen der Woche")
        ordering = ["-release_date"]

    def __str__(self):
        return f"{self.idea.title} ({self.release_date})"


# ---------------------------------------------------------------------------
# View Logging (bot-free, DSGVO-compliant)
# ---------------------------------------------------------------------------


class IdeaView(models.Model):
    """Bot-free view logging with hashed IPs (DSGVO-compliant)."""

    idea = models.ForeignKey(Idea, on_delete=models.CASCADE, related_name="views")
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
        verbose_name = _("Ideenaufruf")
        verbose_name_plural = _("Ideenaufrufe")
        indexes = [
            models.Index(fields=["idea", "session_key", "created_at"]),
        ]

    def __str__(self):
        return f"View: {self.idea.title} ({self.created_at})"

    @staticmethod
    def hash_ip(ip: str) -> str:
        """Hash an IP address with SHA-256 for DSGVO compliance."""
        return hashlib.sha256(ip.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Search Logging
# ---------------------------------------------------------------------------


class SearchLog(models.Model):
    """Log of search queries for analytics (DSGVO-compliant)."""

    query = models.CharField(max_length=500, verbose_name=_("Suchbegriff"))
    results_count = models.IntegerField(default=0, verbose_name=_("Ergebnisse"))
    session_key = models.CharField(max_length=40, blank=True, default="")
    ip_hash = models.CharField(max_length=64, blank=True, default="", help_text=_("SHA-256 gehashte IP"))
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Suchanfrage")
        verbose_name_plural = _("Suchanfragen")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f'Suche: "{self.query}" ({self.created_at})'


# ---------------------------------------------------------------------------
# User Preferences
# ---------------------------------------------------------------------------


class UserPreferences(models.Model):
    """User preferences for default search/filter values."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences",
    )
    preferred_scout_level = models.ForeignKey(
        ScoutLevel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    preferred_group_size_min = models.IntegerField(null=True, blank=True)
    preferred_group_size_max = models.IntegerField(null=True, blank=True)
    preferred_difficulty = models.CharField(
        max_length=20,
        choices=DifficultyChoices.choices,
        blank=True,
        default="",
    )
    preferred_location = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        verbose_name = _("Benutzereinstellungen")
        verbose_name_plural = _("Benutzereinstellungen")

    def __str__(self):
        return f"Einstellungen von {self.user}"
