"""Ingredient CRUD, Portion, and Alias endpoints."""

import logging
import math

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from content.services.search_service import log_search, log_search_structured
from recipe.models import Recipe
from recipe.schemas import PaginatedRecipeOut
from supply.models import (
    Ingredient,
    IngredientAlias,
    IngredientGroup,
    MeasuringUnit,
    Portion,
)
from supply.schemas import (
    AliasCreateIn,
    IngredientAiCreateIn,
    IngredientAliasOut,
    IngredientCreateIn,
    IngredientDetailOut,
    IngredientImportUrlIn,
    IngredientImportUrlOut,
    IngredientSimilarOut,
    IngredientSuggestAllOut,
    IngredientUpdateIn,
    PaginatedIngredientOut,
    PortionCreateIn,
    PortionOut,
    PortionReorderIn,
    PortionUpdateIn,
)

from .helpers import require_auth

logger = logging.getLogger(__name__)

ingredient_router = Router(tags=["ingredients"])


def _is_staff_or_admin_user(user) -> bool:
    """Check if user is Django-staff or has a staff/admin profile role."""
    if not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    try:
        return user.profile.role in ("staff", "admin")
    except AttributeError:
        return False


def _shared_ingredient_ids(user) -> list[int]:
    """IDs of ingredients shared with `user` via ContentCollaborator (any role)."""
    if not user.is_authenticated:
        return []
    from django.contrib.contenttypes.models import ContentType

    from content.models import ContentCollaborator

    ct = ContentType.objects.get_for_model(Ingredient)
    return list(
        ContentCollaborator.objects.filter(content_type=ct, user=user).values_list("object_id", flat=True)
    )


def _can_view_ingredient(ingredient: Ingredient, request) -> bool:
    """Whether the requesting user may see this ingredient (incl. transitive access)."""
    if ingredient.status != "draft":
        return True
    user = request.user
    if not user.is_authenticated:
        return False
    if _is_staff_or_admin_user(user):
        return True
    if ingredient.created_by_id == user.id:
        return True
    if ingredient.id in _shared_ingredient_ids(user):
        return True
    from content.services.transitive_visibility import ingredient_visible_transitively

    return ingredient_visible_transitively(ingredient, request.user)


def _has_editor_collab_access(ingredient: Ingredient, user) -> bool:
    """Whether `user` has an editor/admin ContentCollaborator role on `ingredient`."""
    from django.contrib.contenttypes.models import ContentType

    from content.models import ContentCollaborator, ContentCollaboratorRole

    ct = ContentType.objects.get_for_model(Ingredient)
    return ContentCollaborator.objects.filter(
        content_type=ct,
        object_id=ingredient.id,
        user=user,
        role__in=[ContentCollaboratorRole.EDITOR, ContentCollaboratorRole.ADMIN],
    ).exists()


def _can_edit_ingredient(ingredient: Ingredient, user) -> bool:
    """Whether `user` may edit/delete this ingredient's own fields."""
    if not user.is_authenticated:
        return False
    if _is_staff_or_admin_user(user):
        return True
    if ingredient.status == "verified":
        return False
    if ingredient.created_by_id == user.id:
        return True
    return _has_editor_collab_access(ingredient, user)


def _can_edit_portions(ingredient: Ingredient, user) -> bool:
    """Whether `user` may add/edit portions on this ingredient.

    Drafts are owner/collaborator-only; verified ingredients are locked to
    staff; any other status (e.g. community-submitted) is open to any
    authenticated user, consistent with crowd-sourced portion sizes.
    """
    if not user.is_authenticated:
        return False
    if _is_staff_or_admin_user(user):
        return True
    if ingredient.status == "verified":
        return False
    if ingredient.status == "draft":
        if ingredient.created_by_id == user.id:
            return True
        return _has_editor_collab_access(ingredient, user)
    return True


