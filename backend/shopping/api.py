"""API endpoints for the Shopping app."""

import math
from datetime import timedelta
from typing import Literal
from uuid import UUID, uuid4

from django.db import transaction
from django.db.models import Count, Q
from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from content.api.helpers import paginate_queryset
from core.permissions import require_login
from core.services.user_directory import USER_SEARCH_MAX_PAGE_SIZE, public_display_name, search_user_directory
from supply.models import Portion
from supply.schemas import MaterialListResultOut

from .models import (
    CollaboratorRole,
    KitchenReminder,
    KitchenReminderCategory,
    ReweExportToken,
    ShoppingList,
    ShoppingListCollaborator,
    ShoppingListGuest,
    ShoppingListItem,
    ShoppingListItemSource,
    SourceType,
)
from .schemas import (
    CollaboratorCreateIn,
    CollaboratorUpdateIn,
    FromRecipeIn,
    KitchenReminderCategoryOut,
    KitchenReminderOut,
    KitchenReminderSuggestIn,
    PaginatedShoppingListOut,
    PaginatedUserOut,
    ReweExportItem,
    ReweExportListResponse,
    ReweExportTokenResponse,
    ReweReportRequest,
    SharedListJoinIn,
    SharedListJoinOut,
    SharedListPreviewOut,
    ShoppingListCollaboratorOut,
    ShoppingListCreateIn,
    ShoppingListDetailOut,
    ShoppingListItemCreateIn,
    ShoppingListItemOut,
    ShoppingListItemUpdateIn,
    ShoppingListOut,
    ShoppingListPulseOut,
    ShoppingListShareOut,
    ShoppingListUpdateIn,
)
from .services.access import (
    MAX_GUESTS_PER_LIST,
    Actor,
    guest_from_request,
    require_actor_edit,
    require_login_unless_guest,
    resolve_actor,
)
from .services.material_items import add_consumable_items
from .services.pulse import list_stamp

shopping_router = Router(tags=["shopping-lists"])

# Completes "Bitte melde dich an, …" for read endpoints (the default speaks of saving).
READ_LOGIN_ACTION = "um deine Einkaufslisten zu sehen"


# ---------------------------------------------------------------------------
# Auth & permission helpers
# ---------------------------------------------------------------------------


def _get_user_role(shopping_list: ShoppingList, user) -> str | None:
    """Return the effective role of a user for a shopping list.

    Returns 'owner' for the list owner, the collaborator role string,
    or None if the user has no access. Staff has full admin/owner access
    unless a specific collaborator role is set.
    """
    if shopping_list.owner_id == user.id:
        return "owner"
    try:
        collab = ShoppingListCollaborator.objects.get(shopping_list=shopping_list, user=user)
        return collab.role
    except ShoppingListCollaborator.DoesNotExist:
        if getattr(user, "is_staff", False):
            return "owner"
        return None


def _require_access(shopping_list: ShoppingList, user) -> str:
    """Require that the user has at least viewer access. Returns the role."""
    role = _get_user_role(shopping_list, user)
    if role is None:
        raise HttpError(404, "Einkaufsliste nicht gefunden")
    return role


def _require_edit(shopping_list: ShoppingList, user) -> str:
    """Require at least editor access. Returns the role."""
    role = _require_access(shopping_list, user)
    if role == CollaboratorRole.VIEWER:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten")
    return role


def _require_admin(shopping_list: ShoppingList, user) -> str:
    """Require at least admin access. Returns the role."""
    role = _require_access(shopping_list, user)
    if role not in ("owner", CollaboratorRole.ADMIN):
        raise HttpError(403, "Nur Admins und Besitzer können das ändern")
    return role


def _require_owner(shopping_list: ShoppingList, user) -> None:
    """Require owner access; users without any access get 404 like every other path."""
    _require_access(shopping_list, user)
    if shopping_list.owner_id != user.id and not getattr(user, "is_staff", False):
        raise HttpError(403, "Nur der Besitzer kann die Liste löschen")


def _attach_actor(shopping_list: ShoppingList, actor: Actor) -> None:
    """Expose what the viewer may do (and who they are) to the detail schema."""
    shopping_list._can_edit = actor.can_edit
    shopping_list._is_owner = actor.role == "owner"
    shopping_list._can_manage = actor.can_manage
    shopping_list._viewer_guest_id = actor.guest.id if actor.guest else None
    shopping_list._viewer_display_name = actor.display_name
    shopping_list._request_user = actor.user
    shopping_list._viewer_actor = actor


def _item_can_delete(item: ShoppingListItem, actor: Actor) -> bool:
    """Generated entries are rebuilt from their source; guests remove only what they added."""
    if not actor.can_edit or item.sources.exists():
        return False
    return actor.guest is None or item.added_by_guest_id == actor.guest.id


def _shared_list_or_404(token: str) -> ShoppingList:
    try:
        share_token = UUID(token)
    except (ValueError, TypeError):
        raise HttpError(404, "Dieser Einladungslink ist nicht mehr gültig")
    shopping_list = ShoppingList.objects.filter(share_token=share_token).select_related("owner__profile").first()
    if shopping_list is None:
        raise HttpError(404, "Dieser Einladungslink ist nicht mehr gültig")
    return shopping_list


