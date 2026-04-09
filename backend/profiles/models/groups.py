"""Group, membership, and join request models."""

from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from ..choices import MembershipRoleChoices


class UserGroup(models.Model):
    """Hierarchical group of users. Memberships are inherited from parent groups."""

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Gruppenname"),
    )
    slug = models.SlugField(
        max_length=120,
        unique=True,
        blank=True,
        verbose_name=_("Slug"),
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Beschreibung"),
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
        verbose_name=_("Übergruppe"),
    )
    is_visible = models.BooleanField(
        default=True,
        verbose_name=_("Sichtbar"),
    )
    free_to_join = models.BooleanField(
        default=False,
        verbose_name=_("Frei beitreten"),
        help_text=_("Wenn aktiv, können Benutzer ohne Einladung beitreten"),
    )
    join_code = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name=_("Beitrittscode"),
        help_text=_("Optionaler Code zum Beitreten der Gruppe"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_groups",
        verbose_name=_("Erstellt von"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, verbose_name=_("Gelöscht"))
    date_deleted = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Löschdatum"),
    )

    class Meta:
        verbose_name = _("Benutzergruppe")
        verbose_name_plural = _("Benutzergruppen")
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=False)
            if not base_slug:
                base_slug = "gruppe"
            slug = base_slug
            counter = 1
            while UserGroup.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def get_ancestors(self):
        """Return list of ancestor groups from immediate parent to root."""
        ancestors = []
        current = self.parent
        seen = set()
        while current and current.pk not in seen:
            ancestors.append(current)
            seen.add(current.pk)
            current = current.parent
        return ancestors

    def get_all_member_ids(self):
        """Return set of user IDs who are members (direct + inherited from parent chain)."""
        user_ids = set(GroupMembership.objects.filter(group=self, is_active=True).values_list("user_id", flat=True))
        for ancestor in self.get_ancestors():
            user_ids |= set(
                GroupMembership.objects.filter(group=ancestor, is_active=True).values_list("user_id", flat=True)
            )
        return user_ids


class GroupMembership(models.Model):
    """Membership linking a user to a group with role."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )
    group = models.ForeignKey(
        UserGroup,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=MembershipRoleChoices.choices,
        default=MembershipRoleChoices.MEMBER,
        verbose_name=_("Rolle"),
    )
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, verbose_name=_("Aktiv"))

    class Meta:
        verbose_name = _("Gruppenmitgliedschaft")
        verbose_name_plural = _("Gruppenmitgliedschaften")
        unique_together = [("user", "group")]

    def __str__(self):
        return f"{self.user} in {self.group} ({self.get_role_display()})"


class GroupJoinRequest(models.Model):
    """Request to join a group that is not free to join."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_join_requests",
    )
    group = models.ForeignKey(
        UserGroup,
        on_delete=models.CASCADE,
        related_name="join_requests",
    )
    message = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Nachricht"),
    )
    date_requested = models.DateTimeField(auto_now_add=True)
    approved = models.BooleanField(
        null=True,
        blank=True,
        verbose_name=_("Genehmigt"),
        help_text=_("Null = ausstehend, True = genehmigt, False = abgelehnt"),
    )
    date_checked = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Datum der Prüfung"),
    )
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_join_requests",
        verbose_name=_("Geprüft von"),
    )

    class Meta:
        verbose_name = _("Beitrittsanfrage")
        verbose_name_plural = _("Beitrittsanfragen")
        unique_together = [("user", "group")]
        ordering = ["-date_requested"]

    def __str__(self):
        status = "ausstehend" if self.approved is None else ("genehmigt" if self.approved else "abgelehnt")
        return f"{self.user} → {self.group} ({status})"