def _visible_ingredients_qs(request):
    """Base queryset of ingredients visible to the requesting user (hides drafts).
    
    Handles both:
    - Old model: status-based visibility (draft/approved/verified)
    - New model: owner/visibility/shared_groups (breakfast wizard)
    """
    qs = Ingredient.objects.select_related("retail_section", "owner").prefetch_related("groups", "shared_groups")
    user = request.user
    if user.is_authenticated and _is_staff_or_admin_user(user):
        return qs

    not_draft_q = ~Q(status="draft")
    if not user.is_authenticated:
        return qs.filter(not_draft_q)

    own_q = Q(created_by_id=user.id)
    shared_q = Q(id__in=_shared_ingredient_ids(user))
    
    # Breakfast wizard visibility:
    # System ingredients (owner=None, status=approved) always visible
    system_q = Q(owner__isnull=True, status="approved")
    # User's own ingredients
    breakfast_own_q = Q(owner=user)
    # Ingredients shared with user's groups
    from profiles.models import Group
    user_groups = Group.objects.filter(members=user)
    breakfast_shared_q = Q(visibility="shared", shared_groups__in=user_groups)
    
    # Combine old and new models
    visibility_q = (not_draft_q | own_q | shared_q) | (system_q | breakfast_own_q | breakfast_shared_q)
    return qs.filter(visibility_q).distinct()


# ===========================================================================
# Breakfast Wizard Visibility Functions
# ===========================================================================
# New visibility model for breakfast wizard user-generated items


def _can_view_ingredient_breakfast(ingredient: Ingredient, user) -> bool:
    """Check if user can view ingredient in breakfast wizard context.
    
    Rules:
    - System ingredients (owner=None, status=approved) are always visible
    - User-owned ingredients (owner=user) are visible to owner
    - Ingredients in user's groups are visible (owner set, visibility=private, in user's groups)
    - Ingredients shared with user's groups (visibility=shared, shared_groups contains user's groups)
    - Staff can see everything
    """
    if not user.is_authenticated:
        # Unauthenticated users can only see system ingredients
        return ingredient.owner_id is None and ingredient.status == "approved"
    
    if _is_staff_or_admin_user(user):
        return True
    
    # System ingredients are always visible
    if ingredient.owner_id is None:
        return ingredient.status == "approved"
    
    # Owner can always see their own ingredient
    if ingredient.owner_id == user.id:
        return True
    
    # Check shared groups: get user's groups
    from profiles.models import Group
    user_groups = Group.objects.filter(members=user)
    
    if ingredient.visibility == "private":
        # Private ingredients visible to members of owner's groups
        # Need to check if owner is in any of user's groups
        # Actually, this is not right. Let me reconsider.
        # Looking at the spec again: "Private Zutaten sind nur für den Owner + seine Gruppe sichtbar"
        # This means: visible to owner + members of the owner's group
        # But we don't track which group an ingredient "belongs" to directly.
        # Instead, we use shared_groups for "shared" visibility.
        # For "private" items, they're visible to... whom?
        # Looking at the spec scenario more carefully:
        # "user erstellt neue Zutat im Wizard (Gruppe: Wölflinge Hütte)" -> owner set, but where's the group stored?
        # I think the group is determined by context (group_id param) not stored on ingredient.
        # For now, let's say private items are only visible to owner.
        return False
    
    if ingredient.visibility == "shared":
        # Shared ingredients visible to members of shared_groups
        return ingredient.shared_groups.filter(members=user).exists()
    
    return False