def _share_payload(shopping_list: ShoppingList) -> dict:
    return {
        "share_token": str(shopping_list.share_token) if shopping_list.share_token else None,
        "guests": list(shopping_list.guests.all()),
    }


# ---------------------------------------------------------------------------
# Shopping List CRUD (7.2 – 7.6)
# ---------------------------------------------------------------------------


@shopping_router.get("/", response=PaginatedShoppingListOut)
def list_shopping_lists(
    request,
    page: int = 1,
    page_size: int = 20,
    q: str = "",
    sort: Literal["newest", "oldest", "name_asc"] = "newest",
    mine: bool = False,
    source_type: Literal["manual", "recipe", "meal_event"] | None = None,
    source_id: int | None = None,
):
    """List shopping lists the user owns or collaborates on.

    ``sort`` orders the whole result (not just one page) and ``mine`` limits it to
    lists owned by the user. Every order ends in ``id`` so paging never skips or
    repeats a list.
    """
    require_login(request, READ_LOGIN_ACTION)
    qs = (
        ShoppingList.objects.filter(Q(owner=request.user) | Q(collaborators__user=request.user))
        .select_related("owner__profile")
        .annotate(
            items_count=Count("items", distinct=True),
            checked_count=Count("items", filter=Q(items__is_checked=True), distinct=True),
            collaborators_count=Count("collaborators", distinct=True),
        )
        .distinct()
    )
    if q:
        qs = qs.filter(name__icontains=q)
    if mine:
        qs = qs.filter(owner=request.user)
    if source_type is not None:
        qs = qs.filter(source_type=source_type)
    if source_id is not None:
        qs = qs.filter(source_id=source_id)
    ordering = {
        "newest": ("-updated_at", "-id"),
        "oldest": ("updated_at", "id"),
        "name_asc": (Lower("name"), "id"),
    }[sort]
    qs = qs.order_by(*ordering)
    result = paginate_queryset(qs, page, page_size)
    from shopping.services.source_status import freshness_for_lists

    freshness = freshness_for_lists(request.user, result["items"])
    for item in result["items"]:
        item._source_freshness = freshness.get(item.id)
        if item.owner_id == request.user.id:
            item.can_edit = True
            item.can_delete = True
        else:
            collab = item.collaborators.filter(user=request.user).first()
            if collab and collab.role in (CollaboratorRole.ADMIN, CollaboratorRole.EDITOR):
                item.can_edit = True
            item.can_delete = False
    return result


@shopping_router.post("/", response=ShoppingListOut)
def create_shopping_list(request, payload: ShoppingListCreateIn):
    """Create a new manual shopping list."""
    require_login(request)
    shopping_list = ShoppingList.objects.create(
        name=payload.name,
        owner=request.user,
        source_type=SourceType.MANUAL,
    )
    return shopping_list


# Static route must be registered before /{shopping_list_id}/ to avoid routing conflicts
@shopping_router.get("/users/", response=PaginatedUserOut)
def list_users(
    request,
    q: str = "",
    page: int = 1,
    page_size: int = USER_SEARCH_MAX_PAGE_SIZE,
):
    """Search users by name (or exact e-mail) for the collaborator invite flow."""
    require_login(request)
    return search_user_directory(q, page=page, page_size=page_size)


# ---------------------------------------------------------------------------
# Invitation link: join without an account (static routes before /{shopping_list_id}/)
# ---------------------------------------------------------------------------


@shopping_router.get("/shared/{token}/", response=SharedListPreviewOut)
def preview_shared_list(request, token: str):
    """Identity of the list behind an invitation link; shows no entries before joining."""
    shopping_list = _shared_list_or_404(token)
    guest = guest_from_request(request, shopping_list)
    user = request.user if request.user.is_authenticated else None
    from .services.access import member_role

    is_member = user is not None and member_role(shopping_list, user) is not None
    return SharedListPreviewOut(
        list_id=shopping_list.id,
        name=shopping_list.name,
        owner_display_name=public_display_name(shopping_list.owner),
        items_count=shopping_list.items.count(),
        checked_count=shopping_list.items.filter(is_checked=True).count(),
        already_member=is_member or guest is not None,
        guest_name=guest.name if guest else None,
    )


@shopping_router.post("/shared/{token}/join/", response=SharedListJoinOut)
def join_shared_list(request, token: str, payload: SharedListJoinIn):
    """Join through the link: accounts become editors, everyone else joins as a named guest."""
    shopping_list = _shared_list_or_404(token)

    from .services.access import member_role

    if request.user.is_authenticated:
        if member_role(shopping_list, request.user) is None:
            ShoppingListCollaborator.objects.get_or_create(
                shopping_list=shopping_list, user=request.user, defaults={"role": CollaboratorRole.EDITOR}
            )
        return SharedListJoinOut(list_id=shopping_list.id, display_name=public_display_name(request.user))

    name = " ".join(payload.name.split())
    if not name:
        raise HttpError(422, "Bitte gib deinen Namen ein, damit die anderen sehen, wer was abhakt.")

    guest = guest_from_request(request, shopping_list)
    if guest is not None:
        # A returning device keeps its identity; entering another name renames it.
        if guest.name != name:
            guest.name = name
            guest.save(update_fields=["name"])
    else:
        if shopping_list.guests.count() >= MAX_GUESTS_PER_LIST:
            raise HttpError(400, "Diese Liste hat die maximale Zahl an Gästen erreicht.")
        guest = ShoppingListGuest.objects.create(shopping_list=shopping_list, name=name)
    return SharedListJoinOut(
        list_id=shopping_list.id, display_name=guest.name, guest_token=str(guest.token), guest_id=guest.id
    )


