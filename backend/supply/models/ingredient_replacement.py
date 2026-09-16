"""IngredientReplacementMapping — directional generic-to-concrete replacement relations."""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from .ingredient import Ingredient


class IngredientReplacementMapping(models.Model):
    """Directional mapping from a generic ingredient to a concrete replacement.

    Example: ``Salz -> Jodsalz``. Used by the AI suggestion flow to offer an
    explicit replacement instead of adding a duplicate concrete ingredient.
    """

    GENERIC_TO_CONCRETE = "generic_to_concrete"
    RELATION_KIND_CHOICES = [
        (GENERIC_TO_CONCRETE, _("Generisch → Konkret")),
    ]

    source_ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name="replacement_mappings_as_source",
        verbose_name=_("Quell-Zutat"),
        help_text=_("Generische Zutat, die ersetzt werden soll (z.B. 'Salz')"),
    )
    replacement_ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name="replacement_mappings_as_replacement",
        verbose_name=_("Ersatz-Zutat"),
        help_text=_("Konkrete Zutat, die stattdessen verwendet wird (z.B. 'Jodsalz')"),
    )
    relation_kind = models.CharField(
        max_length=32,
        choices=RELATION_KIND_CHOICES,
        default=GENERIC_TO_CONCRETE,
        verbose_name=_("Beziehungsart"),
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name=_("Aktiv"),
        help_text=_("Inaktive Zuordnungen werden von der KI-Filterung ignoriert"),
    )
    provenance = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Herkunft"),
        help_text=_("z.B. 'seed:reviewed' oder 'seed:generic_terms'"),
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Aktualisiert"))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredient_replacement_mappings_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ingredient_replacement_mappings_updated",
    )

    class Meta:
        verbose_name = _("Zutaten-Ersatz-Zuordnung")
        verbose_name_plural = _("Zutaten-Ersatz-Zuordnungen")
        ordering = ["source_ingredient__name", "replacement_ingredient__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_ingredient", "replacement_ingredient"],
                name="unique_ingredient_replacement_mapping",
            ),
            models.CheckConstraint(
                condition=~Q(source_ingredient=models.F("replacement_ingredient")),
                name="replacement_mapping_source_ne_replacement",
            ),
        ]
        indexes = [
            models.Index(fields=["replacement_ingredient", "is_active"], name="replacement_target_active_idx"),
            models.Index(fields=["source_ingredient", "is_active"], name="replacement_source_active_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.source_ingredient.name} → {self.replacement_ingredient.name}"
