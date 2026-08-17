"""RecipeItem CRUD endpoints."""

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem, RecipeItemExchangeGroup
from recipe.schemas import (
    AiIngredientApplyIn,
    AiIngredientSuggestionOut,
    EstimateQuantitiesOut,
    RecipeItemCreateIn,
    RecipeItemExchangeGroupCreateIn,
    RecipeItemExchangeGroupOut,
    RecipeItemOut,
    RecipeItemUpdateIn,
)
from supply.models import Portion


def _recipe_item_has_active_variants(item: RecipeItem) -> bool:
    """True if any MealItem references this recipe item in active_recipe_item_ids."""
    from planner.models import MealItem

    return any(
        item.id in (mi.active_recipe_item_ids or [])
        for mi in MealItem.objects.filter(recipe=item.recipe).only("active_recipe_item_ids").iterator()
    )


router = Router()


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


def _can_edit_recipe(request, recipe: Recipe) -> bool:
    """Check if user can edit this recipe."""
    if not request.user.is_authenticated:
        return False
    if request.user.is_staff:
        return True
    if recipe.created_by_id == request.user.id:
        return True
    if recipe.owner_id and recipe.owner_id == request.user.id:
        return True
    if recipe.authors.filter(id=request.user.id).exists():
        return True
    return False


def _get_visible_recipe_or_404(request, recipe_id: int, require_auth: bool = True) -> Recipe:
    if require_auth:
        _require_auth(request)
    from content.services.food_access import get_visible_recipe_or_404

    return get_visible_recipe_or_404(request.user, recipe_id)


@router.get("/{recipe_id}/recipe-items/", response=list[RecipeItemOut])
def list_recipe_items(request, recipe_id: int):
    """List recipe items for a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
    return RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    )


@router.post("/{recipe_id}/recipe-items/", response=RecipeItemOut)
def create_recipe_item(request, recipe_id: int, payload: RecipeItemCreateIn):
    """Add a recipe item to a recipe."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    # Manual creation requires a valid portion_id
    if payload.portion_id is None:
        raise HttpError(400, "portion_id ist erforderlich")

    item = RecipeItem.objects.create(
        recipe=recipe,
        portion_id=payload.portion_id,
        quantity=payload.quantity,
        sort_order=payload.sort_order,
        note=payload.note,
        is_optional=payload.is_optional,
    )
    # Reload with relations for schema resolvers
    item = RecipeItem.objects.select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    ).get(id=item.id)
    return item


@router.patch("/{recipe_id}/recipe-items/{item_id}/", response=RecipeItemOut)
def update_recipe_item(request, recipe_id: int, item_id: int, payload: RecipeItemUpdateIn):
    """Update a recipe item."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)

    data = payload.dict(exclude_unset=True)
    expected_grams_total = data.pop("expected_grams_total", None)

    # Determine resulting optional/exchange state to validate mutual exclusion.
    result_is_optional = data.get("is_optional", item.is_optional)
    result_exchange_group = data["exchange_group_id"] if "exchange_group_id" in data else item.exchange_group_id
    if result_is_optional and result_exchange_group is not None:
        raise HttpError(
            400,
            "Eine Zutat kann nicht gleichzeitig optional und Teil einer Austausch-Gruppe sein.",
        )

    # Protect split-relevant fields while active variants reference this item.
    split_relevant = {"is_optional", "exchange_group_id", "exchange_position"}
    if split_relevant & data.keys() and _recipe_item_has_active_variants(item):
        raise HttpError(
            409,
            "Diese Zutat wird in aktiven Essensplänen mit Varianten verwendet und kann nicht geändert werden.",
        )

    # Plausibility check (safety net): if the client tells us what gram total
    # it intended (e.g. when applying an AI quantity estimate), verify the
    # resulting quantity * portion.weight_g matches within a generous tolerance
    # (15% or 2g). The wide tolerance allows legitimate cooking-portion
    # variations and floating-point noise while still catching catastrophic
    # mismatches (factor 10+ errors from client bugs).
    if expected_grams_total is not None:
        result_portion_id = data.get("portion_id", item.portion_id)
        result_quantity = data.get("quantity", item.quantity)
        portion = (
            item.portion
            if result_portion_id == item.portion_id
            else get_object_or_404(Portion, id=result_portion_id)
        )
        resulting_weight_g = portion.weight_g if (portion.weight_g and portion.weight_g > 0) else 1.0
        resulting_grams = result_quantity * resulting_weight_g
        tolerance = max(abs(expected_grams_total) * 0.15, 2.0)
        if abs(resulting_grams - expected_grams_total) > tolerance:
            raise HttpError(
                422,
                "Die resultierende Menge weicht von der erwarteten Gramm-Menge ab "
                f"(erwartet {expected_grams_total}g, ergäbe {resulting_grams:.2f}g). "
                "Speichern abgebrochen, um eine falsche Portion/Menge-Kombination zu verhindern.",
            )

    for field, value in data.items():
        setattr(item, field, value)
    item.save()

    # Reload with relations for schema resolvers
    item = RecipeItem.objects.select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    ).get(id=item.id)
    return item


@router.delete("/{recipe_id}/recipe-items/{item_id}/")
def delete_recipe_item(request, recipe_id: int, item_id: int):
    """Delete a recipe item."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)
    if _recipe_item_has_active_variants(item):
        raise HttpError(
            409,
            "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden.",
        )
    item.delete()
    return {"success": True}


# ---------------------------------------------------------------------------
# Exchange groups
# ---------------------------------------------------------------------------


