"""API endpoints for the Shopping app."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from content.api.helpers import paginate_queryset

from .models import (
    CollaboratorRole,
    ShoppingList,
    ShoppingListCollaborator,
    ShoppingListItem,
    SourceType,
)
from .schemas import (
    CollaboratorCreateIn,
    CollaboratorUpdateIn,
    FromRecipeIn,
    PaginatedShoppingListOut,
    ShoppingListCollaboratorOut,
    ShoppingListCreateIn,
    ShoppingListDetailOut,
    ShoppingListItemCreateIn,
    ShoppingListItemOut,
    ShoppingListItemUpdateIn,
    ShoppingListOut,
    ShoppingListUpdateIn,
)

shopping_router = Router(tags=["shopping-lists"])


# ---------------------------------------------------------------------------
# Auth & permission helpers
# ---------------------------------------------------------------------------


def _require_auth(request) -> None:
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


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
        raise HttpError(403, "Nur Admins und Besitzer koennen das aendern")
    return role


def _require_owner(shopping_list: ShoppingList, user) -> None:
    """Require owner access."""
    if shopping_list.owner_id != user.id:
        raise HttpError(403, "Nur der Besitzer kann die Liste loeschen")


# ---------------------------------------------------------------------------
# Shopping List CRUD (7.2 – 7.6)
# ---------------------------------------------------------------------------


@shopping_router.get("/", response=PaginatedShoppingListOut)
def list_shopping_lists(
    request,
    page: int = 1,
    page_size: int = 20,
):
    """List all shopping lists the user owns or collaborates on."""
    _require_auth(request)
    qs = (
        ShoppingList.objects.filter(Q(owner=request.user) | Q(collaborators__user=request.user))
        .select_related("owner")
        .distinct()
    )
    return paginate_queryset(qs, page, page_size)


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


@shopping_router.get("/{shopping_list_id}/", response=ShoppingListDetailOut)
def get_shopping_list(request, shopping_list_id: int):
    """Get shopping list detail with items and collaborators."""
    _require_auth(request)
    shopping_list = get_object_or_404(ShoppingList, id=shopping_list_id)
    role = _require_access(shopping_list, request.user)

    # Inject can_edit for the response — the schema doesn't have a resolver
    # because it depends on the request user. We attach it as an attribute.
    shopping_list._can_edit = role in (
        "owner",
        CollaboratorRole.ADMIN,
        CollaboratorRole.EDITOR,
    )
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
    return {"success": True, "message": "Einkaufsliste geloescht"}


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
    return {"success": True, "message": "Eintrag geloescht"}


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
        raise HttpError(400, "Der Besitzer kann nicht als Mitglied hinzugefuegt werden")

    if ShoppingListCollaborator.objects.filter(shopping_list=shopping_list, user=user).exists():
        raise HttpError(400, "Nutzer ist bereits Mitglied")

    # Validate role
    valid_roles = [r.value for r in CollaboratorRole]
    if payload.role not in valid_roles:
        raise HttpError(400, f"Ungueltige Rolle: {payload.role}")

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
        raise HttpError(400, f"Ungueltige Rolle: {payload.role}")

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
# Export from Recipe / MealEvent (7.13 – 7.14)
# ---------------------------------------------------------------------------


@shopping_router.post("/from-recipe/{recipe_id}/", response=ShoppingListDetailOut)
def create_from_recipe(request, recipe_id: int, payload: FromRecipeIn):
    """Create a shopping list from a recipe's ingredients."""
    _require_auth(request)

    from recipe.models import Recipe

    recipe = get_object_or_404(Recipe, id=recipe_id)
    servings = payload.servings

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
        weight_g = ri.quantity * (ri.portion.weight_g or 0) * servings

        ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            ingredient=ing,
            name=ing.name,
            quantity_g=weight_g,
            unit="g",
            retail_section=ing.retail_section,
            sort_order=sort_idx,
        )

    # Attach can_edit for the response
    shopping_list._can_edit = True
    return shopping_list


@shopping_router.post("/from-meal-event/{meal_event_id}/", response=ShoppingListDetailOut)
def create_from_meal_event(request, meal_event_id: int):
    """Create a persistent shopping list from a MealEvent."""
    _require_auth(request)

    from planner.models import MealEvent

    meal_event = get_object_or_404(MealEvent, id=meal_event_id)

    from supply.services.shopping_service import generate_shopping_list

    transient_items = generate_shopping_list(meal_event)

    shopping_list = ShoppingList.objects.create(
        name=f"Einkaufsliste: {meal_event.name}",
        owner=request.user,
        source_type=SourceType.MEAL_EVENT,
        source_id=meal_event.id,
    )

    from supply.models.ingredient import Ingredient
    from supply.models.reference import RetailSection

    for sort_idx, ti in enumerate(transient_items):
        # Try to resolve ingredient and its retail section
        ingredient = None
        retail_section = None
        try:
            ingredient = Ingredient.objects.get(id=ti.ingredient_id)
            retail_section = ingredient.retail_section
        except Ingredient.DoesNotExist:
            pass

        ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            ingredient=ingredient,
            name=ti.ingredient_name,
            quantity_g=ti.total_quantity_g,
            unit=ti.unit,
            retail_section=retail_section,
            sort_order=sort_idx,
        )

    # Attach can_edit for the response
    shopping_list._can_edit = True
    return shopping_list
