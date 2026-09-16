"""AI-generated price proposals for ingredients."""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class IngredientPriceProposal(models.Model):
    """A pending/reviewed AI price proposal for one ingredient.

    Proposals never change the ingredient price by themselves; only explicit
    user confirmation (accept) applies the proposed price globally.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Ausstehend")
        ACCEPTED = "accepted", _("Bestätigt")
        REJECTED = "rejected", _("Abgelehnt")

    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        related_name="price_proposals",
        verbose_name=_("Zutat"),
    )
    proposed_price_per_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name=_("Vorgeschlagener Preis pro kg (EUR)"),
    )
    confidence = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name=_("Konfidenz (0-1)"),
    )
    rationale = models.TextField(blank=True, default="", verbose_name=_("Begründung"))
    source = models.CharField(
        max_length=50,
        default="gemini",
        blank=True,
        verbose_name=_("Quelle"),
        help_text=_("Herkunft des Vorschlags, z.B. 'gemini'"),
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name=_("Status"),
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_proposals_requested",
        verbose_name=_("Angefragt von"),
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_proposals_reviewed",
        verbose_name=_("Geprüft von"),
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Geprüft am"))
    ai_interaction_id = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        verbose_name=_("KI-Interaktions-ID"),
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Aktualisiert am"))

    class Meta:
        verbose_name = _("Preisvorschlag")
        verbose_name_plural = _("Preisvorschläge")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["ingredient", "status"], name="price_prop_ing_status_idx"),
            models.Index(fields=["status", "-created_at"], name="price_prop_status_created_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["ingredient"],
                condition=models.Q(status="pending"),
                name="unique_pending_price_proposal_per_ingredient",
            ),
        ]

    def __str__(self):
        return f"{self.ingredient.name}: {self.proposed_price_per_kg} EUR/kg ({self.status})"
