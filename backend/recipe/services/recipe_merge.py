"""Merge duplicate recipes.

``merge_recipe`` moves meal items and tags from the source to the target,
soft-deletes the source and records the merge as a ``ContentLink`` so the pair
is never proposed again.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from content.choices import LinkType


class RecipeMergeError(ValueError):
    """Raised when two recipes cannot be merged."""


@dataclass
class RecipeMergeResult:
    meal_items_moved: int


def merge_recipe(source: Any, target: Any, *, user: Any | None = None) -> RecipeMergeResult:
    """Merge ``source`` into ``target`` (source is soft-deleted afterwards)."""
    from content.models import ContentLink
    from planner.models import MealItem
    from recipe.models import Recipe

    if source.id == target.id:
        raise RecipeMergeError("Quell- und Ziel-Rezept dürfen nicht identisch sein")
    if source.is_deleted:
        raise RecipeMergeError("Quell-Rezept wurde bereits zusammengeführt")

    ct = ContentType.objects.get_for_model(Recipe)
    if ContentLink.objects.filter(
        source_content_type=ct,
        source_object_id=source.id,
        target_content_type=ct,
        target_object_id=target.id,
        link_type=LinkType.DUPLICATE_MERGED,
    ).exists():
        raise RecipeMergeError("Dieses Rezept-Paar wurde bereits zusammengeführt")

    created_by = user if user is not None and getattr(user, "is_authenticated", False) else None

    with transaction.atomic():
        meal_items_moved = MealItem.objects.filter(recipe=source).update(recipe=target)
        target.tags.add(*source.tags.all())
        source.soft_delete()
        ContentLink.objects.create(
            source_content_type=ct,
            source_object_id=source.id,
            target_content_type=ct,
            target_object_id=target.id,
            link_type=LinkType.DUPLICATE_MERGED,
            created_by=created_by,
        )

    return RecipeMergeResult(meal_items_moved=meal_items_moved)
