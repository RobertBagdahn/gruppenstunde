"""Staff-reviewed proposals for buffet catalog curation and data repair."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class BuffetDataProposal(models.Model):
    class Action(models.TextChoices):
        ADD = "add", _("Rolle hinzufügen")
        UNTAG = "untag", _("Rolle entfernen")
        MERGE = "merge_into", _("Zusammenführen")
        CREATE = "create", _("Neu anlegen")

    class ItemKind(models.TextChoices):
        INGREDIENT = "ingredient", _("Zutat")
        RECIPE = "recipe", _("Rezept")

    class Origin(models.TextChoices):
        MANUAL = "manual", _("Manuell")
        AI = "ai", _("KI")
        MIXED = "mixed", _("KI und manuell")

    class Status(models.TextChoices):
        PENDING = "pending", _("Ausstehend")
        APPROVED = "approved", _("Freigegeben")
        REJECTED = "rejected", _("Abgelehnt")

    action = models.CharField(max_length=20, choices=Action.choices)
    item_kind = models.CharField(max_length=12, choices=ItemKind.choices)
    source_id = models.PositiveBigIntegerField(null=True, blank=True)
    source_expected_name = models.CharField(max_length=255, blank=True, default="")
    target_id = models.PositiveBigIntegerField(null=True, blank=True)
    target_expected_name = models.CharField(max_length=255, blank=True, default="")
    role_slugs = models.JSONField(default=list, blank=True)
    proposed_data = models.JSONField(default=dict, blank=True)
    origin = models.CharField(max_length=10, choices=Origin.choices, default=Origin.MANUAL)
    ai_confidence = models.FloatField(null=True, blank=True)
    rationale = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="buffet_data_proposals_created",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buffet_data_proposals_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True, default="")
    preview_fingerprint = models.CharField(max_length=64, blank=True, default="")
    previewed_at = models.DateTimeField(null=True, blank=True)
    preview_result = models.JSONField(default=dict, blank=True)
    audit_log = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "-updated_at", "id"]
        indexes = [
            models.Index(fields=["status", "updated_at"], name="buffet_prop_status_updated_idx"),
            models.Index(fields=["action", "item_kind"], name="buffet_prop_action_kind_idx"),
        ]

    def __str__(self) -> str:
        return f"Buffet-Vorschlag {self.pk} ({self.action}, {self.status})"
