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
    DRINKS = "drinks", _("Getränke")


# Default day_part_factor per meal type
MEAL_TYPE_DAY_FACTORS: dict[str, float] = {
    MealTypeChoices.BREAKFAST: 0.25,
    MealTypeChoices.LUNCH: 0.35,
    MealTypeChoices.DINNER: 0.30,
    MealTypeChoices.SNACK: 0.10,
    MealTypeChoices.DRINKS: 0.00,
}

# Default meals auto-created for each day
DEFAULT_MEAL_TYPES = [
    MealTypeChoices.BREAKFAST,
    MealTypeChoices.LUNCH,
    MealTypeChoices.DINNER,
    MealTypeChoices.SNACK,
    MealTypeChoices.DRINKS,
]

# Default start/end times per meal type (hour, minute)
MEAL_TYPE_DEFAULT_TIMES: dict[str, tuple[tuple[int, int], tuple[int, int]]] = {
    MealTypeChoices.BREAKFAST: ((8, 0), (9, 0)),
    MealTypeChoices.LUNCH: ((12, 0), (13, 0)),
    MealTypeChoices.DINNER: ((18, 0), (19, 0)),
    MealTypeChoices.SNACK: ((15, 0), (15, 30)),
    MealTypeChoices.DRINKS: ((16, 0), (16, 30)),
}


def default_day_part_factors() -> dict[str, float]:
    """Default day_part_factor per meal type."""
    return {
        "breakfast": 0.25,
        "lunch": 0.35,
        "dinner": 0.30,
        "snack": 0.10,
        "drinks": 0.00,
    }


