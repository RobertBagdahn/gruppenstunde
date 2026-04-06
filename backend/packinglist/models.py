from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


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
                    sort_order=item.sort_order,
                )
        return new_list


class PackingCategory(models.Model):
    """A category within a packing list (e.g. Kleidung, Ausruestung, Hygiene)."""

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
    sort_order = models.IntegerField(default=0, verbose_name=_("Sortierung"))
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
