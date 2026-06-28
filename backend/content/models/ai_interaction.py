import uuid

from django.conf import settings
from django.db import models

from ..choices import AiContextChoices


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
        ]

    def __str__(self) -> str:
        return f"[{self.context}] by {self.user_id} at {self.created_at}"