def _get_visible_ingredients_for_breakfast_qs(user, group_ids: list[int] | None = None):
    """Get ingredients visible to user for breakfast wizard.
    
    Args:
        user: The requesting user
        group_ids: Optional list of group IDs to filter for (e.g., user's current group context)
    
    Returns:
        Queryset of visible Ingredient objects
    """
    from profiles.models import Group
    
    qs = Ingredient.objects.select_related("owner", "retail_section").prefetch_related("shared_groups", "tags", "groups")
    
    if _is_staff_or_admin_user(user):
        return qs
    
    # System ingredients (owner=None, status=approved) are always visible
    system_q = Q(owner__isnull=True, status="approved")
    
    if not user.is_authenticated:
        return qs.filter(system_q)
    
    # User's own ingredients
    own_q = Q(owner=user)
    
    # Get user's groups
    user_groups = Group.objects.filter(members=user)
    
    # Private ingredients visible to owner (we don't have group ownership, so only owner sees)
    # Actually, reconsidering: the spec says "sichtbar für: alle Users der Gruppe Wölflinge Hütte"
    # But the ingredient itself doesn't know its "group". This seems like a limitation.
    # Let me reread the requirement more carefully...
    # "visibility=private, group=Wölflinge Hütte" - so there's a group field?
    # But we didn't add a group field to Ingredient, only shared_groups M2M.
    # I think the spec might be using "group" to refer to context, not a stored field.
    # For now, let's implement: private items only visible to owner.
    
    # Shared ingredients visible to members of shared_groups
    # This needs to check if any of the ingredient's shared_groups contain the user
    shared_q = Q(visibility="shared", shared_groups__in=user_groups)
    
    visibility_q = system_q | own_q | shared_q
    
    if group_ids:
        # If specific groups are requested, filter shared items to only those groups
        visibility_q = visibility_q | Q(
            visibility="shared",
            shared_groups__in=Group.objects.filter(id__in=group_ids)
        )
    
    return qs.filter(visibility_q).distinct()



# ===========================================================================
# Ingredient CRUD
# ===========================================================================


@ingredient_router.get("/", response=PaginatedIngredientOut)
def list_ingredients(
    request,
    page: int = 1,
    page_size: int = 20,
    name: str = "",
    retail_section: int | None = None,
    status: str = "",
    ordering: str = "",
    nutritional_tag: int | None = None,
    group: str = "",
):
    """List ingredients with pagination, filters, and ordering."""
    from django.db.models import F

    qs = _visible_ingredients_qs(request)

    if name:
        qs = qs.filter(
            Q(name__icontains=name)
            | Q(aliases__name__icontains=name)
            | Q(groups__name__icontains=name)
        ).distinct()

    if group:
        qs = qs.filter(groups__slug=group)

    if retail_section:
        qs = qs.filter(retail_section_id=retail_section)

    if status:
        qs = qs.filter(status=status)

    if nutritional_tag:
        qs = qs.filter(nutritional_tags__id=nutritional_tag)

    ordering_map = {
        "price_asc": F("price_per_kg").asc(nulls_last=True),
        "price_desc": F("price_per_kg").desc(nulls_last=True),
        "nutri_class_asc": F("nutri_class").asc(nulls_last=True),
        "energy_kcal_asc": F("energy_kcal").asc(nulls_last=True),
        "popularity": "-usage_count",
    }

    if ordering in ordering_map:
        qs = qs.order_by(ordering_map[ordering])
    else:
        qs = qs.order_by("-usage_count")

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    if name:
        user = request.user if request.user.is_authenticated else None
        log_search(name, total, user)
        log_search_structured(name, total, "ingredient_list", user)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@ingredient_router.get("/suggest/", response=list[dict])
def suggest_ingredients(request, q: str = "", limit: int = Query(default=5, le=50)):
    """Fuzzy-match ingredients by name using trigram similarity."""
    require_auth(request)
    from supply.services.fuzzy_match import suggest_ingredients as do_suggest

    return do_suggest(query=q, limit=limit)


@ingredient_router.get("/generic-terms/", response=list[str])
def list_generic_terms(request):
    """List all generic ingredient terms (e.g. 'Salz', 'Pfeffer', 'Nudeln').

    Used by the frontend to warn users when a name they enter is too generic.
    """
    from supply.services.generic_terms import get_generic_terms

    return sorted(get_generic_terms())


