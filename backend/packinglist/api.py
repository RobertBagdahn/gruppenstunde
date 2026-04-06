"""Django Ninja API routes for the Packing List module."""

import logging

from django.db.models import Max, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from profiles.models import GroupMembership
from profiles.choices import MembershipRoleChoices

from .models import PackingCategory, PackingItem, PackingList
from .schemas import (
    PackingCategoryCreateIn,
    PackingCategoryOut,
    PackingCategoryUpdateIn,
    PackingItemCreateIn,
    PackingItemOut,
    PackingItemUpdateIn,
    PackingListCreateIn,
    PackingListOut,
    PackingListSummaryOut,
    PackingListUpdateIn,
    SortOrderIn,
)

logger = logging.getLogger(__name__)

packing_list_router = Router(tags=["packing-lists"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _require_edit_permission(packing_list: PackingList, user):
    """Check that the user can edit this packing list."""
    if not packing_list.user_can_edit(user):
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten dieser Packliste")


# ==========================================================================
# Packing List CRUD
# ==========================================================================


@packing_list_router.get("/", response=list[PackingListSummaryOut])
def list_packing_lists(request):
    """List packing lists the user owns or can admin via group membership."""
    _require_auth(request)

    # Groups where user is admin
    admin_group_ids = GroupMembership.objects.filter(
        user=request.user,
        role=MembershipRoleChoices.ADMIN,
        is_active=True,
    ).values_list("group_id", flat=True)

    qs = PackingList.objects.select_related("owner", "group").prefetch_related("categories")

    if request.user.is_staff:
        return qs.filter(is_template=False)

    return qs.filter(
        Q(owner=request.user) | Q(group_id__in=admin_group_ids),
        is_template=False,
    ).distinct()


@packing_list_router.get("/templates/", response=list[PackingListSummaryOut])
def list_templates(request):
    """List all template packing lists (publicly accessible)."""
    return PackingList.objects.filter(is_template=True).select_related("owner", "group").prefetch_related("categories")


@packing_list_router.post("/", response=PackingListOut)
def create_packing_list(request, payload: PackingListCreateIn):
    """Create a new packing list."""
    _require_auth(request)
    data = payload.dict(exclude={"group_id"})
    packing_list = PackingList.objects.create(owner=request.user, **data)

    if payload.group_id is not None:
        from profiles.models import UserGroup

        group = get_object_or_404(UserGroup, id=payload.group_id, is_deleted=False)
        packing_list.group = group
        packing_list.save()

    # Attach can_edit for response
    packing_list.can_edit = True
    return packing_list


@packing_list_router.get("/{packing_list_id}/", response=PackingListOut)
def get_packing_list(request, packing_list_id: int):
    """Get a packing list by ID. Publicly accessible (read-only for non-owners)."""
    packing_list = get_object_or_404(
        PackingList.objects.select_related("owner", "group").prefetch_related("categories__items"),
        id=packing_list_id,
    )

    # Attach can_edit for the current user
    if request.user.is_authenticated:
        packing_list.can_edit = packing_list.user_can_edit(request.user)
    else:
        packing_list.can_edit = False

    return packing_list


@packing_list_router.patch("/{packing_list_id}/", response=PackingListOut)
def update_packing_list(request, packing_list_id: int, payload: PackingListUpdateIn):
    """Update a packing list (owner/group-admin only)."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    data = payload.dict(exclude_unset=True)

    # Handle group_id separately
    if "group_id" in data:
        group_id = data.pop("group_id")
        if group_id is not None:
            from profiles.models import UserGroup

            packing_list.group = get_object_or_404(UserGroup, id=group_id, is_deleted=False)
        else:
            packing_list.group = None

    for field, value in data.items():
        setattr(packing_list, field, value)
    packing_list.save()

    packing_list.can_edit = True
    return packing_list


@packing_list_router.delete("/{packing_list_id}/")
def delete_packing_list(request, packing_list_id: int):
    """Delete a packing list (owner only)."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)

    if packing_list.owner != request.user and not request.user.is_staff:
        raise HttpError(403, "Nur der Ersteller kann die Packliste löschen")

    packing_list.delete()
    return {"success": True, "message": "Packliste gelöscht"}


# ==========================================================================
# Clone & Export
# ==========================================================================


@packing_list_router.post("/{packing_list_id}/clone/", response=PackingListOut)
def clone_packing_list(request, packing_list_id: int):
    """Clone a packing list (creates a deep copy for the current user)."""
    _require_auth(request)
    original = get_object_or_404(
        PackingList.objects.prefetch_related("categories__items"),
        id=packing_list_id,
    )
    new_list = original.clone_for_user(request.user)
    new_list.can_edit = True
    return new_list


@packing_list_router.get("/{packing_list_id}/export/text/")
def export_text(request, packing_list_id: int):
    """Export a packing list as formatted plain text."""
    packing_list = get_object_or_404(
        PackingList.objects.prefetch_related("categories__items"),
        id=packing_list_id,
    )

    lines = [
        f"# {packing_list.title}",
        "",
    ]
    if packing_list.description:
        lines.append(packing_list.description)
        lines.append("")

    for category in packing_list.categories.all():
        lines.append(f"## {category.name}")
        for item in category.items.all():
            checkbox = "[x]" if item.is_checked else "[ ]"
            qty = f" ({item.quantity})" if item.quantity else ""
            desc = f" - {item.description}" if item.description else ""
            lines.append(f"  {checkbox} {item.name}{qty}{desc}")
        lines.append("")

    total = PackingItem.objects.filter(category__packing_list=packing_list).count()
    checked = PackingItem.objects.filter(category__packing_list=packing_list, is_checked=True).count()
    lines.append(f"---")
    lines.append(f"Fortschritt: {checked}/{total} gepackt")

    text = "\n".join(lines)
    return HttpResponse(text, content_type="text/plain; charset=utf-8")


@packing_list_router.post("/{packing_list_id}/reset-checks/")
def reset_checks(request, packing_list_id: int):
    """Reset all is_checked flags to False."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    PackingItem.objects.filter(category__packing_list=packing_list).update(is_checked=False)
    return {"success": True, "message": "Alle Gegenstände zurückgesetzt"}


# ==========================================================================
# Category CRUD
# ==========================================================================


@packing_list_router.post("/{packing_list_id}/categories/", response=PackingCategoryOut)
def create_category(request, packing_list_id: int, payload: PackingCategoryCreateIn):
    """Add a category to a packing list."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    # Auto-assign sort_order if not provided
    if payload.sort_order == 0:
        max_order = packing_list.categories.aggregate(max_order=Max("sort_order"))["max_order"]
        payload_dict = payload.dict()
        payload_dict["sort_order"] = (max_order or 0) + 1
    else:
        payload_dict = payload.dict()

    category = PackingCategory.objects.create(packing_list=packing_list, **payload_dict)
    return category


@packing_list_router.patch("/{packing_list_id}/categories/{category_id}/", response=PackingCategoryOut)
def update_category(request, packing_list_id: int, category_id: int, payload: PackingCategoryUpdateIn):
    """Update a category (rename, reorder)."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    category = get_object_or_404(PackingCategory, id=category_id, packing_list=packing_list)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(category, field, value)
    category.save()
    return category


@packing_list_router.delete("/{packing_list_id}/categories/{category_id}/")
def delete_category(request, packing_list_id: int, category_id: int):
    """Delete a category and all its items."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    category = get_object_or_404(PackingCategory, id=category_id, packing_list=packing_list)
    category.delete()
    return {"success": True, "message": "Kategorie gelöscht"}


@packing_list_router.post("/{packing_list_id}/categories/sort/")
def sort_categories(request, packing_list_id: int, payload: SortOrderIn):
    """Reorder categories within a packing list."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    for index, cat_id in enumerate(payload.ordered_ids):
        PackingCategory.objects.filter(id=cat_id, packing_list=packing_list).update(sort_order=index)

    return {"success": True, "message": "Kategorien sortiert"}


# ==========================================================================
# Item CRUD
# ==========================================================================


@packing_list_router.post("/{packing_list_id}/categories/{category_id}/items/", response=PackingItemOut)
def create_item(request, packing_list_id: int, category_id: int, payload: PackingItemCreateIn):
    """Add an item to a category."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    category = get_object_or_404(PackingCategory, id=category_id, packing_list=packing_list)

    # Auto-assign sort_order if not provided
    if payload.sort_order == 0:
        max_order = category.items.aggregate(max_order=Max("sort_order"))["max_order"]
        payload_dict = payload.dict()
        payload_dict["sort_order"] = (max_order or 0) + 1
    else:
        payload_dict = payload.dict()

    item = PackingItem.objects.create(category=category, **payload_dict)
    return item


@packing_list_router.patch(
    "/{packing_list_id}/categories/{category_id}/items/{item_id}/",
    response=PackingItemOut,
)
def update_item(
    request,
    packing_list_id: int,
    category_id: int,
    item_id: int,
    payload: PackingItemUpdateIn,
):
    """Update an item."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    category = get_object_or_404(PackingCategory, id=category_id, packing_list=packing_list)
    item = get_object_or_404(PackingItem, id=item_id, category=category)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(item, field, value)
    item.save()
    return item


@packing_list_router.delete("/{packing_list_id}/categories/{category_id}/items/{item_id}/")
def delete_item(request, packing_list_id: int, category_id: int, item_id: int):
    """Delete an item from a category."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    category = get_object_or_404(PackingCategory, id=category_id, packing_list=packing_list)
    item = get_object_or_404(PackingItem, id=item_id, category=category)
    item.delete()
    return {"success": True, "message": "Gegenstand gelöscht"}


@packing_list_router.post("/{packing_list_id}/categories/{category_id}/items/sort/")
def sort_items(request, packing_list_id: int, category_id: int, payload: SortOrderIn):
    """Reorder items within a category."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    category = get_object_or_404(PackingCategory, id=category_id, packing_list=packing_list)

    for index, item_id in enumerate(payload.ordered_ids):
        PackingItem.objects.filter(id=item_id, category=category).update(sort_order=index)

    return {"success": True, "message": "Gegenstände sortiert"}
