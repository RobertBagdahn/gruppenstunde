"""API endpoints for the Shopping app."""

import math
from datetime import timedelta

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router
from ninja.errors import HttpError

from content.api.helpers import paginate_queryset

from .models import (
    CollaboratorRole,
    KitchenReminder,
    KitchenReminderCategory,
    ReweExportToken,
    ShoppingList,
    ShoppingListCollaborator,
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
    ShoppingListCollaboratorOut,
    ShoppingListCreateIn,
    ShoppingListDetailOut,
    ShoppingListItemCreateIn,
    ShoppingListItemOut,
    ShoppingListItemUpdateIn,
    ShoppingListOut,
    ShoppingListUpdateIn,
    UserSimpleOut,
)

shopping_router = Router(tags=["shopping-lists"])


# ---------------------------------------------------------------------------
# Auth & permission helpers
# ---------------------------------------------------------------------------


def _require_auth(request) -> None:
    if not request.user.is_authenticated:
        raise HttpError(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


def _get_user_role(shopping_list: ShoppingList, user) -> str | None:
    """Return the effective role of a user for a shopping list.

    Returns 'owner' for the list owner, or the collaborator role string,
    or None if the user has no access.
    """
    if shopping_list.owner_id == user.id:
        return "owner"
    try:
        collab = ShoppingListCollaborator.objects.get(shopping_list=shopping_list, user=user)
        return collab.role
    except ShoppingListCollaborator.DoesNotExist:
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
    """Require owner access."""
    if shopping_list.owner_id != user.id:
        raise HttpError(403, "Nur der Besitzer kann die Liste löschen")


# ---------------------------------------------------------------------------
# Shopping List CRUD (7.2 – 7.6)
# ---------------------------------------------------------------------------


@shopping_router.get("/", response=PaginatedShoppingListOut)
def list_shopping_lists(
    request,
    page: int = 1,
    page_size: int = 20,
    q: str = "",
):
    """List all shopping lists the user owns or collaborates on."""
    _require_auth(request)
    qs = (
        ShoppingList.objects.filter(Q(owner=request.user) | Q(collaborators__user=request.user))
        .select_related("owner")
        .annotate(
            items_count=Count("items", distinct=True),
            checked_count=Count("items", filter=Q(items__is_checked=True), distinct=True),
            collaborators_count=Count("collaborators", distinct=True),
        )
        .distinct()
    )
    if q:
        qs = qs.filter(name__icontains=q)
    result = paginate_queryset(qs, page, page_size)
    for item in result["items"]:
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
    _require_auth(request)
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
    page_size: int = Query(default=20, le=50),
):
    """Return users for collaborator invite dropdown (paginated, searchable)."""
    _require_auth(request)
    from django.contrib.auth import get_user_model

    User = get_user_model()
    qs = User.objects.order_by("username")
    if q:
        qs = qs.filter(username__icontains=q)

    total = qs.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    users = [
        UserSimpleOut(id=u["id"], username=u["username"])
        for u in qs.values("id", "username")[offset : offset + page_size]
    ]

    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


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
                ingredient_name=item.ingredient.name if item.ingredient else item.name,
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

    valid_item_ids = set(
        ShoppingListItem.objects.filter(shopping_list=shopping_list).values_list("id", flat=True)
    )

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


def _compute_order_quantity(item: ShoppingListItem) -> tuple[float, str]:
    """Compute the order quantity and display unit for REWE export.

    Uses the ingredient's purchasable portion to calculate how many
    packages are needed (rounding up), or falls back to raw grams.
    """
    from supply.utils import format_weight, get_shopping_portion

    quantity_g = item.quantity_g or 0
    if not quantity_g or quantity_g <= 0:
        return 0.0, item.unit or "g"

    if not item.ingredient:
        return quantity_g, item.unit or "g"

    portion = get_shopping_portion(item.ingredient)
    if portion and portion.weight_g and portion.weight_g > 0:
        count = math.ceil(quantity_g / portion.weight_g)
        label = portion.name or "Packung"
        return float(count), f"{label} ({format_weight(portion.weight_g)})"

    return quantity_g, "g"