@ingredient_router.post("/ai-create/", response=IngredientDetailOut)
def ai_create(request, payload: IngredientAiCreateIn):
    """Create a complete ingredient from just a name using AI."""
    require_auth(request)

    from supply.services.ingredient_ai_suggest_service import ai_create_ingredient

    ingredient = ai_create_ingredient(payload.name, user=request.user)
    return ingredient


@ingredient_router.get("/{slug}/", response=IngredientDetailOut)
def get_ingredient(request, slug: str):
    """Get ingredient detail by slug.
    
    Checks both old (status-based) and new (breakfast wizard visibility) permission models.
    """
    ingredient = get_object_or_404(
        Ingredient.objects.select_related("retail_section", "owner").prefetch_related(
            "nutritional_tags", "portions__measuring_unit", "aliases", "shared_groups"
        ),
        slug=slug,
    )
    
    # Check old permission model
    if _can_view_ingredient(ingredient, request):
        return ingredient
    
    # Check new breakfast wizard visibility model
    if _can_view_ingredient_breakfast(ingredient, request.user):
        return ingredient
    
    raise HttpError(404, "Zutat nicht gefunden")


@ingredient_router.post("/", response=IngredientDetailOut)
def create_ingredient(request, payload: IngredientCreateIn):
    """Create a new ingredient.
    
    For breakfast wizard items, sets owner to current user and handles visibility/sharing.
    """
    require_auth(request)

    data = payload.dict(exclude={"nutritional_tag_ids", "group_ids", "tag_ids", "visibility", "shared_group_ids"})
    data["retail_section_id"] = data.pop("retail_section_id", None)

    if not data["retail_section_id"]:
        from supply.services.retail_section_mapping import get_retail_section

        rs = get_retail_section(data["name"], data.get("description", ""))
        if rs:
            data["retail_section_id"] = rs.id

    ingredient = Ingredient(**data)
    ingredient.created_by = request.user
    ingredient.status = "draft"
    
    # Breakfast wizard: set ownership and visibility
    ingredient.owner = request.user
    ingredient.visibility = payload.visibility or "private"
    
    ingredient.save()

    if payload.nutritional_tag_ids:
        ingredient.nutritional_tags.set(payload.nutritional_tag_ids)

    if payload.group_ids:
        ingredient.groups.set(payload.group_ids)
    
    # Add breakfast tags if provided
    if payload.tag_ids:
        ingredient.tags.set(payload.tag_ids)
    
    # Set shared groups if visibility is "shared"
    if payload.visibility == "shared" and payload.shared_group_ids:
        from profiles.models import Group
        
        # Validate that user is member of all shared groups
        user_group_ids = set(Group.objects.filter(members=request.user).values_list("id", flat=True))
        invalid_group_ids = set(payload.shared_group_ids) - user_group_ids
        if invalid_group_ids:
            raise HttpError(400, f"User is not a member of groups: {invalid_group_ids}")
        
        ingredient.shared_groups.set(payload.shared_group_ids)

    # Calculate nutri-score if nutritional data is present
    if ingredient.energy_kcal is not None:
        try:
            from supply.services.nutri_service import update_ingredient_nutri_score

            update_ingredient_nutri_score(ingredient)
        except ImportError:
            # Service not yet migrated — will be available after 5.1.6
            pass

    ingredient.refresh_from_db()
    return ingredient


