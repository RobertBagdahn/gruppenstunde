from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


class WeekdayChoices(models.IntegerChoices):
    MONDAY = 0, _("Montag")
    TUESDAY = 1, _("Dienstag")
    WEDNESDAY = 2, _("Mittwoch")
    THURSDAY = 3, _("Donnerstag")
    FRIDAY = 4, _("Freitag")
    SATURDAY = 5, _("Samstag")
    SUNDAY = 6, _("Sonntag")


class EntryStatusChoices(models.TextChoices):
    PLANNED = "planned", _("Geplant")
    CANCELLED = "cancelled", _("Fällt aus")


class Planner(models.Model):
    """Collaborative weekly session planner for Gruppenstunden."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="planners",
    )
    title = models.CharField(max_length=200, verbose_name=_("Titel"))
    group = models.ForeignKey(
        "profiles.UserGroup",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="planners",
        verbose_name=_("Gruppe"),
    )
    weekday = models.IntegerField(
        choices=WeekdayChoices.choices,
        default=WeekdayChoices.FRIDAY,
        verbose_name=_("Wochentag"),
    )
    time = models.TimeField(
        default="18:00",
        verbose_name=_("Uhrzeit"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Planer")
        verbose_name_plural = _("Planer")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class PlannerEntry(models.Model):
    """A single entry in a planner (idea assigned to a date)."""

    planner = models.ForeignKey(
        Planner,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    idea = models.ForeignKey(
        "idea.Idea",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="planner_entries",
    )
    date = models.DateField(verbose_name=_("Datum"))
    notes = models.TextField(blank=True, default="", verbose_name=_("Notizen"))
    status = models.CharField(
        max_length=10,
        choices=EntryStatusChoices.choices,
        default=EntryStatusChoices.PLANNED,
        verbose_name=_("Status"),
    )
    sort_order = models.IntegerField(default=0)

    class Meta:
        verbose_name = _("Planereintrag")
        verbose_name_plural = _("Planereinträge")
        ordering = ["date", "sort_order"]

    def __str__(self):
        idea_title = self.idea.title if self.idea else "Leer"
        return f"{self.date}: {idea_title}"


class PlannerCollaborator(models.Model):
    """User who can view or edit a planner."""

    class Role(models.TextChoices):
        EDITOR = "editor", _("Editor")
        VIEWER = "viewer", _("Viewer")

    planner = models.ForeignKey(
        Planner,
        on_delete=models.CASCADE,
        related_name="collaborators",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_planners",
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    invited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Mitarbeiter")
        verbose_name_plural = _("Mitarbeiter")
        unique_together = ["planner", "user"]


# ==========================================================================
# Meal Plan Models
# ==========================================================================


class MealTypeChoices(models.TextChoices):
    BREAKFAST = "breakfast", _("Frühstück")
    LUNCH = "lunch", _("Mittagessen")
    DINNER = "dinner", _("Abendessen")
    SNACK = "snack", _("Snack")
    DESSERT = "dessert", _("Dessert")


# Default day_part_factor per meal type
MEAL_TYPE_DAY_FACTORS: dict[str, float] = {
    MealTypeChoices.BREAKFAST: 0.25,
    MealTypeChoices.LUNCH: 0.35,
    MealTypeChoices.DINNER: 0.30,
    MealTypeChoices.SNACK: 0.10,
    MealTypeChoices.DESSERT: 0.00,
}

# Default meals auto-created for each MealDay
DEFAULT_MEAL_TYPES = [
    MealTypeChoices.BREAKFAST,
    MealTypeChoices.LUNCH,
    MealTypeChoices.DINNER,
]


class MealPlan(models.Model):
    """Meal plan for scout events or standalone use."""

    name = models.CharField(max_length=200, verbose_name=_("Name"))
    slug = models.SlugField(max_length=220, unique=True, blank=True, verbose_name=_("Slug"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    norm_portions = models.IntegerField(default=10, verbose_name=_("Norm-Portionen"))
    activity_factor = models.FloatField(default=1.5, verbose_name=_("Aktivitätsfaktor (PAL)"))
    reserve_factor = models.FloatField(default=1.1, verbose_name=_("Reservefaktor"))
    event = models.ForeignKey(
        "event.Event",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="meal_plans",
        verbose_name=_("Event"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meal_plans",
        verbose_name=_("Erstellt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Essensplan")
        verbose_name_plural = _("Essenspläne")
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=False)
            if not base_slug:
                base_slug = "meal-plan"
            slug = base_slug
            counter = 1
            while MealPlan.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def scaling_factor(self) -> float:
        """Total scaling = norm_portions * activity_factor * reserve_factor."""
        return self.norm_portions * self.activity_factor * self.reserve_factor


class MealDay(models.Model):
    """A single day within a meal plan."""

    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.CASCADE,
        related_name="days",
        verbose_name=_("Essensplan"),
    )
    date = models.DateField(verbose_name=_("Datum"))

    class Meta:
        verbose_name = _("Essenstag")
        verbose_name_plural = _("Essenstage")
        ordering = ["date"]
        unique_together = ["meal_plan", "date"]

    def __str__(self):
        return f"{self.meal_plan.name} – {self.date}"

    def create_default_meals(self):
        """Create the default meal slots (breakfast, lunch, dinner)."""
        for meal_type in DEFAULT_MEAL_TYPES:
            Meal.objects.get_or_create(
                meal_day=self,
                meal_type=meal_type,
                defaults={"day_part_factor": MEAL_TYPE_DAY_FACTORS.get(meal_type, 0.0)},
            )


class Meal(models.Model):
    """A single meal within a day (e.g. breakfast, lunch)."""

    meal_day = models.ForeignKey(
        MealDay,
        on_delete=models.CASCADE,
        related_name="meals",
        verbose_name=_("Essenstag"),
    )
    meal_type = models.CharField(
        max_length=10,
        choices=MealTypeChoices.choices,
        verbose_name=_("Mahlzeittyp"),
    )
    time_start = models.TimeField(null=True, blank=True, verbose_name=_("Startzeit"))
    time_end = models.TimeField(null=True, blank=True, verbose_name=_("Endzeit"))
    day_part_factor = models.FloatField(
        default=0.30,
        verbose_name=_("Tagesanteil"),
        help_text=_("Anteil am Tagesbedarf (z.B. Frühstück=0.25, Mittag=0.35)"),
    )

    class Meta:
        verbose_name = _("Mahlzeit")
        verbose_name_plural = _("Mahlzeiten")
        ordering = ["meal_type"]

    def __str__(self):
        return f"{self.meal_day.date} – {self.get_meal_type_display()}"


class MealItem(models.Model):
    """A recipe assigned to a meal."""

    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("Mahlzeit"),
    )
    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.CASCADE,
        related_name="meal_items",
        verbose_name=_("Rezept"),
    )
    factor = models.FloatField(default=1.0, verbose_name=_("Skalierungsfaktor"))

    class Meta:
        verbose_name = _("Mahlzeit-Rezept")
        verbose_name_plural = _("Mahlzeit-Rezepte")
        ordering = ["id"]

    def __str__(self):
        return f"{self.meal} – {self.recipe.title}"
