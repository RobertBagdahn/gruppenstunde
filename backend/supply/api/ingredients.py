"""Ingredient CRUD, Portion, and Alias endpoints."""

import logging
import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from supply.models import (
    Ingredient,
    IngredientAlias,
    MeasuringUnit,
    Portion,
)
from supply.schemas import (
    AliasCreateIn,
    IngredientAiCreateIn,
    IngredientAliasOut,
    IngredientCreateIn,
    IngredientDetailOut,
    IngredientSuggestAllOut,
    IngredientUpdateIn,
    PaginatedIngredientOut,
    PortionCreateIn,
    PortionOut,
    PortionUpdateIn,
)

from .helpers import require_auth

logger = logging.getLogger(__name__)

ingredient_router = Router(tags=["ingredients"])


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
):
    """List ingredients with pagination and filters."""
    qs = Ingredient.objects.select_related("retail_section").all()

    if name:
        qs = qs.filter(Q(name__icontains=name) | Q(aliases__name__icontains=name)).distinct()

    if retail_section:
        qs = qs.filter(retail_section_id=retail_section)

    if status:
        qs = qs.filter(status=status)

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@ingredient_router.get("/suggest/", response=list[dict])
def suggest_ingredients(request, q: str = "", limit: int = 5):
    """Fuzzy-match ingredients by name using trigram similarity."""
    from supply.services.fuzzy_match import suggest_ingredients as do_suggest

    return do_suggest(query=q, limit=limit)


@ingredient_router.get("/{slug}/", response=IngredientDetailOut)
def get_ingredient(request, slug: str):
    """Get ingredient detail by slug."""
    ingredient = get_object_or_404(
        Ingredient.objects.select_related("retail_section").prefetch_related(
            "nutritional_tags", "portions__measuring_unit", "aliases"
        ),
        slug=slug,
    )
    return ingredient


@ingredient_router.post("/", response=IngredientDetailOut)
def create_ingredient(request, payload: IngredientCreateIn):
    """Create a new ingredient."""
    require_auth(request)

    data = payload.dict(exclude={"nutritional_tag_ids"})
    data["retail_section_id"] = data.pop("retail_section_id", None)

    if not data["retail_section_id"]:
        from supply.services.retail_section_mapping import get_retail_section
        rs = get_retail_section(data["name"], data.get("description", ""))
        if rs:
            data["retail_section_id"] = rs.id

    ingredient = Ingredient(**data)
    ingredient.created_by = request.user
    ingredient.status = "draft"
    ingredient.save()

    if payload.nutritional_tag_ids:
        ingredient.nutritional_tags.set(payload.nutritional_tag_ids)

    # Calculate nutri-score if nutritional data is present
    if ingredient.energy_kj is not None:
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
    """Update an ingredient."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    if not request.user.is_staff and ingredient.created_by_id != request.user.id:
        raise HttpError(403, "Nur der Ersteller oder Admins dürfen diese Zutat bearbeiten")

    nutritional_fields = {
        "energy_kj",
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

    for field, value in data.items():
        if field in nutritional_fields:
            nutri_changed = True
        setattr(ingredient, field, value)

    ingredient.updated_by = request.user
    ingredient.save()

    if tag_ids is not None:
        ingredient.nutritional_tags.set(tag_ids)

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

    if not request.user.is_staff and ingredient.created_by_id != request.user.id:
        raise HttpError(403, "Nur der Ersteller oder Admins dürfen diese Zutat löschen")

    from recipe.models import RecipeItem

    if RecipeItem.objects.filter(ingredient=ingredient).exists():
        raise HttpError(409, "Zutat wird in Rezepten verwendet und kann nicht gelöscht werden")

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
    """Create a portion for an ingredient."""
    require_auth(request)

    if not payload.name or not payload.name.strip():
        raise HttpError(422, "Portionsname darf nicht leer sein.")

    ingredient = get_object_or_404(Ingredient, slug=slug)

    portion = Portion(
        ingredient=ingredient,
        name=payload.name.strip(),
        quantity=payload.quantity,
        rank=payload.rank,
        priority=payload.priority,
        is_default=payload.is_default,
        created_by=request.user,
    )

    if payload.measuring_unit_id:
        unit = get_object_or_404(MeasuringUnit, id=payload.measuring_unit_id)
        portion.measuring_unit = unit

    portion.weight_g = payload.weight_g
    portion.save()
    return portion


@ingredient_router.patch("/{slug}/portions/{portion_id}/", response=PortionOut)
def update_portion(request, slug: str, portion_id: int, payload: PortionUpdateIn):
    """Update a portion."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    data = payload.dict(exclude_unset=True)
    if "name" in data:
        if not payload.name or not payload.name.strip():
            raise HttpError(422, "Portionsname darf nicht leer sein.")
        portion.name = payload.name.strip()
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
    """Soft-delete a portion."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    portion.soft_delete()
    return {"success": True}


# ===========================================================================
# Aliases
# ===========================================================================


@ingredient_router.post("/{slug}/aliases/", response=IngredientAliasOut)
def create_alias(request, slug: str, payload: AliasCreateIn):
    """Create an alias for an ingredient."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    # Reject duplicate alias names (case-insensitive)
    if IngredientAlias.objects.filter(
        ingredient=ingredient, name__iexact=payload.name
    ).exists():
        raise HttpError(409, f"Alias '{payload.name}' existiert bereits für diese Zutat.")

    # Also reject if alias matches the ingredient name itself
    if ingredient.name.lower() == payload.name.lower():
        raise HttpError(409, "Alias darf nicht identisch mit dem Zutatennamen sein.")

    # Auto-assign next rank if the requested rank already exists
    rank = payload.rank
    existing_ranks = set(
        IngredientAlias.objects.filter(ingredient=ingredient).values_list("rank", flat=True)
    )
    if rank in existing_ranks:
        rank = max(existing_ranks) + 1 if existing_ranks else 1

    alias = IngredientAlias(
        ingredient=ingredient,
        name=payload.name,
        rank=rank,
        created_by=request.user,
    )
    alias.save()
    return alias


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


@ingredient_router.post("/ai-create/", response=IngredientDetailOut)
def ai_create(request, payload: IngredientAiCreateIn):
    """Create a complete ingredient from just a name using AI."""
    require_auth(request)

    from supply.services.ingredient_ai_suggest_service import ai_create_ingredient

    ingredient = ai_create_ingredient(payload.name, user=request.user)
    return ingredient
