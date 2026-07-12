"""Django Ninja API routes for the Packing List module."""

import logging
from uuid import UUID

from django.db.models import Max, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from profiles.choices import MembershipRoleChoices
from profiles.models import GroupMembership

from .models import (
    PackingCategory,
    PackingItem,
    PackingList,
    PackingListShare,
    PackingListShareCheck,
    VisibilityChoices,
)
from .schemas import (
    AiSuggestIn,
    AiSuggestOut,
    CatalogSuggestionsOut,
    FullCatalogOut,
    GeneratePackingListIn,
    PackingCategoryCreateIn,
    PackingCategoryOut,
    PackingCategoryUpdateIn,
    PackingItemCreateIn,
    PackingItemOut,
    PackingItemUpdateIn,
    PackingListCreateIn,
    PackingListOut,
    PackingListUpdateIn,
    PaginatedPackingListOut,
    PresetOut,
    PreviewIn,
    PreviewOut,
    RandomSuggestionsOut,
    ShareCheckUpdateIn,
    ShareCreateIn,
    SharedPackingCategoryOut,
    SharedPackingItemOut,
    SharedPackingListOut,
    ShareOut,
    SortOrderIn,
)

logger = logging.getLogger(__name__)

packing_list_router = Router(tags=["packing-lists"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


def _require_edit_permission(packing_list: PackingList, user):
    """Check that the user can edit this packing list."""
    if not packing_list.user_can_edit(user):
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten dieser Packliste")


# ==========================================================================
# Packing List CRUD
# ==========================================================================


@packing_list_router.get("/", response=PaginatedPackingListOut)
def list_packing_lists(request, page: int = 1, page_size: int = 20):
    """List packing lists the user owns or can admin via group membership."""
    _require_auth(request)
    import math

    # Groups where user is admin
    admin_group_ids = GroupMembership.objects.filter(
        user=request.user,
        role=MembershipRoleChoices.ADMIN,
        is_active=True,
    ).values_list("group_id", flat=True)

    qs = PackingList.objects.select_related("owner", "group").prefetch_related("categories")

    if request.user.is_staff:
        qs = qs.filter(is_template=False)
    else:
        qs = qs.filter(
            Q(owner=request.user) | Q(group_id__in=admin_group_ids),
            is_template=False,
        ).distinct()

    total = qs.count()
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@packing_list_router.get("/templates/", response=PaginatedPackingListOut)
def list_templates(request, page: int = 1, page_size: int = 20):
    """List all template packing lists (publicly accessible)."""
    import math

    qs = PackingList.objects.filter(is_template=True).select_related("owner", "group").prefetch_related("categories")
    total = qs.count()
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@packing_list_router.get("/suggestions/categories/", response={200: dict})
def get_suggestion_categories(request):
    """Get all available suggestion category names from the master catalog."""
    from .services.suggestion_service import get_all_categories

    return {"categories": get_all_categories()}


# ==========================================================================
# Wizard: Generate, Preview, Presets, Catalog
# ==========================================================================


@packing_list_router.post("/generate/", response=PackingListOut)
def generate_packing_list(request, payload: GeneratePackingListIn):
    """Generate a packing list from wizard context using the dynamic builder."""
    _require_auth(request)

    from .services.suggestion_service import build_dynamic_list

    context = payload.context.dict()
    built = build_dynamic_list(context)

    # Create the packing list with context fields
    packing_list = PackingList.objects.create(
        title=payload.title,
        owner=request.user,
        activity_type=context.get("activity"),
        duration=context.get("duration"),
        season=context.get("season"),
        age_group=context.get("age_group"),
    )

    # Create categories and items from builder result
    for sort_order, (cat_name, items) in enumerate(built.items()):
        category = PackingCategory.objects.create(
            packing_list=packing_list,
            name=cat_name,
            sort_order=sort_order,
        )
        for item_order, item in enumerate(items):
            PackingItem.objects.create(
                category=category,
                name=item["name"],
                quantity=item.get("quantity", ""),
                description=item.get("description", ""),
                is_do_not_bring=item.get("is_do_not_bring", False),
                sort_order=item_order,
            )

    packing_list.can_edit = True
    return packing_list


@packing_list_router.post("/preview/", response=PreviewOut)
def preview_packing_list(request, payload: PreviewIn):
    """Preview the result of dynamic list generation without creating DB records."""
    _require_auth(request)

    from .services.suggestion_service import preview_dynamic_list

    context = payload.context.dict()
    result = preview_dynamic_list(context)
    return result


@packing_list_router.get("/presets/", response=list[PresetOut])
def get_presets(request):
    """Get all available presets for quick wizard selection."""
    from .services.suggestion_service import PRESETS

    return PRESETS


@packing_list_router.get("/catalog/", response=FullCatalogOut)
def get_full_catalog(request):
    """Get the full catalog for client-side autocomplete."""
    from .services.suggestion_service import get_full_catalog as _get_full_catalog

    items = _get_full_catalog()
    return {"items": items}


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
    """Get a packing list by ID. Access depends on visibility setting."""
    packing_list = get_object_or_404(
        PackingList.objects.select_related("owner", "group").prefetch_related("categories__items", "shares"),
        id=packing_list_id,
    )

    # Templates are always publicly accessible
    if not packing_list.is_template and packing_list.visibility == VisibilityChoices.PRIVATE:
        if not request.user.is_authenticated or not packing_list.user_can_edit(request.user):
            raise HttpError(404, "Packliste nicht gefunden")

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

    do_not_bring_items: list[PackingItem] = []

    for category in packing_list.categories.all():
        regular_items = [item for item in category.items.all() if not item.is_do_not_bring]
        dnb_items = [item for item in category.items.all() if item.is_do_not_bring]
        do_not_bring_items.extend(dnb_items)

        if regular_items:
            lines.append(f"## {category.name}")
            for item in regular_items:
                checkbox = "[x]" if item.is_checked else "[ ]"
                qty = f" ({item.quantity})" if item.quantity else ""
                desc = f" - {item.description}" if item.description else ""
                lines.append(f"  {checkbox} {item.name}{qty}{desc}")
            lines.append("")

    if do_not_bring_items:
        lines.append("## Nicht mitbringen")
        for item in do_not_bring_items:
            qty = f" ({item.quantity})" if item.quantity else ""
            desc = f" - {item.description}" if item.description else ""
            lines.append(f"  ❌ {item.name}{qty}{desc}")
        lines.append("")

    total = PackingItem.objects.filter(category__packing_list=packing_list, is_do_not_bring=False).count()
    checked = PackingItem.objects.filter(
        category__packing_list=packing_list, is_checked=True, is_do_not_bring=False
    ).count()
    lines.append("---")
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

    payload_dict = payload.dict(exclude={"supply_type", "supply_id"})

    # Auto-assign sort_order if not provided
    if payload_dict.get("sort_order", 0) == 0:
        max_order = category.items.aggregate(max_order=Max("sort_order"))["max_order"]
        payload_dict["sort_order"] = (max_order or 0) + 1

    # Resolve supply reference
    if payload.supply_type and payload.supply_id:
        from django.contrib.contenttypes.models import ContentType

        try:
            ct = ContentType.objects.get(model=payload.supply_type)
            ct.get_object_for_this_type(pk=payload.supply_id)  # verify exists
            payload_dict["supply_content_type"] = ct
            payload_dict["supply_object_id"] = payload.supply_id
        except (ContentType.DoesNotExist, Exception):
            raise HttpError(400, f"Ungültiger Ausrüstungstyp: {payload.supply_type}")

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

    update_data = payload.dict(exclude_unset=True)

    # Handle supply reference
    if "supply_type" in update_data or "supply_id" in update_data:
        supply_type = update_data.pop("supply_type", None)
        supply_id = update_data.pop("supply_id", None)
        if supply_type and supply_id:
            from django.contrib.contenttypes.models import ContentType

            try:
                ct = ContentType.objects.get(model=supply_type)
                ct.get_object_for_this_type(pk=supply_id)
                item.supply_content_type = ct
                item.supply_object_id = supply_id
            except (ContentType.DoesNotExist, Exception):
                raise HttpError(400, f"Ungültiger Ausrüstungstyp: {supply_type}")
        elif supply_type is None:
            item.supply_content_type = None
            item.supply_object_id = None
    else:
        update_data.pop("supply_type", None)
        update_data.pop("supply_id", None)

    for field, value in update_data.items():
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


# ==========================================================================
# Share Link Management
# ==========================================================================


@packing_list_router.post("/{packing_list_id}/shares/", response=ShareOut)
def create_share(request, packing_list_id: int, payload: ShareCreateIn):
    """Create a share link for a packing list."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    share = PackingListShare.objects.create(
        packing_list=packing_list,
        label=payload.label,
    )
    return share


@packing_list_router.get("/{packing_list_id}/shares/", response=list[ShareOut])
def list_shares(request, packing_list_id: int):
    """List all active share links for a packing list."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    return packing_list.shares.filter(is_active=True)


@packing_list_router.delete("/{packing_list_id}/shares/{share_id}/")
def deactivate_share(request, packing_list_id: int, share_id: int):
    """Deactivate a share link."""
    _require_auth(request)
    packing_list = get_object_or_404(PackingList, id=packing_list_id)
    _require_edit_permission(packing_list, request.user)

    share = get_object_or_404(PackingListShare, id=share_id, packing_list=packing_list, is_active=True)
    share.is_active = False
    share.save()
    return {"success": True, "message": "Freigabe-Link deaktiviert"}


# ==========================================================================
# Shared Packing List (public, via token)
# ==========================================================================


@packing_list_router.get("/shared/{token}/", response=SharedPackingListOut)
def get_shared_packing_list(request, token: UUID):
    """Load a packing list via share token. Public, no auth required."""
    share = get_object_or_404(
        PackingListShare.objects.select_related("packing_list__owner"),
        token=token,
        is_active=True,
    )

    packing_list = share.packing_list
    check_map: dict[int, bool] = dict(share.checks.values_list("item_id", "is_checked"))

    categories = []
    for category in packing_list.categories.prefetch_related("items").all():
        items = []
        for item in category.items.all():
            item.is_checked = check_map.get(item.id, False)
            items.append(item)

        categories.append(
            SharedPackingCategoryOut(
                id=category.id,
                name=category.name,
                sort_order=category.sort_order,
                items=[SharedPackingItemOut.from_orm(i) for i in items],
            )
        )

    owner_name = ""
    profile = getattr(packing_list.owner, "profile", None)
    if profile and profile.scout_display_name:
        owner_name = profile.scout_display_name
    else:
        owner_name = packing_list.owner.email

    return SharedPackingListOut(
        id=packing_list.id,
        title=packing_list.title,
        description=packing_list.description,
        owner_name=owner_name,
        categories=categories,
        share_token=str(share.token),
        share_label=share.label,
    )


@packing_list_router.patch("/shared/{token}/checks/")
def update_share_check(request, token: UUID, payload: ShareCheckUpdateIn):
    """Update check state for a specific item on a share link."""
    share = get_object_or_404(
        PackingListShare.objects.select_related("packing_list"),
        token=token,
        is_active=True,
    )

    item = get_object_or_404(
        PackingItem,
        id=payload.item_id,
        category__packing_list=share.packing_list,
    )

    if item.is_do_not_bring:
        raise HttpError(400, "Nicht-mitbringen-Gegenstände können nicht abgehakt werden")

    check, _ = PackingListShareCheck.objects.get_or_create(
        share=share,
        item=item,
        defaults={"is_checked": payload.is_checked},
    )
    if check.is_checked != payload.is_checked:
        check.is_checked = payload.is_checked
        check.save()

    return {"success": True, "is_checked": check.is_checked}


# ==========================================================================
# Suggestions (catalog + AI)
# ==========================================================================


@packing_list_router.get("/{packing_list_id}/suggestions/catalog/", response=CatalogSuggestionsOut)
def get_catalog_suggestions(request, packing_list_id: int, category: str | None = None, search: str | None = None):
    """Get item suggestions from the master catalog, excluding items already in the packing list."""
    packing_list = get_object_or_404(
        PackingList.objects.prefetch_related("categories__items"),
        id=packing_list_id,
    )

    # Collect existing item names
    existing_names = []
    for cat in packing_list.categories.all():
        for item in cat.items.all():
            existing_names.append(item.name)

    from .services.suggestion_service import get_catalog_suggestions as _get_catalog

    result = _get_catalog(
        existing_item_names=existing_names,
        category_filter=category,
        search_query=search,
    )
    return result


@packing_list_router.get("/{packing_list_id}/suggestions/random/", response=RandomSuggestionsOut)
def get_random_suggestions(request, packing_list_id: int, count: int = 8):
    """Get random item suggestions for quick-add chips."""
    packing_list = get_object_or_404(
        PackingList.objects.prefetch_related("categories__items"),
        id=packing_list_id,
    )

    existing_names = []
    for cat in packing_list.categories.all():
        for item in cat.items.all():
            existing_names.append(item.name)

    from .services.suggestion_service import get_random_suggestions as _get_random

    items = _get_random(existing_item_names=existing_names, count=count)
    return {"items": items}


@packing_list_router.post("/{packing_list_id}/suggestions/ai/", response=AiSuggestOut)
def get_ai_suggestions(request, packing_list_id: int, payload: AiSuggestIn):
    """Use AI to suggest additional packing list items based on context."""
    import json

    from django.http import HttpResponse

    _require_auth(request)
    packing_list = get_object_or_404(
        PackingList.objects.prefetch_related("categories__items"),
        id=packing_list_id,
    )

    existing_items = []
    for cat in packing_list.categories.all():
        for item in cat.items.all():
            existing_items.append(item.name)

    from .services.suggestion_service import PackingListAISuggestionError
    from .services.suggestion_service import get_ai_suggestions as _get_ai

    try:
        items, interaction_id = _get_ai(
            packing_list_title=packing_list.title,
            packing_list_description=packing_list.description,
            existing_items=existing_items,
            category_context=payload.category,
            count=payload.count,
            user=request.user,
        )
        return {"items": items, "ai_interaction_id": interaction_id}
    except PackingListAISuggestionError as exc:
        return HttpResponse(
            json.dumps({"detail": str(exc), "error_code": "ai_error", "ai_interaction_id": None}),
            status=503,
            content_type="application/json",
        )
    except Exception:
        logger.exception("Unexpected AI suggestion error")
        return HttpResponse(
            json.dumps({"detail": "KI-Vorschlag fehlgeschlagen", "error_code": "ai_error", "ai_interaction_id": None}),
            status=500,
            content_type="application/json",
        )
