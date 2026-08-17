"""Audit log service — tracks field-level changes for Ingredients and Recipes."""

import logging

from django.contrib.contenttypes.models import ContentType
from django.db.models import Model

logger = logging.getLogger(__name__)


def log_field_change(instance: Model, field_name: str, old_value, new_value, user=None) -> None:
    """
    Create a ChangeAuditLog entry for a single field change.

    Args:
        instance: The model instance that changed
        field_name: Name of the changed field
        old_value: Previous field value (will be converted to str)
        new_value: New field value (will be converted to str)
        user: User who made the change (or None)
    """
    from content.models import ChangeAuditLog

    old_str = _safe_str(old_value)
    new_str = _safe_str(new_value)

    if old_str == new_str:
        return

    ChangeAuditLog.objects.create(
        content_type=ContentType.objects.get_for_model(instance),
        object_id=instance.pk,
        field_name=field_name,
        old_value=old_str,
        new_value=new_str,
        changed_by=user,
    )


def _safe_str(value) -> str | None:
    if value is None:
        return None
    try:
        return str(value)
    except Exception:
        return str(type(value))


def get_audit_log_for_object(instance: Model, limit: int = 20):
    """Return ChangeAuditLog entries for a given model instance."""
    from content.models import ChangeAuditLog

    ct = ContentType.objects.get_for_model(instance)
    return ChangeAuditLog.objects.filter(content_type=ct, object_id=instance.pk).order_by("-changed_at")[:limit]


def get_audit_log_queryset(content_type_str: str | None = None, object_id: int | None = None):
    """Return a queryset of ChangeAuditLog entries, optionally filtered."""
    from content.models import ChangeAuditLog

    qs = ChangeAuditLog.objects.select_related("changed_by", "content_type").order_by("-changed_at")
    if content_type_str:
        ct = ContentType.objects.get(model=content_type_str)
        qs = qs.filter(content_type=ct)
    if object_id:
        qs = qs.filter(object_id=object_id)
    return qs


def log_staff_food_access(user, resource, endpoint: str, success: bool = True) -> None:
    """Record a Staff detail/export access for the short retention window."""
    from content.models import StaffFoodAccessLog

    if not getattr(user, "is_staff", False):
        return
    StaffFoodAccessLog.objects.create(
        user=user,
        resource_type=resource.__class__.__name__,
        object_id=resource.pk,
        endpoint=endpoint[:255],
        success=success,
    )


def log_private_staff_food_access(user, resource, endpoint: str) -> None:
    """Audit Staff access only when the resource is not public/system data."""
    if getattr(resource, "visibility", None) == "public":
        return
    if getattr(resource, "owner_id", None) is None and getattr(resource, "status", None) in {
        "approved",
        "verified",
    }:
        return
    log_staff_food_access(user, resource, endpoint)