@shopping_router.get("/{shopping_list_id}/", response=ShoppingListDetailOut)
def get_shopping_list(request, shopping_list_id: int):
    """Get shopping list detail with items and collaborators."""
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    role = _require_access(shopping_list, request.user)

    # Inject can_edit and is_owner for the response — these depend on the
    # request user, so we attach them as attributes.
    shopping_list._can_edit = role in (
        "owner",
        CollaboratorRole.ADMIN,
        CollaboratorRole.EDITOR,
    )
    shopping_list._is_owner = role == "owner"
    return shopping_list


@shopping_router.patch("/{shopping_list_id}/", response=ShoppingListOut)
def update_shopping_list(request, shopping_list_id: int, payload: ShoppingListUpdateIn):
    """Update shopping list name (owner/admin only)."""
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_admin(shopping_list, request.user)

    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(shopping_list, field, value)
    shopping_list.save()
    return shopping_list


@shopping_router.delete("/{shopping_list_id}/")
def delete_shopping_list(request, shopping_list_id: int):
    """Delete a shopping list (owner only)."""
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_owner(shopping_list, request.user)
    shopping_list.delete()
    return {"success": True, "message": "Einkaufsliste gelöscht"}


# ---------------------------------------------------------------------------
# Shopping List Views (summarized, by-recipe)
# ---------------------------------------------------------------------------


@shopping_router.get("/{shopping_list_id}/view/")
def get_shopping_list_view(request, shopping_list_id: int, view: str = "detailed"):
    """Get shopping list items in different view modes.

    Views:
    - detailed: default item list (same as detail endpoint)
    - summarized: group by ingredient, sum quantities
    - by_recipe: group by source recipe
    """
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_access(shopping_list, request.user)

    items = (
        shopping_list.items.select_related("ingredient", "retail_section")
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
                    "retail_section": item.retail_section.name if item.retail_section else "",
                    "is_checked": True,
                    "items_count": 0,
                }
            grouped[key]["total_quantity_g"] += float(item.quantity_g or 0)
            grouped[key]["items_count"] += 1
            if not item.is_checked:
                grouped[key]["is_checked"] = False

        return {"view": "summarized", "groups": list(grouped.values())}

    elif view == "by_recipe":
        # Group by source (note field or manual)
        by_source: dict[str, list] = {}
        for item in items:
            source = item.note or "Sonstiges"
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(
                {
                    "id": item.id,
                    "name": item.ingredient.name if item.ingredient else item.name,
                    "quantity_g": float(item.quantity_g or 0),
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
                    "retail_section": item.retail_section.name if item.retail_section else "",
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
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_edit(shopping_list, request.user)

    from supply.models.ingredient import Ingredient
    from supply.models.reference import RetailSection

    data = payload.dict(exclude={"ingredient_id", "retail_section_id"})

    # Resolve optional FKs
    ingredient = None
    if payload.ingredient_id:
        ingredient = Ingredient.objects.filter(id=payload.ingredient_id).first()

    retail_section = None
    if payload.retail_section_id:
        retail_section = RetailSection.objects.filter(id=payload.retail_section_id).first()

    item = ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        ingredient=ingredient,
        retail_section=retail_section,
        **data,
    )
    return item


@shopping_router.patch("/{shopping_list_id}/items/{item_id}/", response=ShoppingListItemOut)
def update_item(
    request,
    shopping_list_id: int,
    item_id: int,
    payload: ShoppingListItemUpdateIn,
):
    """Update or check/uncheck a shopping list item."""
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_edit(shopping_list, request.user)
    item = get_object_or_404(ShoppingListItem, id=item_id, shopping_list=shopping_list)

    data = payload.dict(exclude_unset=True)

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
            item.is_checked = True
            item.checked_by = request.user
            item.checked_at = timezone.now()
        else:
            item.is_checked = False
            item.checked_by = None
            item.checked_at = None
        data.pop("is_checked")

    for field, value in data.items():
        setattr(item, field, value)

    item.save()
    return item


@shopping_router.delete("/{shopping_list_id}/items/{item_id}/")
def delete_item(request, shopping_list_id: int, item_id: int):
    """Remove an item from a shopping list."""
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_edit(shopping_list, request.user)
    item = get_object_or_404(ShoppingListItem, id=item_id, shopping_list=shopping_list)
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
    _require_auth(request)
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
    _require_auth(request)
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
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    _require_admin(shopping_list, request.user)

    collab = get_object_or_404(ShoppingListCollaborator, id=collab_id, shopping_list=shopping_list)
    collab.delete()
    return {"success": True, "message": "Mitglied entfernt"}


# ---------------------------------------------------------------------------
# REWE Export — token generation (parameterized route)
# ---------------------------------------------------------------------------


@shopping_router.post("/{shopping_list_id}/rewe-export-token/", response=ReweExportTokenResponse)
def create_rewe_export_token(request, shopping_list_id: int):
    """Generate a short-lived token for REWE basket export."""
    _require_auth(request)
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
    _require_auth(request)

    from recipe.models import Recipe

    recipe = get_object_or_404(Recipe, id=recipe_id)
    portions = payload.portions

    shopping_list = ShoppingList.objects.create(
        name=f"Einkaufsliste: {recipe.title}",
        owner=request.user,
        source_type=SourceType.RECIPE,
        source_id=recipe.id,
    )

    recipe_items = recipe.recipe_items.select_related(
        "portion__ingredient__retail_section",
    )

    for sort_idx, ri in enumerate(recipe_items):
        if not ri.portion or not ri.portion.ingredient:
            # Free-text items without linked ingredient
            ShoppingListItem.objects.create(
                shopping_list=shopping_list,
                name=ri.note or "Unbekannte Zutat",
                quantity_g=0,
                sort_order=sort_idx,
            )
            continue

        ing = ri.portion.ingredient
        recipe_servings = getattr(recipe, "portions", 1) or 1
        weight_g = ri.quantity * (ri.portion.weight_g or 0) * portions / recipe_servings

        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            ingredient=ing,
            name=ing.name,
            quantity_g=weight_g,
            unit="g",
            retail_section=ing.retail_section,
            sort_order=sort_idx,
        )

        # Create single source for this recipe
        ShoppingListItemSource.objects.create(
            shopping_list_item=item,
            recipe=recipe,
            quantity_g=weight_g,
            recipe_name=recipe.title,
            recipe_slug=recipe.slug if hasattr(recipe, "slug") else "",
            meal_label="",
        )

    # Attach can_edit and is_owner for the response
    shopping_list._can_edit = True
    shopping_list._is_owner = True
    return shopping_list


