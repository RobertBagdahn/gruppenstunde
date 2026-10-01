"""AI-generated standard package suggestions for ingredients."""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from ..choices import PhysicalViscosityChoices


class IngredientPackageSuggestion(models.Model):
    """A suggested standard package (plus viscosity/density) for one ingredient.

    Suggestions are only stored by the AI run. Accepting one (staff, cockpit)
    creates the rank=1 ``Package`` and sets viscosity/density unless they were
    maintained manually.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Offen")
        ACCEPTED = "accepted", _("Übernommen")
        REJECTED = "rejected", _("Verworfen")

    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        related_name="package_suggestions",
        verbose_name=_("Zutat"),
    )
    package_name = models.CharField(max_length=255, verbose_name=_("Packungsname"))
    weight_g = models.FloatField(validators=[MinValueValidator(0.01)], verbose_name=_("Gewicht (g)"))
    volume_ml = models.FloatField(
        null=True, blank=True, validators=[MinValueValidator(0.01)], verbose_name=_("Volumen (ml)")
    )
    physical_viscosity = models.CharField(
        max_length=10,
        choices=PhysicalViscosityChoices.choices,
        default=PhysicalViscosityChoices.SOLID,
        verbose_name=_("Aggregatzustand"),
    )
    physical_density = models.FloatField(
        null=True, blank=True, validators=[MinValueValidator(0.01)], verbose_name=_("Dichte (g/ml)")
    )
    confidence = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)], verbose_name=_("Konfidenz (0-1)")
    )
    reason = models.TextField(blank=True, default="", verbose_name=_("Begründung"))
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True, verbose_name=_("Status")
    )
    model = models.CharField(max_length=100, blank=True, default="", verbose_name=_("KI-Modell"))
    prompt_version = models.CharField(max_length=30, blank=True, default="", verbose_name=_("Prompt-Version"))
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="package_suggestions_decided",
        verbose_name=_("Entschieden von"),
    )
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Entschieden am"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Aktualisiert am"))

    class Meta:
        verbose_name = _("Packungsvorschlag")
        verbose_name_plural = _("Packungsvorschläge")
        ordering = ["-confidence", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["ingredient"],
                condition=Q(status="pending"),
                name="unique_pending_package_suggestion_per_ingredient",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.package_name} ({self.status})"
