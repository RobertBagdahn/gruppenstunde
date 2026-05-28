"""MealPlan, Meal, and MealItem models."""

import datetime as dt

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


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

# Default meals auto-created for each day
DEFAULT_MEAL_TYPES = [
    MealTypeChoices.BREAKFAST,
    MealTypeChoices.LUNCH,
    MealTypeChoices.DINNER,
    MealTypeChoices.SNACK,
]

# Default start/end times per meal type (hour, minute)
MEAL_TYPE_DEFAULT_TIMES: dict[str, tuple[tuple[int, int], tuple[int, int]]] = {
    MealTypeChoices.BREAKFAST: ((8, 0), (9, 0)),
    MealTypeChoices.LUNCH: ((12, 0), (13, 0)),
    MealTypeChoices.DINNER: ((18, 0), (19, 0)),
    MealTypeChoices.SNACK: ((15, 0), (15, 30)),
    MealTypeChoices.DESSERT: ((19, 30), (20, 0)),
}


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
        db_table = "planner_mealplan"
        verbose_name = _("Essensplan")
        verbose_name_plural = _("Essenspläne")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
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

    def create_default_meals_for_date(self, date: dt.date) -> list["Meal"]:
        """Create the default meal slots (breakfast, lunch, dinner) for a given date."""
        meals = []
        for meal_type in DEFAULT_MEAL_TYPES:
            times = MEAL_TYPE_DEFAULT_TIMES.get(meal_type, ((12, 0), (13, 0)))
            start_dt = timezone.make_aware(dt.datetime.combine(date, dt.time(times[0][0], times[0][1])))
            end_dt = timezone.make_aware(dt.datetime.combine(date, dt.time(times[1][0], times[1][1])))
            meal, _created = Meal.objects.get_or_create(
                meal_plan=self,
                start_datetime__date=date,
                meal_type=meal_type,
                defaults={
                    "start_datetime": start_dt,
                    "end_datetime": end_dt,
                    "day_part_factor": MEAL_TYPE_DAY_FACTORS.get(meal_type, 0.0),
                },
            )
            meals.append(meal)
        return meals


class Meal(models.Model):
    """A single meal (e.g. breakfast, lunch) with start and end datetime."""

    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.CASCADE,
        related_name="meals",
        verbose_name=_("Essensplan"),
        db_column="meal_event_id",
    )
    start_datetime = models.DateTimeField(
        db_index=True,
        verbose_name=_("Startzeit"),
    )
    end_datetime = models.DateTimeField(
        verbose_name=_("Endzeit"),
    )
    meal_type = models.CharField(
        max_length=10,
        choices=MealTypeChoices.choices,
        verbose_name=_("Mahlzeittyp"),
    )
    day_part_factor = models.FloatField(
        default=0.30,
        verbose_name=_("Tagesanteil"),
        help_text=_("Anteil am Tagesbedarf (z.B. Frühstück=0.25, Mittag=0.35)"),
    )
    override_portions = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Portionen-Override"),
        help_text=_("Überschreibt norm_portions des Plans für diese Mahlzeit (z.B. Tagesgäste)"),
    )
    note = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Notiz"),
    )
    note_is_published = models.BooleanField(
        default=False,
        verbose_name=_("Notiz sichtbar"),
        help_text=_("Wenn True, erscheint die Notiz im PDF/Ausdruck"),
    )

    class Meta:
        verbose_name = _("Mahlzeit")
        verbose_name_plural = _("Mahlzeiten")
        ordering = ["start_datetime", "meal_type"]

    def __str__(self) -> str:
        date_str = self.start_datetime.strftime("%Y-%m-%d") if self.start_datetime else "?"
        return f"{date_str} – {self.get_meal_type_display()}"

    def clean(self) -> None:
        """Validate uniqueness of (meal_plan, date, meal_type)."""
        if self.start_datetime and self.meal_plan_id:
            date = self.start_datetime.date()
            qs = Meal.objects.filter(
                meal_plan=self.meal_plan,
                start_datetime__date=date,
                meal_type=self.meal_type,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(_("Es existiert bereits eine Mahlzeit dieses Typs an diesem Tag."))

    def save(self, *args, **kwargs) -> None:
        self.clean()
        super().save(*args, **kwargs)


class MealItem(models.Model):
    """A recipe or ingredient assigned to a meal."""

    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("Mahlzeit"),
    )
    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="meal_items",
        verbose_name=_("Rezept"),
    )
    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="meal_items",
        verbose_name=_("Zutat"),
        help_text=_("Alternative zu Rezept — Einzelzutat im Plan"),
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Menge"),
        help_text=_("Menge für Einzelzutat"),
    )
    measuring_unit = models.ForeignKey(
        "supply.MeasuringUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meal_items",
        verbose_name=_("Einheit"),
    )
    display_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_("Anzeigename"),
        help_text=_("Überschreibt den automatischen Rezept-/Zutatennamen"),
    )
    factor = models.FloatField(default=1.0, verbose_name=_("Skalierungsfaktor"))

    class Meta:
        verbose_name = _("Mahlzeit-Eintrag")
        verbose_name_plural = _("Mahlzeit-Einträge")
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(recipe__isnull=False, ingredient__isnull=True)
                    | models.Q(recipe__isnull=True, ingredient__isnull=False)
                ),
                name="meal_item_recipe_xor_ingredient",
            ),
        ]

    def __str__(self):
        name = self.display_name or (self.recipe.title if self.recipe else self.ingredient.name if self.ingredient else "?")
        return f"{self.meal} – {name}"


class MealPlanCollaboratorRole(models.TextChoices):
    VIEWER = "viewer", _("Betrachter")
    EDITOR = "editor", _("Bearbeiter")
    ADMIN = "admin", _("Admin")


class MealPlanCollaborator(models.Model):
    """Links a user to a meal plan with a specific role."""

    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.CASCADE,
        related_name="collaborators",
        verbose_name=_("Essensplan"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meal_plan_collaborations",
        verbose_name=_("Nutzer"),
    )
    role = models.CharField(
        max_length=10,
        choices=MealPlanCollaboratorRole.choices,
        default=MealPlanCollaboratorRole.VIEWER,
        verbose_name=_("Rolle"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Essensplan-Mitglied")
        verbose_name_plural = _("Essensplan-Mitglieder")
        unique_together = [("meal_plan", "user")]
        ordering = ["role", "user__username"]

    def __str__(self) -> str:
        return f"{self.user} – {self.get_role_display()} ({self.meal_plan.name})"


class MealItemOverride(models.Model):
    """Override a specific recipe ingredient within a meal item."""

    meal_item = models.ForeignKey(
        MealItem,
        on_delete=models.CASCADE,
        related_name="overrides",
        verbose_name=_("Mahlzeit-Eintrag"),
    )
    recipe_item = models.ForeignKey(
        "recipe.RecipeItem",
        on_delete=models.CASCADE,
        related_name="meal_overrides",
        verbose_name=_("Rezept-Zutat"),
    )
    quantity_override = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Menge-Override"),
        help_text=_("Überschreibt die Original-Menge, null = Original beibehalten"),
    )
    excluded = models.BooleanField(
        default=False,
        verbose_name=_("Ausgeschlossen"),
        help_text=_("Zutat wird aus Einkaufsliste/Nährwertberechnung entfernt"),
    )

    class Meta:
        verbose_name = _("Zutat-Override")
        verbose_name_plural = _("Zutat-Overrides")
        unique_together = [("meal_item", "recipe_item")]

    def __str__(self):
        return f"{self.meal_item} → {self.recipe_item} (override)"