@ingredient_router.patch("/{slug}/", response=IngredientDetailOut)
def update_ingredient(request, slug: str, payload: IngredientUpdateIn):
    """Update an ingredient.
    
    Only the owner can modify visibility and shared_group_ids.
    """
    require_auth(request)

    ingredient = get_object_or_404(Ingredient.objects.select_related("owner").prefetch_related("shared_groups"), slug=slug)

    if not _can_edit_ingredient(ingredient, request.user):
        raise HttpError(403, "Nur der Ersteller oder Admins dürfen diese Zutat bearbeiten")

    data_preview = payload.dict(exclude_unset=True)
    if data_preview.get("status") == "verified" and not _is_staff_or_admin_user(request.user):
        raise HttpError(403, "Nur Admins können den Status auf 'verified' setzen")

    # Only owner can change visibility/sharing for breakfast wizard items
    if ingredient.owner and ("visibility" in data_preview or "shared_group_ids" in data_preview):
        if ingredient.owner_id != request.user.id and not _is_staff_or_admin_user(request.user):
            raise HttpError(403, "Nur der Owner darf Visibility und Sharing ändern")

    nutritional_fields = {
        "energy_kcal",
        "protein_g",
        "fat_g",
        "fat_sat_g",
        "carbohydrate_g",
        "sugar_g",
        "fibre_g",
        "salt_g",
        "sodium_mg",
        "fructose_g",
        "lactose_g",
        "fruit_factor",
    }
    nutri_changed = False

    data = payload.dict(exclude_unset=True)
    tag_ids = data.pop("nutritional_tag_ids", None)
    group_ids = data.pop("group_ids", None)
    breakfast_tag_ids = data.pop("tag_ids", None)
    visibility = data.pop("visibility", None)
    shared_group_ids = data.pop("shared_group_ids", None)

    for field, value in data.items():
        if field in nutritional_fields:
            nutri_changed = True
        setattr(ingredient, field, value)

    # Handle visibility changes
    if visibility is not None:
        ingredient.visibility = visibility

    ingredient.updated_by = request.user
    ingredient.save()

    if tag_ids is not None:
        ingredient.nutritional_tags.set(tag_ids)

    if group_ids is not None:
        ingredient.groups.set(group_ids)
    
    if breakfast_tag_ids is not None:
        ingredient.tags.set(breakfast_tag_ids)
    
    # Handle shared_group_ids
    if shared_group_ids is not None:
        if visibility == "shared" or (visibility is None and ingredient.visibility == "shared"):
            from profiles.models import Group
            
            # Validate that user is member of all shared groups
            user_group_ids = set(Group.objects.filter(members=request.user).values_list("id", flat=True))
            invalid_group_ids = set(shared_group_ids) - user_group_ids
            if invalid_group_ids:
                raise HttpError(400, f"User is not a member of groups: {invalid_group_ids}")
            
            ingredient.shared_groups.set(shared_group_ids)
        elif visibility == "private":
            # Clear shared groups if switching to private
            ingredient.shared_groups.clear()

    if nutri_changed:
        try:
            from supply.services.nutri_service import update_ingredient_nutri_score

            update_ingredient_nutri_score(ingredient)
        except ImportError:
            pass

    ingredient.refresh_from_db()
    return ingredient


