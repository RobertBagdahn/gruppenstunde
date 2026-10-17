"""Compact board view of a shopping list for the mobile shopping screen.

The payload is built once per list state and cached under the list's change
marker (``list_stamp``). Anything that depends on the viewer (may I delete this,
did I claim it) is derived per request from small keys, so the cache is shared
by all viewers and never goes stale: any write changes the stamp.
"""

import hashlib
from typing import Any

from django.core.cache import cache
from django.db.models import Exists, OuterRef

from core.services.user_directory import public_display_name
from shopping.models import ShoppingList, ShoppingListItem, ShoppingListItemSource
from shopping.services.access import Actor
from shopping.services.pulse import list_stamp
from supply.utils import shopping_quantity

BOARD_CACHE_TIMEOUT_S = 60 * 60


def _person_key(user_id: int | None, guest_id: int | None) -> str | None:
    if guest_id is not None:
        return f"g:{guest_id}"
    if user_id is not None:
        return f"u:{user_id}"
    return None


def _viewer_key(actor: Actor) -> str | None:
    if actor.guest is not None:
        return f"g:{actor.guest.id}"
    if actor.user is not None and getattr(actor.user, "id", None) is not None:
        return f"u:{actor.user.id}"
    return None


def _person_name(user, guest) -> str | None:
    if user is not None:
        return public_display_name(user)
    if guest is not None:
        return str(guest.name)
    return None


def _shared_row(item: ShoppingListItem) -> dict[str, Any]:
    """Viewer-independent fields of one entry; cached per list state."""
    quantity, unit = shopping_quantity(float(item.quantity_g or 0), item.ingredient)
    section = item.retail_section or (item.ingredient.retail_section if item.ingredient else None)
    return {
        "id": item.id,
        "name": item.name,
        "quantity": float(round(quantity, 2)),
        "unit": unit,
        "retail_section_id": section.id if section else None,
        "retail_section_name": str(section.name) if section else "",
        "is_material": item.material_id is not None,
        "is_checked": item.is_checked,
        "checked_by_name": _person_name(item.checked_by, item.checked_by_guest),
        "claimed_by_name": _person_name(item.claimed_by, item.claimed_by_guest),
        "claim_key": _person_key(item.claimed_by_id, item.claimed_by_guest_id),
        "added_key": _person_key(item.added_by_id, item.added_by_guest_id),
        "generated": item.has_sources,
        "sort_order": item.sort_order,
        "note": item.note,
    }


def _build_shared_rows(shopping_list: ShoppingList) -> list[dict[str, Any]]:
    items = (
        shopping_list.items.select_related(
            "ingredient__retail_section",
            "retail_section",
            "checked_by__profile",
            "claimed_by__profile",
            "checked_by_guest",
            "claimed_by_guest",
        )
        .annotate(has_sources=Exists(ShoppingListItemSource.objects.filter(shopping_list_item=OuterRef("pk"))))
        .all()
    )
    return [_shared_row(item) for item in items]


def _cache_key(shopping_list: ShoppingList, stamp: str) -> str:
    digest = hashlib.sha256(stamp.encode()).hexdigest()[:24]
    return f"shopping-board:v1:{shopping_list.id}:{digest}"


def _viewer_row(row: dict[str, Any], actor: Actor, viewer_key: str | None) -> dict[str, Any]:
    """Adds what only this viewer may see or do."""
    can_delete = actor.can_edit and not row["generated"] and (actor.guest is None or row["added_key"] == viewer_key)
    return {
        **{k: v for k, v in row.items() if k not in ("claim_key", "added_key", "generated")},
        "claimed_by_me": viewer_key is not None and row["claim_key"] == viewer_key,
        "can_delete": can_delete,
    }


def build_board(shopping_list: ShoppingList, actor: Actor) -> dict[str, Any]:
    """Board payload for one viewer; the entry rows come from the per-state cache."""
    stamp = list_stamp(shopping_list)
    key = _cache_key(shopping_list, stamp)
    rows = cache.get(key)
    if rows is None:
        rows = _build_shared_rows(shopping_list)
        cache.set(key, rows, BOARD_CACHE_TIMEOUT_S)

    viewer_key = _viewer_key(actor)
    items = [_viewer_row(row, actor, viewer_key) for row in rows]
    return {
        "id": shopping_list.id,
        "name": shopping_list.name,
        "stamp": stamp,
        "can_edit": actor.can_edit,
        "viewer_display_name": actor.display_name,
        "total": len(items),
        "checked": sum(1 for item in items if item["is_checked"]),
        "items": items,
    }
