"""
Search logging model.
"""

from django.conf import settings
from django.db import models


class SearchLog(models.Model):
    """Log of search queries for analytics."""

    query = models.CharField(max_length=500)
    results_count = models.IntegerField(default=0)
    session_key = models.CharField(max_length=40, blank=True, default="")
    ip_hash = models.CharField(max_length=64, blank=True, default="")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="content_search_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.query} ({self.results_count} results)"
