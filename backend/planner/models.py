from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Planner(models.Model):
    """Collaborative quarterly planner for Gruppenstunden."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="planners",
    )
    title = models.CharField(max_length=200, verbose_name=_("Titel"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Planer")
        verbose_name_plural = _("Planer")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class PlannerEntry(models.Model):
    """A single entry in a planner (idea assigned to a date)."""

    planner = models.ForeignKey(
        Planner,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    idea = models.ForeignKey(
        "idea.Idea",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="planner_entries",
    )
    date = models.DateField(verbose_name=_("Datum"))
    notes = models.TextField(blank=True, default="", verbose_name=_("Notizen"))
    sort_order = models.IntegerField(default=0)

    class Meta:
        verbose_name = _("Planereintrag")
        verbose_name_plural = _("Planereinträge")
        ordering = ["date", "sort_order"]

    def __str__(self):
        idea_title = self.idea.title if self.idea else "Leer"
        return f"{self.date}: {idea_title}"


class PlannerCollaborator(models.Model):
    """User who can view or edit a planner."""

    class Role(models.TextChoices):
        EDITOR = "editor", _("Editor")
        VIEWER = "viewer", _("Viewer")

    planner = models.ForeignKey(
        Planner,
        on_delete=models.CASCADE,
        related_name="collaborators",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_planners",
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    invited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Mitarbeiter")
        verbose_name_plural = _("Mitarbeiter")
        unique_together = ["planner", "user"]
