"""RecipeStep and RecipeStepIngredient models for structured recipe instructions."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class RecipeStep(models.Model):
    """A single step in a recipe's structured instruction sequence.

    Stores instruction text with placeholder syntax ({ingredient_name} or {uuid}),
    optional duration, section grouping, and ordering.
    """

    recipe = models.ForeignKey(
        "recipe.Recipe",
        on_delete=models.CASCADE,
        related_name="steps",
        verbose_name=_("Rezept"),
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Reihenfolge"),
        help_text=_("Sortierung der Schritte (0-indexed)"),
    )
    instruction = models.TextField(
        verbose_name=_("Anleitung"),
        help_text=_("Schritt-Text mit Platzhaltern: {ingredient_name} oder {uuid}"),
    )
    duration_minutes = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Dauer (Minuten)"),
        help_text=_("Ungefähre Dauer für diesen Schritt"),
    )
    section = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Sektion"),
        help_text=_("Optional: Gruppierung (z.B. 'Vorbereitung', 'Kochen')"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Aktualisiert"))

    class Meta:
        verbose_name = _("Rezept-Schritt")
        verbose_name_plural = _("Rezept-Schritte")
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "sort_order"],
                name="unique_recipe_step_sort_order",
            ),
        ]
        ordering = ["recipe", "sort_order"]
        indexes = [
            models.Index(fields=["recipe", "sort_order"], name="recipe_step_sort_idx"),
        ]

    def __str__(self) -> str:
        return f"Step {self.sort_order} - {self.recipe.slug}: {self.instruction[:50]}"


class RecipeStepIngredient(models.Model):
    """Links a RecipeStep to specific RecipeItem(s) used in that step.

    Allows tracking which ingredients are used in each step, with optional
    quantity modifiers and preparation notes specific to this step.
    """

    step = models.ForeignKey(
        "recipe.RecipeStep",
        on_delete=models.CASCADE,
        related_name="step_ingredients",
        verbose_name=_("Schritt"),
    )
    recipe_item = models.ForeignKey(
        "recipe.RecipeItem",
        on_delete=models.CASCADE,
        related_name="step_assignments",
        verbose_name=_("Rezept-Zutat"),
    )
    quantity_modifier = models.FloatField(
        default=1.0,
        verbose_name=_("Mengenmodifizierer"),
        help_text=_("Multiplikator: z.B. 0.5 = halbe Menge, 2.0 = doppelte Menge"),
    )
    preparation = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Vorbereitung"),
        help_text=_("Schritt-spezifische Vorbereitung: z.B. 'würfeln', 'geraffelt'"),
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Reihenfolge"),
        help_text=_("Sortierung innerhalb des Schritts"),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Aktualisiert"))

    class Meta:
        verbose_name = _("Schritt-Zutat")
        verbose_name_plural = _("Schritt-Zutaten")
        constraints = [
            models.UniqueConstraint(
                fields=["step", "recipe_item"],
                name="unique_step_recipe_item",
            ),
        ]
        ordering = ["step", "sort_order"]
        indexes = [
            models.Index(fields=["step", "sort_order"], name="step_ingredient_sort_idx"),
            models.Index(fields=["recipe_item"], name="recipe_item_steps_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.step.recipe.slug} Step {self.step.sort_order} - {self.recipe_item.portion.ingredient.name}"
