"""Profile and preference models."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from ..choices import GenderChoices


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
        "supply.NutritionalTag",
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


class UserPreference(models.Model):
    """User preferences for default search/filter values."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_preference",
    )
    preferred_scout_level = models.ForeignKey(
        "content.ScoutLevel",
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
