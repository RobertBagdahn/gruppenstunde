"""RecipeItem CRUD endpoints."""

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem
from recipe.schemas import (
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
    if recipe.authors.filter(id=request.user.id).exists():
        return True
    return False


@router.get("/{recipe_id}/recipe-items/", response=list[RecipeItemOut])
def list_recipe_items(request, recipe_id: int):
    """List recipe items for a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    return RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion", "portion__ingredient", "portion__measuring_unit", "ingredient", "measuring_unit"
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
        ingredient_id=payload.ingredient_id,
        quantity=payload.quantity,
        measuring_unit_id=payload.measuring_unit_id,
        sort_order=payload.sort_order,
        note=payload.note,
        quantity_type=payload.quantity_type,
    )
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