# ---------------------------------------------------------------------------
# REWE Export — static token routes (must be before /{shopping_list_id}/)
# ---------------------------------------------------------------------------


@shopping_router.get("/rewe-export/{token}/", response=ReweExportListResponse)
def rewe_export_get_list(request, token: str):
    """Return shopping list items for REWE export via a valid token."""
    try:
        from uuid import UUID

        token_uuid = UUID(token)
    except (ValueError, TypeError):
        raise HttpError(401, "Ungültiges Token-Format. Bitte neuen Token erzeugen.")

    export_token = ReweExportToken.objects.filter(token=token_uuid).first()
    if not export_token or not export_token.is_valid():
        raise HttpError(401, "Token abgelaufen oder ungültig. Bitte neuen Token erzeugen.")

    shopping_list = export_token.shopping_list
    items = shopping_list.items.select_related("ingredient").order_by("sort_order", "id")

    export_items = []
    for item in items:
        matched = bool(item.ingredient and item.ingredient.nan_art_id_rewe)
        nan_art_id = item.ingredient.nan_art_id_rewe if item.ingredient else None
        order_quantity, unit = _compute_order_quantity(item)

        export_items.append(
            ReweExportItem(
                item_id=item.id,
                ingredient_name=item.name,
                nan_art_id_rewe=nan_art_id,
                order_quantity=order_quantity,
                unit=unit,
                already_added_at=item.rewe_added_at,
                matched=matched,
            )
        )

    return ReweExportListResponse(
        items=export_items,
        shopping_list_id=shopping_list.id,
        shopping_list_name=shopping_list.name,
    )


@shopping_router.post("/rewe-export/{token}/report/")
def rewe_export_report(request, token: str, payload: ReweReportRequest):
    """Receive export result report from the bookmarklet."""
    try:
        from uuid import UUID

        token_uuid = UUID(token)
    except (ValueError, TypeError):
        raise HttpError(401, "Ungültiges Token-Format.")

    export_token = ReweExportToken.objects.filter(token=token_uuid).first()
    if not export_token or not export_token.is_valid():
        raise HttpError(401, "Token abgelaufen oder ungültig.")

    shopping_list = export_token.shopping_list
    now = timezone.now()

    valid_item_ids = set(ShoppingListItem.objects.filter(shopping_list=shopping_list).values_list("id", flat=True))

    successful = []
    ignored = []
    for item_id in payload.successful_item_ids:
        if item_id in valid_item_ids:
            successful.append(item_id)
        else:
            ignored.append(item_id)

    if successful:
        ShoppingListItem.objects.filter(id__in=successful).update(rewe_added_at=now)

    return {"success": True, "updated": len(successful), "ignored": len(ignored)}


def _item_section_name(item: ShoppingListItem) -> str:
    """Section of an item, falling back to the ingredient's current section."""
    section = item.retail_section or (item.ingredient.retail_section if item.ingredient else None)
    return section.name if section else ""


def _compute_order_quantity(item: ShoppingListItem) -> tuple[float, str]:
    """Compute the order quantity and display unit for REWE export.

    Uses the ingredient's standard package (rank=1) with the same 5 %
    tolerance as the shopping list (`compute_package_need`). Without a
    package, a shopping-relevant portion is used (rounding up). Small cooking
    sub-portions (e.g. 1 TL = 5g) are NOT used as package units to avoid
    runaway order quantities; the export falls back to raw grams instead.
    """
    from supply.utils import compute_package_need, format_exact_weight, format_weight, get_shopping_portion

    quantity_g = item.quantity_g or 0
    if not quantity_g or quantity_g <= 0:
        return 0.0, item.unit or "g"

    if not item.ingredient:
        return quantity_g, item.unit or "g"

    # Prefer the ingredient's rank=1 Package (a real purchasable unit).
    package = get_shopping_portion(item.ingredient)
    need = compute_package_need(quantity_g, package.weight_g) if package else None
    if package and need:
        return float(need[0]), f"{package.name or 'Packung'} ({format_exact_weight(package.weight_g or 0)})"

    portion: Portion | None = None
    if package is None:
        # Fall back to a shopping-relevant Portion only. Small cooking
        # portions (<= 20g) are not meaningful package units.
        portion = item.ingredient.portions.filter(
            deleted_at__isnull=True,
            rank=1,
            weight_g__gt=20,
        ).first()
    if portion and portion.weight_g and portion.weight_g > 0:
        count = math.ceil(quantity_g / portion.weight_g)
        label = portion.name or "Packung"
        return float(count), f"{label} ({format_weight(portion.weight_g)})"

    return quantity_g, "g"


@shopping_router.get("/{shopping_list_id}/", response=ShoppingListDetailOut)
def get_shopping_list(request, shopping_list_id: int):
    """Get shopping list detail with items and collaborators."""
    require_login_unless_guest(request, READ_LOGIN_ACTION)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    actor = resolve_actor(request, shopping_list)

    # Permissions depend on the viewer, so they are attached as attributes.
    _attach_actor(shopping_list, actor)
    shopping_list.quantity_warnings = _quantity_warnings(shopping_list)
    return shopping_list


