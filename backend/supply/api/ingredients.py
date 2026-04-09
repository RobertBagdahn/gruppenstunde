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
    IngredientAliasOut,
    IngredientCreateIn,
    IngredientDetailOut,
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
    return Portion.objects.filter(ingredient=ingredient).select_related("measuring_unit")


@ingredient_router.post("/{slug}/portions/", response=PortionOut)
def create_portion(request, slug: str, payload: PortionCreateIn):
    """Create a portion for an ingredient."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    portion = Portion(
        ingredient=ingredient,
        name=payload.name,
        quantity=payload.quantity,
        rank=payload.rank,
        priority=payload.priority,
        is_default=payload.is_default,
        created_by=request.user,
    )

    if payload.measuring_unit_id:
        unit = get_object_or_404(MeasuringUnit, id=payload.measuring_unit_id)
        portion.measuring_unit = unit
        portion.weight_g = payload.quantity * unit.quantity
    else:
        portion.weight_g = payload.quantity

    portion.save()
    return portion


@ingredient_router.patch("/{slug}/portions/{portion_id}/", response=PortionOut)
def update_portion(request, slug: str, portion_id: int, payload: PortionUpdateIn):
    """Update a portion."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    data = payload.dict(exclude_unset=True)
    unit_id = data.pop("measuring_unit_id", None)

    for field, value in data.items():
        setattr(portion, field, value)

    if unit_id is not None:
        unit = get_object_or_404(MeasuringUnit, id=unit_id)
        portion.measuring_unit = unit

    if portion.measuring_unit:
        portion.weight_g = portion.quantity * portion.measuring_unit.quantity
    else:
        portion.weight_g = portion.quantity

    portion.updated_by = request.user
    portion.save()
    return portion


@ingredient_router.delete("/{slug}/portions/{portion_id}/")
def delete_portion(request, slug: str, portion_id: int):
    """Delete a portion."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    from recipe.models import RecipeItem

    if RecipeItem.objects.filter(portion=portion).exists():
        raise HttpError(409, "Portion wird in Rezepten verwendet und kann nicht gelöscht werden")

    portion.delete()
    return {"success": True}


# ===========================================================================
# Aliases
# ===========================================================================


@ingredient_router.post("/{slug}/aliases/", response=IngredientAliasOut)
def create_alias(request, slug: str, payload: AliasCreateIn):
    """Create an alias for an ingredient."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    alias = IngredientAlias(
        ingredient=ingredient,
        name=payload.name,
        rank=payload.rank,
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