@shopping_router.post("/from-meal-plan/{meal_plan_id}/", response=ShoppingListDetailOut)
def create_from_meal_plan(request, meal_plan_id: int):
    """Create a persistent shopping list from a MealPlan."""
    _require_auth(request)

    from planner.models import MealPlan

    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)

    from supply.services.shopping_service import generate_shopping_list

    transient_items = generate_shopping_list(meal_plan)

    shopping_list = ShoppingList.objects.create(
        name=f"Einkaufsliste: {meal_plan.name}",
        owner=request.user,
        source_type=SourceType.MEAL_EVENT,
        source_id=meal_plan.id,
    )

    from recipe.models import Recipe as RecipeModel
    from supply.models.ingredient import Ingredient

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
            unit=ti.unit,
            retail_section=retail_section,
            sort_order=sort_idx,
        )

        # Persist sources
        if ti.sources:
            for source in ti.sources:
                recipe_obj = RecipeModel.objects.filter(id=source.recipe_id).first()
                ShoppingListItemSource.objects.create(
                    shopping_list_item=item,
                    recipe=recipe_obj,
                    quantity_g=source.quantity_g,
                    recipe_name=source.recipe_name,
                    recipe_slug=source.recipe_slug,
                    meal_label=source.meal_label,
                )

    # Attach can_edit and is_owner for the response
    shopping_list._can_edit = True
    shopping_list._is_owner = True
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
    _require_auth(request)

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
