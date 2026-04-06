"""Django Ninja API routes for the ingredient database."""

import logging
import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from .models import (
    Ingredient,
    IngredientAlias,
    MeasuringUnit,
    NutritionalTag,
    Portion,
    Price,
    RetailSection,
)
from .schemas import (
    AliasCreateIn,
    IngredientCreateIn,
    IngredientDetailOut,
    IngredientListOut,
    IngredientUpdateIn,
    MaterialUnitOut,
    NutritionalTagOut,
    PaginatedIngredientOut,
    PortionCreateIn,
    PortionOut,
    PortionUpdateIn,
    PriceCreateIn,
    PriceOut,
    PriceUpdateIn,
    RetailSectionOut,
    IngredientAliasOut,
)

logger = logging.getLogger(__name__)

ingredient_router = Router(tags=["ingredients"])
retail_section_router = Router(tags=["retail-sections"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


# ==========================================================================
# Ingredient CRUD
# ==========================================================================


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
        # Search by name and aliases
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
    _require_auth(request)

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
        from .services.nutri_service import update_ingredient_nutri_score

        update_ingredient_nutri_score(ingredient)

    ingredient.refresh_from_db()
    return ingredient


@ingredient_router.patch("/{slug}/", response=IngredientDetailOut)
def update_ingredient(request, slug: str, payload: IngredientUpdateIn):
    """Update an ingredient."""
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    # Track if nutritional values changed
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

    # Recalculate nutri-score if nutritional values changed
    if nutri_changed:
        from .services.nutri_service import update_ingredient_nutri_score

        update_ingredient_nutri_score(ingredient)

    ingredient.refresh_from_db()
    return ingredient


@ingredient_router.delete("/{slug}/")
def delete_ingredient(request, slug: str):
    """Delete an ingredient if no RecipeItems reference it."""
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    # Check for references
    from recipe.models import RecipeItem

    if RecipeItem.objects.filter(ingredient=ingredient).exists():
        raise HttpError(409, "Zutat wird in Rezepten verwendet und kann nicht gelöscht werden")

    ingredient.delete()
    return {"success": True}


# ==========================================================================
# Portions
# ==========================================================================


@ingredient_router.get("/{slug}/portions/", response=list[PortionOut])
def list_portions(request, slug: str):
    """List portions for an ingredient."""
    ingredient = get_object_or_404(Ingredient, slug=slug)
    return Portion.objects.filter(ingredient=ingredient).select_related("measuring_unit")


@ingredient_router.post("/{slug}/portions/", response=PortionOut)
def create_portion(request, slug: str, payload: PortionCreateIn):
    """Create a portion for an ingredient."""
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    portion = Portion(
        ingredient=ingredient,
        name=payload.name,
        quantity=payload.quantity,
        rank=payload.rank,
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
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    data = payload.dict(exclude_unset=True)
    unit_id = data.pop("measuring_unit_id", None)

    for field, value in data.items():
        setattr(portion, field, value)

    if unit_id is not None:
        unit = get_object_or_404(MeasuringUnit, id=unit_id)
        portion.measuring_unit = unit

    # Recalculate weight_g
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
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    # Check for RecipeItem references
    from recipe.models import RecipeItem

    if RecipeItem.objects.filter(portion=portion).exists():
        raise HttpError(409, "Portion wird in Rezepten verwendet und kann nicht gelöscht werden")

    portion.delete()
    return {"success": True}


# ==========================================================================
# Prices
# ==========================================================================


@ingredient_router.post("/{slug}/portions/{portion_id}/prices/", response=PriceOut)
def create_price(request, slug: str, portion_id: int, payload: PriceCreateIn):
    """Create a price for a portion."""
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    price = Price(
        portion=portion,
        price_eur=payload.price_eur,
        quantity=payload.quantity,
        name=payload.name,
        retailer=payload.retailer,
        quality=payload.quality,
        created_by=request.user,
    )
    price.save()

    # Run price cascade
    from .services.price_service import run_price_cascade

    run_price_cascade(price)

    return price


@ingredient_router.patch("/{slug}/prices/{price_id}/", response=PriceOut)
def update_price(request, slug: str, price_id: int, payload: PriceUpdateIn):
    """Update a price."""
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    price = get_object_or_404(Price, id=price_id, portion__ingredient=ingredient)

    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(price, field, value)

    price.updated_by = request.user
    price.save()

    # Run price cascade
    from .services.price_service import run_price_cascade

    run_price_cascade(price)

    return price


@ingredient_router.delete("/{slug}/prices/{price_id}/")
def delete_price(request, slug: str, price_id: int):
    """Delete a price."""
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    price = get_object_or_404(Price, id=price_id, portion__ingredient=ingredient)
    price.delete()

    # Recalculate ingredient price_per_kg after deletion
    from .services.price_service import run_price_cascade

    # Create a dummy to trigger recalculation — or just recalculate directly
    remaining_prices = Price.objects.filter(portion__ingredient=ingredient)
    if remaining_prices.exists():
        run_price_cascade(remaining_prices.first())
    else:
        ingredient.price_per_kg = None
        ingredient.save(update_fields=["price_per_kg"])

    return {"success": True}


# ==========================================================================
# Aliases
# ==========================================================================


@ingredient_router.post("/{slug}/aliases/", response=IngredientAliasOut)
def create_alias(request, slug: str, payload: AliasCreateIn):
    """Create an alias for an ingredient."""
    _require_auth(request)

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
    _require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    alias = get_object_or_404(IngredientAlias, id=alias_id, ingredient=ingredient)
    alias.delete()
    return {"success": True}


# ==========================================================================
# Retail Sections
# ==========================================================================


@retail_section_router.get("/", response=list[RetailSectionOut])
def list_retail_sections(request):
    """List all retail sections ordered by rank."""
    return RetailSection.objects.all()
