"""Material directory services: name normalization, duplicate lookup and merging."""

from __future__ import annotations

import re

from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction

from core.permissions import is_staff_user
from supply.models import ContentMaterialItem, Material


def normalize_material_name(name: str) -> str:
    """Collapse whitespace and strip, preserving the original casing."""
    return re.sub(r"\s+", " ", name).strip()


def find_existing_material(name: str) -> Material | None:
    """Return the active material whose name equals `name` ignoring case and extra spaces."""
    normalized = normalize_material_name(name)
    if not normalized:
        return None
    return Material.objects.filter(name__iexact=normalized).first()


def can_edit_material(user: AbstractBaseUser | None, material: Material) -> bool:
    """Admins edit everything; other logged-in users only their own materials."""
    if user is None or not user.is_authenticated:
        return False
    if is_staff_user(user):
        return True
    return material.created_by_id == user.pk


def can_delete_material(user: AbstractBaseUser | None) -> bool:
    return bool(user is not None and user.is_authenticated and is_staff_user(user))


@transaction.atomic
def merge_materials(source: Material, target: Material) -> Material:
    """Re-point all content links of `source` to `target` and soft-delete `source`.

    When a content object already links `target`, the duplicate link is dropped and
    the larger amount is kept.
    """
    if source.pk == target.pk:
        raise ValueError("Quelle und Ziel sind identisch.")

    for link in ContentMaterialItem.objects.filter(material=source).select_for_update():
        existing = ContentMaterialItem.objects.filter(
            content_type_id=link.content_type_id, object_id=link.object_id, material=target
        ).first()
        if existing is None:
            link.material = target
            link.save(update_fields=["material"])
            continue
        if link.amount > existing.amount:
            existing.amount = link.amount
            existing.quantity_mode = link.quantity_mode
            existing.save(update_fields=["amount", "quantity_mode"])
        link.delete()

    source.soft_delete()
    return target
