import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _


class VisibilityChoices(models.TextChoices):
    PRIVATE = "private", _("Privat")
    LINK_ONLY = "link_only", _("Per Link zugänglich")


class PackingList(models.Model):
    """A packing list for scouting trips (Hajk, summer camp, weekend, etc.)."""

    title = models.CharField(max_length=200, verbose_name=_("Titel"))
    description = models.TextField(blank=True, default="", verbose_name=_("Beschreibung"))
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="packing_lists",
        verbose_name=_("Ersteller"),
    )
    group = models.ForeignKey(
        "profiles.UserGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="packing_lists",
        verbose_name=_("Gruppe"),
    )
    is_template = models.BooleanField(
        default=False,
        verbose_name=_("Vorlage"),
        help_text=_("Vorlagen können von allen Benutzern geklont werden."),
    )
    visibility = models.CharField(
        max_length=20,
        choices=VisibilityChoices.choices,
        default=VisibilityChoices.LINK_ONLY,
        verbose_name=_("Sichtbarkeit"),
    )

    # Context fields for wizard-generated packing lists
    activity_type = models.CharField(
        max_length=30,
        null=True,
        blank=True,
        verbose_name=_("Aktivitätstyp"),
    )
    duration = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name=_("Dauer"),
    )
    season = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name=_("Jahreszeit"),
    )
    age_group = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name=_("Altersstufe"),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Packliste")
        verbose_name_plural = _("Packlisten")
        ordering = ["-updated_at"]

    def __str__(self):
        prefix = "[Vorlage] " if self.is_template else ""
        return f"{prefix}{self.title}"

    def user_can_edit(self, user) -> bool:
        """Check if user can edit this packing list (owner, group admin, or staff)."""
        if user.is_staff:
            return True
        if self.owner == user:
            return True
        if self.group_id:
            from profiles.models import GroupMembership
            from profiles.choices import MembershipRoleChoices

            return GroupMembership.objects.filter(
                group=self.group,
                user=user,
                role=MembershipRoleChoices.ADMIN,
                is_active=True,
            ).exists()
        return False

    def clone_for_user(self, user) -> "PackingList":
        """Create a deep copy of this packing list for the given user."""
        new_list = PackingList.objects.create(
            title=f"Kopie von {self.title}" if not self.is_template else self.title,
            description=self.description,
            owner=user,
            is_template=False,
        )
        for category in self.categories.all():
            new_category = PackingCategory.objects.create(
                packing_list=new_list,
                name=category.name,
                sort_order=category.sort_order,
            )
            for item in category.items.all():
                PackingItem.objects.create(
                    category=new_category,
                    name=item.name,
                    quantity=item.quantity,
                    description=item.description,
                    is_checked=False,
                    is_do_not_bring=item.is_do_not_bring,
                    sort_order=item.sort_order,
                )
        return new_list


class PackingCategory(models.Model):
    """A category within a packing list (e.g. Kleidung, Ausrüstung, Hygiene)."""

    packing_list = models.ForeignKey(
        PackingList,
        on_delete=models.CASCADE,
        related_name="categories",
        verbose_name=_("Packliste"),
    )
    name = models.CharField(max_length=200, verbose_name=_("Name"))
    sort_order = models.IntegerField(default=0, verbose_name=_("Sortierung"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Kategorie")
        verbose_name_plural = _("Kategorien")
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.packing_list.title}: {self.name}"


class PackingItem(models.Model):
    """An item within a packing category."""

    category = models.ForeignKey(
        PackingCategory,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("Kategorie"),
    )
    name = models.CharField(max_length=200, verbose_name=_("Name"))
    quantity = models.CharField(max_length=50, blank=True, default="", verbose_name=_("Menge"))
    description = models.CharField(max_length=500, blank=True, default="", verbose_name=_("Beschreibung"))
    is_checked = models.BooleanField(default=False, verbose_name=_("Gepackt"))
    is_do_not_bring = models.BooleanField(
        default=False,
        verbose_name=_("Nicht mitbringen"),
        help_text=_("Markiert Gegenstände, die nicht mitgebracht werden sollen."),
    )
    sort_order = models.IntegerField(default=0, verbose_name=_("Sortierung"))

    # Optional link to a supply item (Material, Ingredient, etc.)
    supply_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="packing_items",
        verbose_name=_("Ausrüstungstyp"),
    )
    supply_object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Ausrüstungs-ID"),
    )
    supply_object = GenericForeignKey("supply_content_type", "supply_object_id")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Packlisten-Gegenstand")
        verbose_name_plural = _("Packlisten-Gegenstände")
        ordering = ["sort_order", "id"]

    def __str__(self):
        label = self.name
        if self.quantity:
            label = f"{self.quantity}x {self.name}"
        return label


class PackingListShare(models.Model):
    """A share link for a packing list with its own check state."""

    packing_list = models.ForeignKey(
        PackingList,
        on_delete=models.CASCADE,
        related_name="shares",
        verbose_name=_("Packliste"),
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name=_("Token"),
    )
    label = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name=_("Bezeichnung"),
        help_text=_("z.B. 'Für Max' oder 'Trupplink'"),
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Aktiv"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Packlisten-Freigabe")
        verbose_name_plural = _("Packlisten-Freigaben")
        ordering = ["-created_at"]

    def __str__(self):
        label = self.label or str(self.token)[:8]
        return f"{self.packing_list.title}: {label}"


class PackingListShareCheck(models.Model):
    """Check state for a specific item within a share link."""

    share = models.ForeignKey(
        PackingListShare,
        on_delete=models.CASCADE,
        related_name="checks",
        verbose_name=_("Freigabe"),
    )
    item = models.ForeignKey(
        PackingItem,
        on_delete=models.CASCADE,
        related_name="share_checks",
        verbose_name=_("Gegenstand"),
    )
    is_checked = models.BooleanField(default=False, verbose_name=_("Gepackt"))

    class Meta:
        verbose_name = _("Freigabe-Check")
        verbose_name_plural = _("Freigabe-Checks")
        unique_together = [("share", "item")]

    def __str__(self):
        status = "✓" if self.is_checked else "○"
        return f"{status} {self.item.name} ({self.share})"
