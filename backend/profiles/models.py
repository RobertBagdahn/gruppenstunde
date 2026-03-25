from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from .choices import GenderChoices, MembershipRoleChoices


# ---------------------------------------------------------------------------
# User Profile
# ---------------------------------------------------------------------------


class UserProfile(models.Model):
    """Extended user profile data."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    scout_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Pfadfindername"),
    )
    first_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Vorname"),
    )
    last_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Nachname"),
    )
    gender = models.CharField(
        max_length=20,
        choices=GenderChoices.choices,
        default=GenderChoices.NO_ANSWER,
        verbose_name=_("Geschlecht"),
    )
    birthday = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Geburtstag"),
    )
    about_me = models.TextField(
        max_length=500,
        blank=True,
        default="",
        verbose_name=_("Über mich"),
    )
    profile_picture = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True,
        verbose_name=_("Profilbild"),
    )
    nutritional_tags = models.ManyToManyField(
        "idea.NutritionalTag",
        blank=True,
        related_name="user_profiles",
        verbose_name=_("Ernährungstags"),
    )
    is_public = models.BooleanField(
        default=False,
        verbose_name=_("Öffentlich sichtbar"),
        help_text=_("Wenn aktiv, kann das Profil von allen Nutzern gefunden werden"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Benutzerprofil")
        verbose_name_plural = _("Benutzerprofile")

    def __str__(self):
        display = self.scout_name or self.full_name or self.user.email
        return f"Profil: {display}"

    @property
    def full_name(self):
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p)

    @property
    def scout_display_name(self):
        """Display name: scout_name if set, otherwise full_name, fallback to email."""
        return self.scout_name or self.full_name or self.user.email


# ---------------------------------------------------------------------------
# User Preferences
# ---------------------------------------------------------------------------


class UserPreference(models.Model):
    """User preferences for default search/filter values."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_preference",
    )
    preferred_scout_level = models.ForeignKey(
        "idea.ScoutLevel",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name=_("Bevorzugte Stufe"),
    )
    preferred_group_size_min = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Min. Gruppengröße"),
    )
    preferred_group_size_max = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Max. Gruppengröße"),
    )
    preferred_difficulty = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name=_("Bevorzugte Schwierigkeit"),
    )
    preferred_location = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name=_("Bevorzugter Ort"),
    )

    class Meta:
        verbose_name = _("Benutzereinstellung")
        verbose_name_plural = _("Benutzereinstellungen")

    def __str__(self):
        return f"Einstellungen von {self.user}"


# ---------------------------------------------------------------------------
# User Group (flat, no hierarchy)
# ---------------------------------------------------------------------------


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
        user_ids = set(
            GroupMembership.objects.filter(
                group=self, is_active=True
            ).values_list("user_id", flat=True)
        )
        for ancestor in self.get_ancestors():
            user_ids |= set(
                GroupMembership.objects.filter(
                    group=ancestor, is_active=True
                ).values_list("user_id", flat=True)
            )
        return user_ids


# ---------------------------------------------------------------------------
# Group Membership
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Group Join Request
# ---------------------------------------------------------------------------


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