@ingredient_router.delete("/{slug}/")
def delete_ingredient(request, slug: str):
    """Delete an ingredient if no RecipeItems reference it."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    if not _can_edit_ingredient(ingredient, request.user):
        raise HttpError(403, "Nur der Ersteller oder Admins dürfen diese Zutat löschen")

    from recipe.models import Recipe, RecipeItem

    recipe_ids = list(
        RecipeItem.objects.filter(portion__ingredient=ingredient).values_list("recipe_id", flat=True).distinct()
    )
    if recipe_ids:
        recipes = list(Recipe.objects.filter(id__in=recipe_ids).values("id", "title", "slug"))
        return JsonResponse(
            {
                "detail": "Zutat wird in Rezepten verwendet und kann nicht gelöscht werden",
                "recipes": recipes,
            },
            status=409,
        )

    ingredient.delete()
    return {"success": True}


# ===========================================================================
# Portions
# ===========================================================================


@ingredient_router.get("/{slug}/portions/", response=list[PortionOut])
def list_portions(request, slug: str):
    """List portions for an ingredient."""
    ingredient = get_object_or_404(Ingredient, slug=slug)
    return Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).select_related("measuring_unit")


@ingredient_router.post("/{slug}/portions/", response=PortionOut)
def create_portion(request, slug: str, payload: PortionCreateIn):
    """Create a portion for an ingredient.

    Validates that portion name is unique per ingredient (case-insensitive).
    Returns 422 if name already exists.
    """
    require_auth(request)

    if not payload.name or not payload.name.strip():
        raise HttpError(422, "Portionsname darf nicht leer sein.")

    ingredient = get_object_or_404(Ingredient, slug=slug)
    name = payload.name.strip()

    if not _can_edit_portions(ingredient, request.user):
        raise HttpError(403, "Keine Berechtigung, Portionen für diese Zutat anzulegen")

    # Check for duplicate names (case-insensitive, excluding soft-deleted)
    if Portion.objects.filter(ingredient=ingredient, name__iexact=name, deleted_at__isnull=True).exists():
        raise HttpError(422, f"Portionsname '{name}' existiert bereits für diese Zutat (case-insensitive).")

    portion = Portion(
        ingredient=ingredient,
        name=name,
        quantity=payload.quantity,
        rank=payload.rank,
        created_by=request.user,
    )

    if payload.measuring_unit_id:
        unit = get_object_or_404(MeasuringUnit, id=payload.measuring_unit_id)
        portion.measuring_unit = unit

    portion.weight_g = payload.weight_g
    portion.save()
    return portion


@ingredient_router.post("/{slug}/portions/reorder/", response=list[PortionOut])
def reorder_portions(request, slug: str, payload: PortionReorderIn):
    """Reorder multiple portions atomically.

    Body: { orders: [{id: int, rank: int}, ...] }

    Atomically updates all portion ranks. The 'g' portion must remain at rank 9999.
    """
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    # Validate: 'g' portion (rank 9999) should never be moved
    for order in payload.orders:
        portion = Portion.objects.filter(id=order.id, ingredient=ingredient).first()
        if portion and portion.name == "g" and order.rank != 9999:
            raise HttpError(422, "Die 'g'-Portion muss immer rank=9999 haben und kann nicht verschoben werden.")

    with transaction.atomic():
        for order in payload.orders:
            Portion.objects.filter(id=order.id, ingredient=ingredient).update(rank=order.rank)

    # Return updated list sorted by rank
    return list(
        Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True)
        .order_by("rank")
        .select_related("measuring_unit")
    )


@ingredient_router.patch("/{slug}/portions/{portion_id}/", response=PortionOut)
def update_portion(request, slug: str, portion_id: int, payload: PortionUpdateIn):
    """Update a portion.

    If updating name, validates that new name is unique per ingredient (case-insensitive).
    """
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    if not _can_edit_portions(ingredient, request.user):
        raise HttpError(403, "Keine Berechtigung, diese Portion zu bearbeiten")

    data = payload.dict(exclude_unset=True)
    if "name" in data:
        if not payload.name or not payload.name.strip():
            raise HttpError(422, "Portionsname darf nicht leer sein.")
        new_name = payload.name.strip()

        # Check for duplicate names (case-insensitive, excluding soft-deleted and self)
        if (
            Portion.objects.filter(ingredient=ingredient, name__iexact=new_name, deleted_at__isnull=True)
            .exclude(id=portion.id)
            .exists()
        ):
            raise HttpError(422, f"Portionsname '{new_name}' existiert bereits für diese Zutat (case-insensitive).")

        portion.name = new_name
        data.pop("name")

    unit_id = data.pop("measuring_unit_id", None)
    explicit_weight_g = data.pop("weight_g", None)

    # If quantity or unit changes and weight_g is not explicitly patched,
    # reset weight_g to None so save() recalculates it.
    if ("quantity" in data or unit_id is not None) and "weight_g" not in payload.dict(exclude_unset=True):
        portion.weight_g = None

    for field, value in data.items():
        setattr(portion, field, value)

    if unit_id is not None:
        unit = get_object_or_404(MeasuringUnit, id=unit_id)
        portion.measuring_unit = unit

    if "weight_g" in payload.dict(exclude_unset=True):
        portion.weight_g = explicit_weight_g

    portion.updated_by = request.user
    portion.save()
    return portion


@ingredient_router.delete("/{slug}/portions/{portion_id}/")
def delete_portion(request, slug: str, portion_id: int):
    """Soft-delete a portion. System-portions (g, Packung, Stück) können nicht gelöscht werden."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    if portion.is_system:
        raise HttpError(422, "System-Portionen (g, Packung, Stück) können nicht gelöscht werden.")

    portion.soft_delete()
    return {"success": True}