class MealPlan(models.Model):
    """Meal plan for scout events or standalone use."""

    name = models.CharField(max_length=200, verbose_name=_("Name"))
    slug = models.SlugField(max_length=220, unique=True, blank=True, verbose_name=_("Slug"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    norm_portions = models.IntegerField(default=10, verbose_name=_("Norm-Portionen"))
    reserve_factor = models.FloatField(default=1.1, verbose_name=_("Reservefaktor"))
    event = models.ForeignKey(
        "event.Event",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="meal_plans",
        verbose_name=_("Event"),
    )
    start_datetime = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Startdatum/-zeit")
    )
    end_datetime = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Enddatum/-zeit")
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meal_plans",
        verbose_name=_("Erstellt von"),
    )
    budget_per_person_per_day = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Budget pro Person/Tag"),
        help_text=_("Maximales Budget in Euro pro Person und Tag"),
    )
    day_part_factors = models.JSONField(
        default=default_day_part_factors,
        verbose_name=_("Tagesanteile"),
        help_text=_("Gewichtung der Mahlzeittypen für diesen Plan"),
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
        is_new = self.pk is None
        old_day_part_factors = None
        if not is_new:
            try:
                old_day_part_factors = MealPlan.objects.get(pk=self.pk).day_part_factors
            except MealPlan.DoesNotExist:
                pass

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

        if not is_new and old_day_part_factors != self.day_part_factors:
            for meal_type, new_val in (self.day_part_factors or {}).items():
                old_val = (old_day_part_factors or {}).get(meal_type)
                if old_val is not None and old_val != new_val:
                    self.meals.filter(meal_type=meal_type, day_part_factor=old_val).update(day_part_factor=new_val)

    @property
    def scaling_factor(self) -> float:
        """Total scaling = norm_portions * reserve_factor.

        PAL/activity factor is intentionally excluded: it is a calorie-demand
        factor (norm-portion calculator), not a physical purchase-quantity factor.
        """
        return self.norm_portions * self.reserve_factor

    def create_default_meals_for_date(self, date: dt.date) -> list["Meal"]:
        """Create the default meal slots (breakfast, lunch, dinner) for a given date."""
        meals = []
        for meal_type in DEFAULT_MEAL_TYPES:
            times = MEAL_TYPE_DEFAULT_TIMES.get(meal_type, ((12, 0), (13, 0)))
            start_dt = timezone.make_aware(dt.datetime.combine(date, dt.time(times[0][0], times[0][1])))
            end_dt = timezone.make_aware(dt.datetime.combine(date, dt.time(times[1][0], times[1][1])))
            factor = (self.day_part_factors or {}).get(meal_type, MEAL_TYPE_DAY_FACTORS.get(meal_type, 0.0))
            meal, _created = Meal.objects.get_or_create(
                meal_plan=self,
                start_datetime__date=date,
                meal_type=meal_type,
                defaults={
                    "start_datetime": start_dt,
                    "end_datetime": end_dt,
                    "day_part_factor": factor,
                },
            )
            meals.append(meal)
        return meals

    def create_meals_for_date_timeaware(
        self, date: dt.date, is_first: bool = False, is_last: bool = False
    ) -> list["Meal"]:
        """Create meals for a date, filtering by plan start/end time on first/last day."""
        meals = []
        start_time = self.start_datetime.astimezone(timezone.get_current_timezone()).time() if self.start_datetime else dt.time(0, 0)
        end_time = self.end_datetime.astimezone(timezone.get_current_timezone()).time() if self.end_datetime else dt.time(23, 59)

        for meal_type in DEFAULT_MEAL_TYPES:
            times = MEAL_TYPE_DEFAULT_TIMES.get(meal_type, ((12, 0), (13, 0)))
            mt_start = dt.time(times[0][0], times[0][1])
            mt_end = dt.time(times[1][0], times[1][1])

            if is_first and mt_start < start_time:
                continue
            if is_last and mt_end > end_time:
                continue

            start_dt = timezone.make_aware(dt.datetime.combine(date, mt_start))
            end_dt = timezone.make_aware(dt.datetime.combine(date, mt_end))
            factor = (self.day_part_factors or {}).get(meal_type, MEAL_TYPE_DAY_FACTORS.get(meal_type, 0.0))
            meal, _created = Meal.objects.get_or_create(
                meal_plan=self,
                start_datetime__date=date,
                meal_type=meal_type,
                defaults={
                    "start_datetime": start_dt,
                    "end_datetime": end_dt,
                    "day_part_factor": factor,
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
        null=True,
        blank=True,
        db_index=True,
        verbose_name=_("Startzeit"),
    )
    end_datetime = models.DateTimeField(
        null=True,
        blank=True,
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
    is_external = models.BooleanField(
        default=False,
        verbose_name=_("Externe Mahlzeit"),
        help_text=_("Wenn True, wird diese Mahlzeit als extern (z.B. Restaurant) behandelt"),
    )
    external_energy_kj = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Externe Energie (kJ)"),
        help_text=_("Manuell eingegebener Energiewert für externe Mahlzeiten"),
    )
    external_cost_per_person = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Externe Kosten pro Person"),
        help_text=_("Fixpreis pro Person für externe Mahlzeiten"),
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
    is_reference = models.BooleanField(
        default=False,
        verbose_name=_("Ist Referenz-Mahlzeit"),
        help_text=_("Wenn True, dient diese Mahlzeit als Template für andere Meals gleichen Typs"),
    )
    ref_meal = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="synced_meals",
        verbose_name=_("Referenz-Mahlzeit"),
        help_text=_("Verknüpfung zum RefMeal-Template"),
    )
    is_synced = models.BooleanField(
        default=False,
        verbose_name=_("Synchronisiert"),
        help_text=_("Wenn True, werden Änderungen am RefMeal auf dieses Meal übertragen"),
    )

    class Meta:
        verbose_name = _("Mahlzeit")
        verbose_name_plural = _("Mahlzeiten")
        ordering = ["start_datetime"]
        constraints = [
            models.UniqueConstraint(
                fields=["meal_plan", "meal_type"],
                condition=models.Q(is_reference=True),
                name="unique_ref_meal_per_plan_and_type",
            ),
        ]

    def __str__(self) -> str:
        if self.is_reference:
            return f"[REF] {self.get_meal_type_display()} – {self.meal_plan.name}"
        date_str = self.start_datetime.strftime("%Y-%m-%d") if self.start_datetime else "?"
        return f"{date_str} – {self.get_meal_type_display()}"

    def clean(self) -> None:
        """Validate meal constraints."""
        # RefMeal validation
        if self.is_reference:
            if self.ref_meal is not None:
                raise ValidationError(_("Ein RefMeal kann nicht auf ein anderes RefMeal verweisen."))
            if self.is_synced:
                raise ValidationError(_("Ein RefMeal kann nicht synchronisiert sein."))
        else:
            # Regular meal: validate date uniqueness
            if self.start_datetime and self.meal_plan_id:
                date = self.start_datetime.date()
                qs = Meal.objects.filter(
                    meal_plan=self.meal_plan,
                    start_datetime__date=date,
                    meal_type=self.meal_type,
                    is_reference=False,
                )
                if self.pk:
                    qs = qs.exclude(pk=self.pk)
                if qs.exists():
                    raise ValidationError(_("Es existiert bereits eine Mahlzeit dieses Typs an diesem Tag."))

        # ref_meal must point to a reference meal
        if self.ref_meal and not self.ref_meal.is_reference:
            raise ValidationError(_("ref_meal muss auf ein RefMeal verweisen."))

        # is_synced only allowed with ref_meal
        if self.is_synced and not self.ref_meal:
            raise ValidationError(_("is_synced erfordert ein verknüpftes RefMeal."))

    def save(self, *args, **kwargs) -> None:
        self.clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.is_reference:
            # Unlink all synced meals before deleting
            Meal.objects.filter(ref_meal=self).update(ref_meal=None, is_synced=False)
        return super().delete(*args, **kwargs)


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
