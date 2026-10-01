import uuid

from django.conf import settings
from django.db import models

from ..choices import AiContextChoices, AiTierChoices


class AiInteraction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    context = models.CharField(max_length=50, choices=AiContextChoices.choices)
    prompt = models.JSONField()
    response = models.TextField(blank=True, default="")
    model = models.CharField(max_length=100)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_interactions",
    )
    duration_ms = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_code = models.CharField(max_length=50, blank=True, default="")
    structured_attempts = models.PositiveSmallIntegerField(default=1)
    structured_validation_error = models.TextField(blank=True, default="")
    prompt_tokens = models.IntegerField(null=True, blank=True)
    completion_tokens = models.IntegerField(null=True, blank=True)
    total_tokens = models.IntegerField(null=True, blank=True)
    thoughts_tokens = models.IntegerField(null=True, blank=True)
    cost_eur = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    pricing_model = models.CharField(max_length=100, blank=True, default="")
    is_background = models.BooleanField(default=False)
    # db_default keeps inserts from the previous release working during a rolling deploy.
    tier = models.CharField(
        max_length=10,
        choices=AiTierChoices.choices,
        default=AiTierChoices.USER,
        db_default=AiTierChoices.USER,
    )
    # HMAC of IP + user agent with a daily rotating key; never a raw IP.
    anon_key = models.CharField(max_length=64, blank=True, default="", db_default="")
    # Worst-case estimate held against the budget until `cost_eur` is known.
    reserved_cost_eur = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    vote = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        choices=[("up", "👍"), ("down", "👎")],
    )
    voted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["context"], name="aiinteraction_context_idx"),
            models.Index(fields=["user"], name="aiinteraction_user_idx"),
            models.Index(fields=["created_at"], name="aiinteraction_created_at_idx"),
            models.Index(fields=["vote"], name="aiinteraction_vote_idx"),
            models.Index(fields=["tier", "created_at"], name="aiinteraction_tier_created_idx"),
            models.Index(fields=["anon_key", "created_at"], name="aiinteraction_anon_created_idx"),
            models.Index(fields=["user", "created_at"], name="aiinteraction_user_created_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.context}] by {self.user_id} at {self.created_at}"


class AiBudgetBucket(models.Model):
    """Lock row serializing budget checks per scope ("anonymous", "user:<id>") across instances."""

    key = models.CharField(max_length=64, unique=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.key


class AiResultCache(models.Model):
    """Cross-instance cache for anonymous preview results (recognize recipe/ingredient)."""

    feature = models.CharField(max_length=50)
    input_hash = models.CharField(max_length=64)
    payload = models.JSONField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["feature", "input_hash"], name="airesultcache_feature_hash_uniq"),
        ]
        indexes = [models.Index(fields=["expires_at"], name="airesultcache_expires_idx")]

    def __str__(self) -> str:
        return f"{self.feature}:{self.input_hash[:8]}"