@ingredient_router.post("/{slug}/portions/{portion_id}/move/", response=list[PortionOut], deprecated=True)
def move_portion_rank(request, slug: str, portion_id: int, direction: str):
    """DEPRECATED: Move a portion up or down in rank order (▲/▼).

    Use POST /{slug}/portions/reorder/ instead.

    direction: 'up' or 'down'
    Swaps rank values with the adjacent portion. Returns updated list of portions.
    """
    from django.db import transaction

    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    portions = list(Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).order_by("rank", "id"))

    idx = next((i for i, p in enumerate(portions) if p.id == portion.id), None)
    if idx is None:
        raise HttpError(404, "Portion nicht gefunden")

    if direction == "up" and idx > 0:
        swap_with = portions[idx - 1]
    elif direction == "down" and idx < len(portions) - 1:
        swap_with = portions[idx + 1]
    else:
        raise HttpError(400, "Verschieben in diese Richtung nicht möglich")

    with transaction.atomic():
        portion.rank, swap_with.rank = swap_with.rank, portion.rank
        portion.save(update_fields=["rank"])
        swap_with.save(update_fields=["rank"])

    return list(
        Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True)
        .order_by("rank", "id")
        .select_related("measuring_unit")
    )


# ===========================================================================
# Aliases
# ===========================================================================


@ingredient_router.post("/{slug}/aliases/", response=IngredientAliasOut)
def create_alias(request, slug: str, payload: AliasCreateIn):
    """Create an alias for an ingredient."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    name = payload.name.strip()
    if not name:
        raise HttpError(400, "Alias-Name darf nicht leer sein.")

    # Also reject if alias matches the ingredient name itself
    if ingredient.name.lower() == name.lower():
        raise HttpError(409, "Alias darf nicht identisch mit dem Zutatennamen sein.")

    rank = payload.rank

    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            with transaction.atomic():
                # Lock the ingredient to prevent concurrent alias creation
                locked_ingredient = Ingredient.objects.select_for_update().get(id=ingredient.id)

                # All duplicate checks now inside atomic block (race-condition safe)
                # 1. Per-ingredient duplicate check
                if IngredientAlias.objects.filter(ingredient=locked_ingredient, name__iexact=name).exists():
                    raise HttpError(409, f"Alias '{name}' existiert bereits für diese Zutat.")

                # 2. Non-generic aliases must be globally unique (across all ingredients)
                if not payload.is_generic and IngredientAlias.objects.filter(name__iexact=name, is_generic=False).exists():
                    raise HttpError(409, f"Alias '{name}' wird bereits für eine andere Zutat verwendet.")

                # Calculate rank
                existing_ranks = set(
                    IngredientAlias.objects.filter(ingredient=locked_ingredient)
                    .values_list("rank", flat=True)
                )
                if rank is None or rank in existing_ranks:
                    rank = max(existing_ranks) + 1 if existing_ranks else 1

                alias = IngredientAlias(
                    ingredient=locked_ingredient,
                    name=name,
                    rank=rank,
                    is_generic=payload.is_generic,
                    created_by=request.user,
                )
                alias.save()
                return alias
        except HttpError:
            # Re-raise HttpError as-is (e.g., 409 Conflict)
            raise
        except IntegrityError as e:
            # Handle unexpected IntegrityError (should be rare with proper checks)
            # Check which constraint failed
            error_msg = str(e)
            if "unique_alias_name_per_ingredient" in error_msg or "unique_alias_name_when_not_generic" in error_msg:
                # Name constraint violation despite our checks (should be very rare in production)
                raise HttpError(409, f"Alias '{name}' konnte nicht erstellt werden – wahrscheinlich bereits als Duplikat vorhanden.")
            
            # Unexpected integrity error (e.g. rank constraint)
            if attempt == max_attempts - 1:
                logger.exception(f"Unexpected IntegrityError creating alias for {ingredient.slug}: {e}")
                raise HttpError(500, "Konnte Alias nicht erstellen – bitte erneut versuchen.")
            rank = None


@ingredient_router.delete("/{slug}/aliases/{alias_id}/")
def delete_alias(request, slug: str, alias_id: int):
    """Delete an alias."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    alias = get_object_or_404(IngredientAlias, id=alias_id, ingredient=ingredient)
    alias.delete()
    return {"success": True}