@router.get("/{recipe_id}/exchanges/", response=list[RecipeItemExchangeGroupOut])
def list_exchange_groups(request, recipe_id: int):
    """List all exchange groups of a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
    return RecipeItemExchangeGroup.objects.filter(recipe=recipe).prefetch_related(
        "items__portion__ingredient",
    )


@router.post("/{recipe_id}/exchanges/", response={201: RecipeItemExchangeGroupOut})
def create_exchange_group(request, recipe_id: int, payload: RecipeItemExchangeGroupCreateIn):
    """Create an exchange group for a recipe."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name=payload.name)
    return 201, group


@router.delete("/{recipe_id}/exchanges/{group_id}/")
def delete_exchange_group(request, recipe_id: int, group_id: int):
    """Delete an exchange group.

    Blocked (409) if any active variant references its members (via active_recipe_item_ids).
    Otherwise the non-default members (exchange_position > 0) are deleted and the original
    (position 0) is reset to a normal ingredient (exchange_group=None).
    """
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    group = get_object_or_404(RecipeItemExchangeGroup, id=group_id, recipe=recipe)

    members = list(group.items.all())
    if any(_recipe_item_has_active_variants(m) for m in members):
        raise HttpError(
            409,
            "Diese Austausch-Gruppe wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden.",
        )

    for member in members:
        if (member.exchange_position or 0) > 0:
            member.delete()
        else:
            member.exchange_group = None
            member.exchange_position = None
            member.save(update_fields=["exchange_group", "exchange_position"])

    group.delete()
    return {"success": True}


@router.post(
    "/{recipe_id}/ai-suggest-ingredients/",
    response=list[AiIngredientSuggestionOut],
)
def ai_suggest_ingredients(request, recipe_id: int):
    """Use AI to suggest ingredients for a recipe."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.ai_ingredients_service import RecipeAiIngredientsService
    from supply.models import Ingredient, IngredientAlias
    from supply.services.term_normalization import normalize_term

    service = RecipeAiIngredientsService()
    results = service.get_full_suggestions(recipe, user=request.user)

    if results is None:
        raise HttpError(503, "KI-Vorschläge konnten nicht generiert werden")

    # Collect ingredient IDs already in this recipe (via portions)
    existing_ingredient_ids: set[int] = set(
        recipe.recipe_items.select_related("portion__ingredient").values_list("portion__ingredient_id", flat=True)
    )

    # Also collect alias ingredient IDs for ingredients already in the recipe
    # so that e.g. "Zwiebeln" is excluded when "Zwiebel" is already present
    alias_ingredient_ids: set[int] = set(
        IngredientAlias.objects.filter(ingredient_id__in=existing_ingredient_ids).values_list(
            "ingredient_id", flat=True
        )
    )
    all_excluded_ids = existing_ingredient_ids | alias_ingredient_ids

    # Also exclude via normalized (stemmed) name comparison, so plural/singular
    # variants without a maintained alias (e.g. "Zwiebeln" vs "Zwiebel") are not
    # suggested again as a duplicate.
    existing_normalized_names = {
        normalize_term(name)
        for name in Ingredient.objects.filter(id__in=existing_ingredient_ids).values_list("name", flat=True)
    }

    filtered = [
        r
        for r in results
        if r.ingredient_id not in all_excluded_ids and normalize_term(r.ingredient_name) not in existing_normalized_names
    ]

    return [
        {
            "ingredient_id": r.ingredient_id,
            "ingredient_name": r.ingredient_name,
            "portion_id": r.portion_id,
            "portion_name": r.portion_name,
            "quantity": r.quantity,
            "is_new_ingredient": r.is_new_ingredient,
            "note": r.note,
        }
        for r in filtered
    ]


@router.post("/{recipe_id}/ai-apply-ingredients/", response=list[RecipeItemOut])
def ai_apply_ingredients(request, recipe_id: int, payload: list[AiIngredientApplyIn]):
    """Apply AI-suggested ingredients as RecipeItems."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    # Get current max sort_order
    last_sort = (
        RecipeItem.objects.filter(recipe=recipe).order_by("-sort_order").values_list("sort_order", flat=True).first()
    ) or 0

    # Filter out duplicates: skip ingredients already in the recipe
    existing_ingredient_ids = set(
        RecipeItem.objects.filter(recipe=recipe).values_list("portion__ingredient_id", flat=True)
    )
    portion_ids = [item.portion_id for item in payload]
    portion_to_ingredient = {
        p["id"]: p["ingredient_id"] for p in Portion.objects.filter(id__in=portion_ids).values("id", "ingredient_id")
    }
    filtered_payload = [
        item for item in payload if portion_to_ingredient.get(item.portion_id) not in existing_ingredient_ids
    ]

    created_items = []
    for i, item_in in enumerate(filtered_payload):
        item = RecipeItem.objects.create(
            recipe=recipe,
            portion_id=item_in.portion_id,
            quantity=item_in.quantity,
            sort_order=last_sort + i + 1,
            is_optional=item_in.is_optional,
            note=item_in.note,
        )
        created_items.append(item)

    # Recalculate nutritional cache
    from recipe.services.recipe_checks import recalculate_recipe_cache

    recalculate_recipe_cache(recipe)

    return RecipeItem.objects.filter(id__in=[item.id for item in created_items]).select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    )


@router.post("/{recipe_id}/estimate-quantities/", response=EstimateQuantitiesOut)
def estimate_quantities(request, recipe_id: int):
    """AI-estimate realistic quantities for existing recipe items."""
    _require_auth(request)
    recipe = _get_visible_recipe_or_404(request, recipe_id)
    from content.services.food_access import can_edit

    if not can_edit(recipe, request.user):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.ai_ingredients_service import RecipeQuantityEstimationService

    service = RecipeQuantityEstimationService()
    result = service.estimate_quantities(recipe, user=request.user)

    if result is None:
        raise HttpError(500, "AI-Schätzung fehlgeschlagen")

    return {"items": result}
