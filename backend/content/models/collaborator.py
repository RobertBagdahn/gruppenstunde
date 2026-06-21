"""ContentCollaborator model — generic sharing for all content types."""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class ContentCollaboratorRole(models.TextChoices):
    VIEWER = "viewer", _("Betrachter")
    EDITOR = "editor", _("Bearbeiter")
    ADMIN = "admin", _("Admin")


class ContentCollaborator(models.Model):
    """Generic collaborator model supporting shares with users or groups.

    Uses GenericForeignKey to support any model type (Content subclasses,
    Ingredient, MealPlan, ShoppingList, Planner, etc.).
    """

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name=_("Inhaltstyp"),
    )
    object_id = models.PositiveIntegerField(
        verbose_name=_("Objekt-ID"),
    )
    content_object = GenericForeignKey("content_type", "object_id")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="content_collaborations",
        verbose_name=_("Nutzer"),
    )
    group = models.ForeignKey(
        "profiles.UserGroup",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="content_collaborations",
        verbose_name=_("Gruppe"),
    )

    role = models.CharField(
        max_length=10,
        choices=ContentCollaboratorRole.choices,
        default=ContentCollaboratorRole.VIEWER,
        verbose_name=_("Rolle"),
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_collaborations",
        verbose_name=_("Erstellt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Inhaltsfreigabe")
        verbose_name_plural = _("Inhaltsfreigaben")
        ordering = ["role", "created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"], name="collab_content_idx"),
            models.Index(fields=["user"], name="collab_user_idx"),
            models.Index(fields=["group"], name="collab_group_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(user__isnull=False) | Q(group__isnull=False),
                name="collab_user_or_group_required",
            ),
            models.UniqueConstraint(
                fields=["content_type", "object_id", "user", "group"],
                name="unique_collab",
            ),
        ]

    def __str__(self) -> str:
        target = self.user or self.group
        return f"{target} – {self.get_role_display()}"