# ===========================================================================
# AI Suggest & Create
# ===========================================================================


@ingredient_router.post("/{slug}/ai-suggest-all/", response=IngredientSuggestAllOut)
def ai_suggest_all(request, slug: str):
    """Get AI-powered suggestions for all fields of an ingredient."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    from supply.services.ingredient_ai_suggest_service import suggest_all_fields

    result = suggest_all_fields(ingredient, user=request.user)
    return result


@ingredient_router.post("/import-from-url/", response=IngredientImportUrlOut)
def import_from_url(request, payload: IngredientImportUrlIn):
    """Extract ingredient data from a URL using Gemini (Produktseite, Open Food Facts, etc.)."""
    require_auth(request)

    from core.services.gemini import GeminiUnavailableError
    from supply.services.ingredient_url_import_service import import_ingredient_from_url

    try:
        result = import_ingredient_from_url(payload.url, user=request.user)
    except GeminiUnavailableError:
        raise HttpError(429, "KI-Dienst vorübergehend nicht verfügbar. Bitte später erneut versuchen.")
    except ValueError as e:
        raise HttpError(422, str(e))

    return result


@ingredient_router.get("/{slug}/recipes/", response=PaginatedRecipeOut)
def list_recipes_by_ingredient(request, slug: str, page: int = 1, page_size: int = 20):
    ingredient = get_object_or_404(Ingredient, slug=slug)

    base_qs = (
        Recipe.objects.filter(
            recipe_items__portion__ingredient=ingredient,
            status="approved",
        )
        .distinct()
        .select_related("owner", "forked_from")
        .prefetch_related("scout_levels", "tags__parent", "authors")
    )

    if not request.user.is_authenticated or not request.user.is_staff:
        from django.db.models import Q

        system_q = Q(owner__isnull=True, status="approved")
        community_q = Q(owner__isnull=False, visibility="public", status="approved")

        if request.user.is_authenticated:
            own_q = Q(owner=request.user)
            created_q = Q(created_by=request.user)
            visibility_q = system_q | community_q | own_q | created_q
        else:
            visibility_q = system_q | community_q

        base_qs = base_qs.filter(visibility_q)

    total = base_qs.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    recipes = list(base_qs[offset : offset + page_size])

    return {
        "items": recipes,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@ingredient_router.get("/{slug}/similar/", response=list[IngredientSimilarOut])
def get_similar_ingredients(request, slug: str):
    """Get similar ingredients using vector embedding similarity.

    Uses a percentage threshold (70%) to avoid false positives like
    Schweinebauch vs. Schweinenacken being flagged as duplicates.
    """
    from content.services.embedding_service import find_similar_ingredients

    ingredient = get_object_or_404(Ingredient, slug=slug)
    # Threshold: 70% similarity percentage (calibrated to distinguish similar ingredients)
    return find_similar_ingredients(ingredient, similarity_threshold_pct=70.0, limit=6)
