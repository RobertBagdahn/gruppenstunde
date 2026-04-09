"""MealEvent, Meal, and MealItem models."""

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
]

# Default start/end times per meal type (hour, minute)
MEAL_TYPE_DEFAULT_TIMES: dict[str, tuple[tuple[int, int], tuple[int, int]]] = {
    MealTypeChoices.BREAKFAST: ((8, 0), (9, 0)),
    MealTypeChoices.LUNCH: ((12, 0), (13, 0)),
    MealTypeChoices.DINNER: ((18, 0), (19, 0)),
    MealTypeChoices.SNACK: ((15, 0), (15, 30)),
    MealTypeChoices.DESSERT: ((19, 30), (20, 0)),
}


class MealEvent(models.Model):
    """Meal event plan for scout events or standalone use."""

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
        related_name="meal_events",
        verbose_name=_("Event"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meal_events",
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
                base_slug = "meal-event"
            slug = base_slug
            counter = 1
            while MealEvent.objects.filter(slug=slug).exclude(pk=self.pk).exists():
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
                meal_event=self,
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

    meal_event = models.ForeignKey(
        MealEvent,
        on_delete=models.CASCADE,
        related_name="meals",
        verbose_name=_("Essensplan"),
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

    class Meta:
        verbose_name = _("Mahlzeit")
        verbose_name_plural = _("Mahlzeiten")
        ordering = ["start_datetime", "meal_type"]

    def __str__(self) -> str:
        date_str = self.start_datetime.strftime("%Y-%m-%d") if self.start_datetime else "?"
        return f"{date_str} – {self.get_meal_type_display()}"

    def clean(self) -> None:
        """Validate uniqueness of (meal_event, date, meal_type)."""
        if self.start_datetime and self.meal_event_id:
            date = self.start_datetime.date()
            qs = Meal.objects.filter(
                meal_event=self.meal_event,
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
