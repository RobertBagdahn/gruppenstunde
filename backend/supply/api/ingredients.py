"""Ingredient CRUD, Portion, and Alias endpoints."""

import logging
import math

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from recipe.models import Recipe
from supply.models import (
    Ingredient,
    IngredientAlias,
    MeasuringUnit,
    Portion,
)
from recipe.schemas import PaginatedRecipeOut
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
    PortionSuggestionOut,
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
    ordering: str = "",
    nutritional_tag: int | None = None,
):
    """List ingredients with pagination, filters, and ordering."""
    from django.db.models import F

    qs = Ingredient.objects.select_related("retail_section").all()

    if name:
        qs = qs.filter(Q(name__icontains=name) | Q(aliases__name__icontains=name)).distinct()

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
    }
    if ordering in ordering_map:
        qs = qs.order_by(ordering_map[ordering])

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
def suggest_ingredients(request, q: str = "", limit: int = Query(default=5, le=50)):
    """Fuzzy-match ingredients by name using trigram similarity."""
    require_auth(request)
    from supply.services.fuzzy_match import suggest_ingredients as do_suggest

    return do_suggest(query=q, limit=limit)


@ingredient_router.post("/ai-create/", response=IngredientDetailOut)
def ai_create(request, payload: IngredientAiCreateIn):
    """Create a complete ingredient from just a name using AI."""
    require_auth(request)

    from supply.services.ingredient_ai_suggest_service import ai_create_ingredient

    ingredient = ai_create_ingredient(payload.name, user=request.user)
    return ingredient


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
    """Update an ingredient."""
    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)

    if not request.user.is_staff and ingredient.created_by_id != request.user.id:
        raise HttpError(403, "Nur der Ersteller oder Admins dürfen diese Zutat bearbeiten")

    data_preview = payload.dict(exclude_unset=True)
    if data_preview.get("status") == "verified" and not request.user.is_staff:
        raise HttpError(403, "Nur Admins können den Status auf 'verified' setzen")

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


@ingredient_router.post("/{slug}/portions/{portion_id}/move/", response=list[PortionOut])
def move_portion_rank(request, slug: str, portion_id: int, direction: str):
    """Move a portion up or down in rank order (▲/▼).

    direction: 'up' or 'down'
    Swaps rank values with the adjacent portion. Returns updated list of portions.
    """
    from django.db import transaction

    require_auth(request)

    ingredient = get_object_or_404(Ingredient, slug=slug)
    portion = get_object_or_404(Portion, id=portion_id, ingredient=ingredient)

    portions = list(
        Portion.objects.filter(ingredient=ingredient, is_deleted=False)
        .order_by("rank", "id")
    )

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
        Portion.objects.filter(ingredient=ingredient, is_deleted=False)
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

    # Reject duplicate alias names (case-insensitive)
    if IngredientAlias.objects.filter(
        ingredient=ingredient, name__iexact=name
    ).exists():
        raise HttpError(409, f"Alias '{name}' existiert bereits für diese Zutat.")

    # Also reject if alias matches the ingredient name itself
    if ingredient.name.lower() == name.lower():
        raise HttpError(409, "Alias darf nicht identisch mit dem Zutatennamen sein.")

    rank = payload.rank

    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            with transaction.atomic():
                existing_ranks = set(
                    IngredientAlias.objects.filter(ingredient=ingredient)
                    .select_for_update()
                    .values_list("rank", flat=True)
                )
                if rank is None or rank in existing_ranks:
                    rank = max(existing_ranks) + 1 if existing_ranks else 1

                alias = IngredientAlias(
                    ingredient=ingredient,
                    name=name,
                    rank=rank,
                    created_by=request.user,
                )
                alias.save()
                return alias
        except IntegrityError:
            # Check if name became duplicate during concurrent requests
            if IngredientAlias.objects.filter(
                ingredient=ingredient, name__iexact=name
            ).exists():
                raise HttpError(409, f"Alias '{name}' existiert bereits für diese Zutat.")

            if attempt == max_attempts - 1:
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

    Uses a strict threshold (0.02) to avoid false positives like
    Schweinebauch vs. Schweinenacken being flagged as duplicates.
    """
    from content.services.embedding_service import find_similar_ingredients

    ingredient = get_object_or_404(Ingredient, slug=slug)
    # Strict threshold: 0.02 cosine distance = very similar names only
    # Default was 0.05 which incorrectly matched Schweinebauch/Schweinenacken
    return find_similar_ingredients(ingredient, threshold=0.02, limit=6)
