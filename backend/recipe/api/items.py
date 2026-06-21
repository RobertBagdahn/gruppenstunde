"""RecipeItem CRUD endpoints."""

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem
from recipe.schemas import (
    AiIngredientApplyIn,
    AiIngredientSuggestionOut,
    EstimateQuantitiesOut,
    RecipeItemCreateIn,
    RecipeItemOut,
    RecipeItemUpdateIn,
)

router = Router()


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


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


@router.get("/{recipe_id}/recipe-items/", response=list[RecipeItemOut])
def list_recipe_items(request, recipe_id: int):
    """List recipe items for a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    return RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion", "portion__ingredient", "portion__measuring_unit",
    )


@router.post("/{recipe_id}/recipe-items/", response=RecipeItemOut)
def create_recipe_item(request, recipe_id: int, payload: RecipeItemCreateIn):
    """Add a recipe item to a recipe."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = RecipeItem.objects.create(
        recipe=recipe,
        portion_id=payload.portion_id,
        quantity=payload.quantity,
        sort_order=payload.sort_order,
        note=payload.note,
    )
    # Reload with relations for schema resolvers
    item = RecipeItem.objects.select_related(
        "portion", "portion__ingredient", "portion__measuring_unit",
    ).get(id=item.id)
    return item


@router.patch("/{recipe_id}/recipe-items/{item_id}/", response=RecipeItemOut)
def update_recipe_item(request, recipe_id: int, item_id: int, payload: RecipeItemUpdateIn):
    """Update a recipe item."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)

    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    item.save()

    # Reload with relations for schema resolvers
    item = RecipeItem.objects.select_related(
        "portion", "portion__ingredient", "portion__measuring_unit",
    ).get(id=item.id)
    return item


@router.delete("/{recipe_id}/recipe-items/{item_id}/")
def delete_recipe_item(request, recipe_id: int, item_id: int):
    """Delete a recipe item."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)
    item.delete()
    return {"success": True}


@router.post(
    "/{recipe_id}/ai-suggest-ingredients/",
    response=list[AiIngredientSuggestionOut],
)
def ai_suggest_ingredients(request, recipe_id: int):
    """Use AI to suggest ingredients for a recipe."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.ai_ingredients_service import RecipeAiIngredientsService

    service = RecipeAiIngredientsService()
    results = service.get_full_suggestions(recipe, user=request.user)

    if results is None:
        raise HttpError(503, "KI-Vorschläge konnten nicht generiert werden")

    return [
        {
            "ingredient_id": r.ingredient_id,
            "ingredient_name": r.ingredient_name,
            "portion_id": r.portion_id,
            "portion_name": r.portion_name,
            "quantity": r.quantity,
            "is_new_ingredient": r.is_new_ingredient,
        }
        for r in results
    ]


@router.post("/{recipe_id}/ai-apply-ingredients/", response=list[RecipeItemOut])
def ai_apply_ingredients(request, recipe_id: int, payload: list[AiIngredientApplyIn]):
    """Apply AI-suggested ingredients as RecipeItems."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    # Get current max sort_order
    last_sort = (
        RecipeItem.objects.filter(recipe=recipe)
        .order_by("-sort_order")
        .values_list("sort_order", flat=True)
        .first()
    ) or 0

    created_items = []
    for i, item_in in enumerate(payload):
        item = RecipeItem.objects.create(
            recipe=recipe,
            portion_id=item_in.portion_id,
            quantity=item_in.quantity,
            sort_order=last_sort + i + 1,
        )
        created_items.append(item)

    # Recalculate nutritional cache
    from recipe.services.recipe_checks import recalculate_recipe_cache

    recalculate_recipe_cache(recipe)

    return RecipeItem.objects.filter(
        id__in=[item.id for item in created_items]
    ).select_related(
        "portion", "portion__ingredient", "portion__measuring_unit",
    )


@router.post("/{recipe_id}/estimate-quantities/", response=EstimateQuantitiesOut)
def estimate_quantities(request, recipe_id: int):
    """AI-estimate realistic quantities for existing recipe items."""
    _require_auth(request)
    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.ai_ingredients_service import RecipeQuantityEstimationService

    service = RecipeQuantityEstimationService()
    result = service.estimate_quantities(recipe, user=request.user)

    if result is None:
        raise HttpError(500, "AI-Schätzung fehlgeschlagen")

    return {"items": result}
