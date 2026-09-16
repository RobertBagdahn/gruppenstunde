"""Portion repair finding/audit models.

Each `PortionRepairFinding` records a suspicious Portion, its before-values,
the AI proposal (classification, proposed portion, confidence, rationale),
the threshold and prompt version used, and the outcome of a repair
(created replacement portion, moved RecipeItems, affected recipes).
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import PortionRepairDetectionReason, PortionRepairStatus


class PortionRepairFinding(models.Model):
    """A single repair finding for a suspicious Portion.

    Idempotency: only one OPEN finding (candidate/pending_review/ready) per
    portion may exist (DB constraint). The scanner additionally skips portions
    whose latest finding carries the identical before-snapshot hash, so
    already applied or rejected data is never flagged again unchanged.
    """

    portion = models.ForeignKey(
        "supply.Portion",
        on_delete=models.CASCADE,
        related_name="repair_findings",
        verbose_name=_("Portion"),
    )
    ingredient = models.ForeignKey(
        "supply.Ingredient",
        on_delete=models.CASCADE,
        related_name="portion_repair_findings",
        verbose_name=_("Zutat"),
    )
    detection_reason = models.CharField(
        max_length=40,
        choices=PortionRepairDetectionReason.choices,
        verbose_name=_("Erkennungsgrund"),
    )
    status = models.CharField(
        max_length=20,
        choices=PortionRepairStatus.choices,
        default=PortionRepairStatus.CANDIDATE,
        verbose_name=_("Status"),
    )

    # --- Before values (snapshot at scan time) ------------------------------
    before_snapshot = models.JSONField(default=dict, verbose_name=_("Vorher-Werte"))
    before_snapshot_hash = models.CharField(
        max_length=64,
        default="",
        verbose_name=_("Vorher-Werte-Hash"),
    )
    recipe_item_ids = models.JSONField(
        default=list,
        verbose_name=_("RecipeItem-IDs"),
        help_text=_("RecipeItems, die die Portion zum Scan-Zeitpunkt referenzierten."),
    )

    # --- AI proposal ---------------------------------------------------------
    ai_proposal = models.JSONField(default=dict, verbose_name=_("KI-Vorschlag"))
    confidence = models.FloatField(null=True, blank=True, verbose_name=_("Konfidenz"))
    prompt_version = models.CharField(
        max_length=20,
        default="1",
        verbose_name=_("Prompt-Version"),
    )
    threshold = models.FloatField(null=True, blank=True, verbose_name=_("Schwellenwert"))
    ai_interaction_id = models.UUIDField(null=True, blank=True, verbose_name=_("KI-Interaktions-ID"))

    # --- Repair outcome ------------------------------------------------------
    applied_portion = models.ForeignKey(
        "supply.Portion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("Korrigierte Portion"),
    )
    moved_recipe_item_ids = models.JSONField(
        default=list,
        verbose_name=_("Umgestellte RecipeItem-IDs"),
    )
    affected_recipe_ids = models.JSONField(
        default=list,
        verbose_name=_("Betroffene Rezept-IDs"),
    )
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portion_repair_findings_applied",
        verbose_name=_("Angewendet von"),
    )
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portion_repair_findings_rejected",
        verbose_name=_("Abgelehnt von"),
    )
    applied_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Angewendet am"))
    rejected_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Abgelehnt am"))

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Erstellt am"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Aktualisiert am"))

    class Meta:
        verbose_name = _("Portions-Reparatur-Befund")
        verbose_name_plural = _("Portions-Reparatur-Befunde")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["portion"],
                condition=models.Q(
                    status__in=[
                        PortionRepairStatus.CANDIDATE,
                        PortionRepairStatus.PENDING_REVIEW,
                        PortionRepairStatus.READY,
                    ],
                ),
                name="unique_open_portion_repair_finding",
            ),
        ]

    def __str__(self):
        return f"{self.portion} — {self.detection_reason} ({self.status})"