@shopping_router.get("/{shopping_list_id}/pulse/", response=ShoppingListPulseOut)
def get_shopping_list_pulse(request, shopping_list_id: int):
    """Change marker for polling: one aggregate query instead of the full, heavy list."""
    require_login_unless_guest(request, READ_LOGIN_ACTION)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    resolve_actor(request, shopping_list)

    return ShoppingListPulseOut(stamp=list_stamp(shopping_list))


def _quantity_warnings(shopping_list: ShoppingList) -> list:
    """Plausibility warnings of the source meal plan (empty for other sources)."""
    if shopping_list.source_type != SourceType.MEAL_EVENT or not shopping_list.source_id:
        return []
    from planner.models import MealPlan
    from planner.services.quantity_plausibility import check_meals

    meal_plan = MealPlan.objects.filter(id=shopping_list.source_id).first()
    if meal_plan is None:
        return []
    return check_meals(meal_plan.meals.filter(is_reference=False))


@shopping_router.patch("/{shopping_list_id}/", response=ShoppingListOut)
def update_shopping_list(request, shopping_list_id: int, payload: ShoppingListUpdateIn):
    """Update shopping list name (owner/admin only)."""
    require_login(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_admin(shopping_list, request.user)

    # An explicit null must not clear the (required) name.
    data = {key: value for key, value in payload.dict(exclude_unset=True).items() if value is not None}
    if "name" in data:
        data["name"] = data["name"].strip()
        if not data["name"]:
            raise HttpError(422, "Bitte gib einen Namen für die Liste ein.")
    for field, value in data.items():
        setattr(shopping_list, field, value)
    shopping_list.save()
    return shopping_list


@shopping_router.delete("/{shopping_list_id}/")
def delete_shopping_list(request, shopping_list_id: int):
    """Delete a shopping list (owner only)."""
    require_login(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_owner(shopping_list, request.user)
    shopping_list.delete()
    return {"success": True, "message": "Einkaufsliste gelöscht"}


# ---------------------------------------------------------------------------
# Shopping List Views (summarized, by-recipe)
# ---------------------------------------------------------------------------


@shopping_router.get("/{shopping_list_id}/material-list/", response=MaterialListResultOut)
def get_shopping_list_material_list(request, shopping_list_id: int):
    """Unsaved material list of the recipes a shopping list was created from."""
    require_login_unless_guest(request, READ_LOGIN_ACTION)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    resolve_actor(request, shopping_list)

    from supply.services.material_aggregation import (
        aggregate_materials,
        material_list_payload,
        meal_plan_material_entries,
    )

    entries: list[tuple[object, float]] = []
    if shopping_list.source_type == SourceType.RECIPE and shopping_list.source_id:
        from recipe.models import Recipe

        recipe = Recipe.objects.filter(id=shopping_list.source_id).first()
        if recipe is not None:
            entries = [(recipe, shopping_list.source_portions or 1)]
    elif shopping_list.source_type == SourceType.MEAL_EVENT and shopping_list.source_id:
        from planner.models import MealPlan

        meal_plan = MealPlan.objects.filter(id=shopping_list.source_id).first()
        if meal_plan is not None:
            entries = meal_plan_material_entries(meal_plan)

    return material_list_payload(shopping_list.name, aggregate_materials(entries))


@shopping_router.get("/{shopping_list_id}/view/")
def get_shopping_list_view(request, shopping_list_id: int, view: str = "detailed"):
    """Get shopping list items in different view modes.

    Views:
    - detailed: default item list (same as detail endpoint)
    - summarized: group by ingredient, sum quantities
    - by_recipe: group by source recipe
    """
    require_login_unless_guest(request, READ_LOGIN_ACTION)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    resolve_actor(request, shopping_list)

    items = (
        shopping_list.items.select_related("ingredient", "retail_section", "ingredient__retail_section")
        .prefetch_related("sources")
        .order_by("retail_section__rank", "retail_section__name", "sort_order")
    )

    if view == "summarized":
        # Group by ingredient, sum quantities
        grouped: dict[int | str, dict] = {}
        for item in items:
            key = item.ingredient_id or item.name
            if key not in grouped:
                grouped[key] = {
                    "name": item.ingredient.name if item.ingredient else item.name,
                    "total_quantity_g": 0.0,
                    "unit": item.unit or "g",
                    "retail_section": _item_section_name(item),
                    "is_checked": True,
                    "items_count": 0,
                }
            grouped[key]["total_quantity_g"] += float(item.quantity_g or 0)
            grouped[key]["items_count"] += 1
            if not item.is_checked:
                grouped[key]["is_checked"] = False

        return {"view": "summarized", "groups": list(grouped.values())}

    elif view == "by_recipe":
        # Group by persisted provenance instead of the editable note field.
        by_source: dict[str, list] = {}
        for item in items:
            sources: list[ShoppingListItemSource | None] = list(item.sources.all()) or [None]
            for source_obj in sources:
                source = (
                    (source_obj.recipe_name or source_obj.meal_label) if source_obj else (item.note or "Sonstiges")
                ) or ("Direkte Zutat" if source_obj and source_obj.ingredient_id else "Sonstiges")
                by_source.setdefault(source, []).append(
                    {
                        "id": item.id,
                        "name": item.ingredient.name if item.ingredient else item.name,
                        "quantity_g": float(source_obj.quantity_g if source_obj else item.quantity_g or 0),
                        "unit": item.unit or "g",
                        "is_checked": item.is_checked,
                    }
                )

        return {"view": "by_recipe", "groups": [{"source": k, "items": v} for k, v in by_source.items()]}

    else:
        # Detailed: return raw items
        return {
            "view": "detailed",
            "items": [
                {
                    "id": item.id,
                    "name": item.ingredient.name if item.ingredient else item.name,
                    "quantity_g": float(item.quantity_g or 0),
                    "unit": item.unit or "g",
                    "retail_section": _item_section_name(item),
                    "is_checked": item.is_checked,
                    "note": item.note or "",
                }
                for item in items
            ],
        }


# ---------------------------------------------------------------------------
# Shopping List Items (7.7 – 7.9)
# ---------------------------------------------------------------------------


@shopping_router.post("/{shopping_list_id}/items/", response=ShoppingListItemOut)
def add_item(request, shopping_list_id: int, payload: ShoppingListItemCreateIn):
    """Add an item to a shopping list."""
    require_login_unless_guest(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    actor = require_actor_edit(resolve_actor(request, shopping_list))

    from supply.models.ingredient import Ingredient
    from supply.models.reference import RetailSection

    data = payload.dict(exclude={"ingredient_id", "retail_section_id"})
    data["name"] = data["name"].strip()
    if not data["name"]:
        raise HttpError(422, "Bitte gib einen Namen für den Eintrag ein.")
    data.update(added_by=actor.user, added_by_guest=actor.guest)
    if payload.is_checked:
        data.update(checked_by=actor.user, checked_by_guest=actor.guest, checked_at=timezone.now())
    ingredient = None
    retail_section = None
    matched_from_text = False

    # A uniquely matching typed amount is safer and more useful when stored as
    # a linked ingredient than as an opaque free-text row.
    if payload.ingredient_id is None and payload.quantity_g == 0 and payload.unit == "g":
        from shopping.services.item_matching import parse_manual_ingredient_quantity

        parsed = parse_manual_ingredient_quantity(data["name"], actor.user)
        if parsed is not None:
            ingredient = parsed.ingredient
            matched_from_text = True
            data.update(name=parsed.name, quantity_g=parsed.quantity_g, unit="g")
            if payload.retail_section_id is None:
                retail_section = parsed.ingredient.retail_section

    # Resolve optional FKs
    if payload.ingredient_id:
        ingredient = Ingredient.objects.filter(id=payload.ingredient_id).first()
        if ingredient is None:
            raise HttpError(422, "Zutat nicht gefunden")

    if payload.retail_section_id:
        retail_section = RetailSection.objects.filter(id=payload.retail_section_id).first()
        if retail_section is None:
            raise HttpError(422, "Supermarkt-Abteilung nicht gefunden")

    if matched_from_text and ingredient is not None:
        merge_candidates = (
            ShoppingListItem.objects.filter(
                shopping_list=shopping_list,
                unit="g",
                is_checked=False,
                sources__isnull=True,
            )
            .filter(Q(ingredient=ingredient) | Q(ingredient__isnull=True, name__iexact=data["name"]))
            .distinct()
        )
        if merge_candidates.count() == 1:
            item = merge_candidates.get()
            item.ingredient = ingredient
            item.name = data["name"]
            item.quantity_g += data["quantity_g"]
            update_fields = ["ingredient", "name", "quantity_g", "updated_at"]
            if item.retail_section_id is None and retail_section is not None:
                item.retail_section = retail_section
                update_fields.append("retail_section")
            item.save(update_fields=update_fields)
            item._can_delete = _item_can_delete(item, actor)
            return item

    item = ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        ingredient=ingredient,
        retail_section=retail_section,
        **data,
    )
    item._can_delete = _item_can_delete(item, actor)
    return item


@shopping_router.patch("/{shopping_list_id}/items/{item_id}/", response=ShoppingListItemOut)
def update_item(
    request,
    shopping_list_id: int,
    item_id: int,
    payload: ShoppingListItemUpdateIn,
):
    """Update or check/uncheck a shopping list item."""
    require_login_unless_guest(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    actor = require_actor_edit(resolve_actor(request, shopping_list))
    item = get_object_or_404(ShoppingListItem, id=item_id, shopping_list=shopping_list)

    claimed = payload.claimed
    # An explicit null never clears a required field; only the section and the note may be emptied.
    data = {
        key: value
        for key, value in payload.dict(exclude_unset=True).items()
        if (value is not None or key == "retail_section_id") and key != "claimed"
    }
    if "name" in data:
        data["name"] = data["name"].strip()
        if not data["name"]:
            raise HttpError(422, "Bitte gib einen Namen für den Eintrag ein.")

    # Handle retail_section FK
    if "retail_section_id" in data:
        from supply.models.reference import RetailSection

        rs_id = data.pop("retail_section_id")
        if rs_id:
            item.retail_section = RetailSection.objects.filter(id=rs_id).first()
        else:
            item.retail_section = None

    # Handle is_checked → set checked_by / checked_at
    if "is_checked" in data:
        if data["is_checked"]:
            # Two people ticking the same entry at once: the first one stays the checker.
            if not item.is_checked:
                item.is_checked = True
                item.checked_by = actor.user
                item.checked_by_guest = actor.guest
                item.checked_at = timezone.now()
        else:
            item.is_checked = False
            item.checked_by = None
            item.checked_by_guest = None
            item.checked_at = None
        data.pop("is_checked")

    if claimed is True:
        if item.claimed_by_id or item.claimed_by_guest_id:
            if not actor.owns_claim(item):
                raise HttpError(409, "Diesen Eintrag hat schon jemand übernommen")
        else:
            item.claimed_by = actor.user
            item.claimed_by_guest = actor.guest
    elif claimed is False and (actor.owns_claim(item) or actor.can_manage):
        item.claimed_by = None
        item.claimed_by_guest = None
    elif claimed is False and (item.claimed_by_id or item.claimed_by_guest_id):
        raise HttpError(403, "Nur wer den Eintrag übernommen hat, kann ihn wieder freigeben")

    for field, value in data.items():
        setattr(item, field, value)

    item.save()
    item._claimed_by_me = actor.owns_claim(item)
    item._can_delete = _item_can_delete(item, actor)
    return item


@shopping_router.delete("/{shopping_list_id}/items/{item_id}/")
def delete_item(request, shopping_list_id: int, item_id: int):
    """Remove an item from a shopping list; guests may remove only entries they added."""
    require_login_unless_guest(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    actor = require_actor_edit(resolve_actor(request, shopping_list))
    item = get_object_or_404(ShoppingListItem, id=item_id, shopping_list=shopping_list)
    if actor.guest is not None and item.added_by_guest_id != actor.guest.id:
        raise HttpError(403, "Gäste können nur eigene Einträge löschen")
    item.delete()
    return {"success": True, "message": "Eintrag gelöscht"}


# ---------------------------------------------------------------------------
# Collaborators (7.10 – 7.12)
# ---------------------------------------------------------------------------


@shopping_router.post(
    "/{shopping_list_id}/collaborators/",
    response=ShoppingListCollaboratorOut,
)
def add_collaborator(request, shopping_list_id: int, payload: CollaboratorCreateIn):
    """Invite a collaborator to a shopping list."""
    require_login(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_admin(shopping_list, request.user)

    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.filter(id=payload.user_id).first()
    if not user:
        raise HttpError(404, "Nutzer nicht gefunden")

    if user.id == shopping_list.owner_id:
        raise HttpError(400, "Der Besitzer kann nicht als Mitglied hinzugefügt werden")

    if ShoppingListCollaborator.objects.filter(shopping_list=shopping_list, user=user).exists():
        raise HttpError(400, "Nutzer ist bereits Mitglied")

    # Validate role
    valid_roles = [r.value for r in CollaboratorRole]
    if payload.role not in valid_roles:
        raise HttpError(400, f"Ungültige Rolle: {payload.role}")

    collab = ShoppingListCollaborator.objects.create(
        shopping_list=shopping_list,
        user=user,
        role=payload.role,
    )
    return collab


@shopping_router.patch(
    "/{shopping_list_id}/collaborators/{collab_id}/",
    response=ShoppingListCollaboratorOut,
)
def update_collaborator(
    request,
    shopping_list_id: int,
    collab_id: int,
    payload: CollaboratorUpdateIn,
):
    """Change a collaborator's role."""
    require_login(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_admin(shopping_list, request.user)

    collab = get_object_or_404(ShoppingListCollaborator, id=collab_id, shopping_list=shopping_list)

    valid_roles = [r.value for r in CollaboratorRole]
    if payload.role not in valid_roles:
        raise HttpError(400, f"Ungültige Rolle: {payload.role}")

    collab.role = payload.role
    collab.save()
    return collab


@shopping_router.delete("/{shopping_list_id}/collaborators/{collab_id}/")
def remove_collaborator(request, shopping_list_id: int, collab_id: int):
    """Remove a collaborator from a shopping list."""
    require_login(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_admin(shopping_list, request.user)

    collab = get_object_or_404(ShoppingListCollaborator, id=collab_id, shopping_list=shopping_list)
    collab.delete()
    return {"success": True, "message": "Mitglied entfernt"}


# ---------------------------------------------------------------------------
# Invitation link management (owner/admin)
# ---------------------------------------------------------------------------


def _managed_list(request, shopping_list_id: int) -> ShoppingList:
    require_login(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_admin(shopping_list, request.user)
    return shopping_list


@shopping_router.post("/{shopping_list_id}/share/", response=ShoppingListShareOut)
def enable_sharing(request, shopping_list_id: int):
    """Turn the invitation link on (keeps the current link if it is already on)."""
    shopping_list = _managed_list(request, shopping_list_id)
    if shopping_list.share_token is None:
        shopping_list.share_token = uuid4()
        shopping_list.save(update_fields=["share_token", "updated_at"])
    return _share_payload(shopping_list)


@shopping_router.post("/{shopping_list_id}/share/regenerate/", response=ShoppingListShareOut)
def regenerate_sharing(request, shopping_list_id: int):
    """Replace the link; the old one and everyone who joined through it lose access."""
    shopping_list = _managed_list(request, shopping_list_id)
    with transaction.atomic():
        shopping_list.guests.all().delete()
        shopping_list.share_token = uuid4()
        shopping_list.save(update_fields=["share_token", "updated_at"])
    return _share_payload(shopping_list)


@shopping_router.delete("/{shopping_list_id}/share/", response=ShoppingListShareOut)
def disable_sharing(request, shopping_list_id: int):
    """Turn the link off; guests lose access, their entries stay (without attribution)."""
    shopping_list = _managed_list(request, shopping_list_id)
    with transaction.atomic():
        shopping_list.guests.all().delete()
        shopping_list.share_token = None
        shopping_list.save(update_fields=["share_token", "updated_at"])
    return _share_payload(shopping_list)


@shopping_router.delete("/{shopping_list_id}/guests/{guest_id}/")
def remove_guest(request, shopping_list_id: int, guest_id: int):
    """Remove one guest; the link keeps working for everyone else."""
    shopping_list = _managed_list(request, shopping_list_id)
    guest = get_object_or_404(ShoppingListGuest, id=guest_id, shopping_list=shopping_list)
    guest.delete()
    return {"success": True, "message": "Gast entfernt"}


# ---------------------------------------------------------------------------
# REWE Export — token generation (parameterized route)
# ---------------------------------------------------------------------------


@shopping_router.post("/{shopping_list_id}/rewe-export-token/", response=ReweExportTokenResponse)
def create_rewe_export_token(request, shopping_list_id: int):
    """Generate a short-lived token for REWE basket export."""
    require_login(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_access(shopping_list, request.user)

    now = timezone.now()
    expires_at = now + timedelta(minutes=5)

    export_token = ReweExportToken.objects.create(
        shopping_list=shopping_list,
        user=request.user,
        expires_at=expires_at,
    )

    return ReweExportTokenResponse(
        token=str(export_token.token),
        export_url=f"/api/shopping-lists/rewe-export/{export_token.token}/",
        expires_at=expires_at,
    )


# ---------------------------------------------------------------------------
# Export from Recipe / MealPlan (7.13 – 7.14)
# ---------------------------------------------------------------------------


@shopping_router.post("/from-recipe/{recipe_id}/", response=ShoppingListDetailOut)
def create_from_recipe(request, recipe_id: int, payload: FromRecipeIn):
    """Create a shopping list from a recipe's ingredients."""
    require_login(request)

    from content.services.food_access import get_visible_recipe_or_404
    from planner.services.calculation_context import resolve_active_recipe_items
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

    recipe = get_visible_recipe_or_404(request.user, recipe_id)
    portions = payload.portions
    active_items = {item.recipe_item.id: item for item in resolve_active_recipe_items(recipe)}

    with transaction.atomic():
        shopping_list = ShoppingList.objects.create(
            name=f"Einkaufsliste: {recipe.title}",
            owner=request.user,
            source_type=SourceType.RECIPE,
            source_id=recipe.id,
            source_portions=portions,
        )

        recipe_items = recipe.recipe_items.select_related(
            "portion__ingredient__retail_section",
            "portion__measuring_unit",
            "ingredient__retail_section",
        )

        sort_idx = 0
        for ri in recipe_items:
            # Inactive exchange alternatives and soft-deleted portions are not bought.
            active_item = active_items.get(ri.id)
            if not active_item:
                continue

            ing = get_recipe_item_ingredient(ri)
            # Recipe quantities are stored per person.
            weight_g = (active_item.weight_g or 0) * portions
            portion_unit = ri.portion.measuring_unit.name if ri.portion and ri.portion.measuring_unit else ""
            if ing is None:
                # Unlinked direct-gram items keep their grams; unlinked portions have no weight basis.
                item = ShoppingListItem.objects.create(
                    shopping_list=shopping_list,
                    name=ri.note or "Unbekannte Zutat",
                    quantity_g=weight_g,
                    unit="g" if active_item.weight_g is not None else portion_unit,
                    note=""
                    if active_item.weight_g is not None
                    else f"Menge: {active_item.quantity:g}; Gewicht unbekannt",
                    sort_order=sort_idx,
                )
            else:
                note = ""
                if active_item.weight_g is None:
                    note = f"Menge: {active_item.quantity:g} {portion_unit}".rstrip() + "; Gewicht unbekannt"

                item = ShoppingListItem.objects.create(
                    shopping_list=shopping_list,
                    ingredient=ing,
                    name=ing.name,
                    quantity_g=weight_g,
                    unit="g" if active_item.weight_g is not None else portion_unit,
                    note=note,
                    retail_section=ing.retail_section,
                    sort_order=sort_idx,
                )

            # Every generated entry keeps its recipe source so it is never treated as a manual entry.
            ShoppingListItemSource.objects.create(
                shopping_list_item=item,
                recipe=recipe,
                ingredient=ing,
                quantity_g=weight_g,
                recipe_name=recipe.title,
                recipe_slug=recipe.slug if hasattr(recipe, "slug") else "",
                meal_label="",
            )
            sort_idx += 1

        if payload.include_consumables:
            from supply.services.material_aggregation import aggregate_materials

            add_consumable_items(shopping_list, aggregate_materials([(recipe, portions)]), sort_idx)

    _attach_actor(shopping_list, Actor(role="owner", user=request.user))
    return shopping_list


@shopping_router.post("/from-meal-plan/{meal_plan_id}/", response=ShoppingListDetailOut)
def create_from_meal_plan(request, meal_plan_id: int, include_consumables: bool = True):
    """Create a persistent shopping list from a MealPlan."""
    require_login(request)

    from planner.models import MealPlan

    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    from planner.api.meal_plan import _require_access

    _require_access(meal_plan, request.user)

    from supply.services.shopping_service import generate_shopping_list

    transient_items = generate_shopping_list(meal_plan)

    from recipe.models import Recipe as RecipeModel
    from supply.models.ingredient import Ingredient

    with transaction.atomic():
        shopping_list = ShoppingList.objects.create(
            name=f"Einkaufsliste: {meal_plan.name}",
            owner=request.user,
            source_type=SourceType.MEAL_EVENT,
            source_id=meal_plan.id,
        )

        for sort_idx, ti in enumerate(transient_items):
            # Try to resolve ingredient and its retail section
            ingredient = None
            retail_section = None
            try:
                ingredient = Ingredient.objects.get(id=ti.ingredient_id)
                retail_section = ingredient.retail_section
            except Ingredient.DoesNotExist:
                pass

            item = ShoppingListItem.objects.create(
                shopping_list=shopping_list,
                ingredient=ingredient,
                name=ti.ingredient_name,
                quantity_g=ti.total_quantity_g,
                # quantity_g is grams; the display unit is derived from it on read.
                unit="g",
                note=ti.display_text if not ti.total_quantity_g and ti.display_text else "",
                retail_section=retail_section,
                sort_order=sort_idx,
            )

            # Persist sources
            if ti.sources:
                for source in ti.sources:
                    recipe_obj = RecipeModel.objects.filter(id=source.recipe_id).first() if source.recipe_id else None
                    meal_obj = meal_plan.meals.filter(id=source.meal_id).first() if source.meal_id else None
                    ingredient_obj = (
                        Ingredient.objects.filter(id=source.ingredient_id).first()
                        if source.ingredient_id
                        else ingredient
                    )
                    ShoppingListItemSource.objects.create(
                        shopping_list_item=item,
                        recipe=recipe_obj,
                        meal=meal_obj,
                        ingredient=ingredient_obj,
                        quantity_g=source.quantity_g,
                        recipe_name=source.recipe_name,
                        recipe_slug=source.recipe_slug,
                        meal_label=source.meal_label,
                    )

        if include_consumables:
            from supply.services.material_aggregation import aggregate_materials, meal_plan_material_entries

            add_consumable_items(
                shopping_list,
                aggregate_materials(meal_plan_material_entries(meal_plan)),
                len(transient_items),
            )

    _attach_actor(shopping_list, Actor(role="owner", user=request.user))
    from planner.services.quantity_plausibility import check_meals

    shopping_list.quantity_warnings = check_meals(meal_plan.meals.filter(is_reference=False))
    return shopping_list


# ---------------------------------------------------------------------------
# Kitchen Reminders
# ---------------------------------------------------------------------------

kitchen_reminder_router = Router(tags=["kitchen-reminders"])


@kitchen_reminder_router.get(
    "/",
    response=list[KitchenReminderCategoryOut],
)
def list_kitchen_reminders(request):
    """Return all published reminders + user's own unpublished suggestions, grouped by category."""
    categories = KitchenReminderCategory.objects.prefetch_related("reminders").all()

    user = request.user if request.user.is_authenticated else None

    result = []
    for cat in categories:
        reminders = []
        for r in cat.reminders.all():
            if r.is_published:
                reminders.append(
                    KitchenReminderOut(
                        id=r.id,
                        name=r.name,
                        is_published=True,
                        is_own_suggestion=False,
                    )
                )
            elif user and r.suggested_by_id == user.id:
                reminders.append(
                    KitchenReminderOut(
                        id=r.id,
                        name=r.name,
                        is_published=False,
                        is_own_suggestion=True,
                    )
                )
        if reminders:
            result.append(
                KitchenReminderCategoryOut(
                    id=cat.id,
                    name=cat.name,
                    sort_order=cat.sort_order,
                    reminders=reminders,
                )
            )

    # Also include uncategorized user suggestions
    if user:
        uncategorized = KitchenReminder.objects.filter(suggested_by=user, is_published=False, category__isnull=True)
        if uncategorized.exists():
            reminders = [
                KitchenReminderOut(
                    id=r.id,
                    name=r.name,
                    is_published=False,
                    is_own_suggestion=True,
                )
                for r in uncategorized
            ]
            result.append(
                KitchenReminderCategoryOut(
                    id=0,
                    name="Deine Vorschläge",
                    sort_order=999,
                    reminders=reminders,
                )
            )

    return result


@kitchen_reminder_router.post(
    "/suggest/",
    response=KitchenReminderOut,
)
def suggest_kitchen_reminder(request, payload: KitchenReminderSuggestIn):
    """Submit a new kitchen reminder suggestion."""
    require_login(request)

    reminder = KitchenReminder.objects.create(
        name=payload.name,
        is_published=False,
        suggested_by=request.user,
        category=None,
    )
    return KitchenReminderOut(
        id=reminder.id,
        name=reminder.name,
        is_published=False,
        is_own_suggestion=True,
    )
