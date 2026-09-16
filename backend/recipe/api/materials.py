"""Recipe material endpoints — ContentMaterialItem links scoped to a recipe."""

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.shortcuts import get_object_or_404
from ninja import Router, Status
from ninja.errors import HttpError

from recipe.models import Recipe
from recipe.schemas import (
    AiMaterialApplyIn,
    AiMaterialSuggestionsOut,
    RecipeMaterialCreateIn,
    RecipeMaterialOut,
    RecipeMaterialReorderIn,
    RecipeMaterialUpdateIn,
)
from supply.models import ContentMaterialItem, Material

from .items import _get_visible_recipe_or_404, _require_auth

router = Router()


def _recipe_content_type() -> ContentType:
    return ContentType.objects.get_for_model(Recipe, for_concrete_model=False)


def _require_edit_permission(request, recipe: Recipe) -> None:
    _require_auth(request)
    from content.services.food_access import can_edit

    if not can_edit(recipe, request.user):
        raise HttpError(403, "Keine Berechtigung")


def _materials_for_recipe(recipe: Recipe):
    """Return the recipe-scoped ContentMaterialItem queryset with material loaded."""
    ct = _recipe_content_type()
    return ContentMaterialItem.objects.filter(content_type=ct, object_id=recipe.pk).select_related("material")


def _next_sort_order(recipe: Recipe) -> int:
    last = _materials_for_recipe(recipe).order_by("-sort_order").values_list("sort_order", flat=True).first()
    return (last or 0) + 1


# NOTE: Specific routes (reorder, ai-*) are registered before the parametrized
# {item_id} routes so they are not captured as item ids.


@router.get("/{recipe_id}/materials/", response=list[RecipeMaterialOut])
def list_recipe_materials(request, recipe_id: int):
    """List materials linked to a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
    return _materials_for_recipe(recipe).order_by("sort_order")


@router.post("/{recipe_id}/materials/", response={201: RecipeMaterialOut, 200: RecipeMaterialOut})
def create_recipe_material(request, recipe_id: int, payload: RecipeMaterialCreateIn):
    """Link a material to a recipe.

    Duplicate links are merged deterministically: the quantity is updated when
    provided and the existing link is returned instead of creating a new row.
    """
    with transaction.atomic():
        recipe = _get_visible_recipe_or_404(request, recipe_id)
        recipe = Recipe.objects.select_for_update().get(pk=recipe.pk)
        _require_edit_permission(request, recipe)

        material = get_object_or_404(Material, id=payload.material_id, deleted_at__isnull=True)

        ct = _recipe_content_type()
        item = (
            ContentMaterialItem.objects.select_for_update()
            .select_related("material")
            .filter(content_type=ct, object_id=recipe.pk, material=material)
            .first()
        )
        if item is not None:
            if payload.quantity:
                item.quantity = payload.quantity
                item.save(update_fields=["quantity"])
            return Status(200, item)

        item = ContentMaterialItem.objects.create(
            content_type=ct,
            object_id=recipe.pk,
            material=material,
            quantity=payload.quantity,
            sort_order=_next_sort_order(recipe),
        )
    return Status(201, item)


@router.post("/{recipe_id}/materials/reorder/", response=list[RecipeMaterialOut])
def reorder_recipe_materials(request, recipe_id: int, payload: RecipeMaterialReorderIn):
    """Persist a new material order for a recipe."""
    with transaction.atomic():
        recipe = _get_visible_recipe_or_404(request, recipe_id)
        _require_edit_permission(request, recipe)

        items = list(_materials_for_recipe(recipe))
        existing_ids = {item.id for item in items}
        if set(payload.item_ids) != existing_ids:
            raise HttpError(400, "Die übermittelte Materialliste stimmt nicht mit dem Rezept überein.")

        item_by_id = {item.id: item for item in items}
        for sort_order, item_id in enumerate(payload.item_ids):
            item = item_by_id[item_id]
            item.sort_order = sort_order
            item.save(update_fields=["sort_order"])

    return sorted(item_by_id.values(), key=lambda item: item.sort_order)


@router.post("/{recipe_id}/ai-suggest-materials/", response=AiMaterialSuggestionsOut)
def ai_suggest_materials(request, recipe_id: int):
    """Use AI to suggest consumable/helper materials for a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id)
    _require_edit_permission(request, recipe)

    from recipe.services.ai_materials_service import RecipeAiMaterialsService

    service = RecipeAiMaterialsService()
    results, interaction_id = service.get_full_suggestions(recipe, user=request.user)

    if results is None:
        raise HttpError(503, "KI-Vorschläge konnten nicht generiert werden")

    return {
        "items": [
            {
                "material_id": r.material_id,
                "suggested_name": r.suggested_name,
                "quantity": r.quantity,
                "matched_name": r.matched_name,
                "is_new": r.is_new,
            }
            for r in results
        ],
        "ai_interaction_id": interaction_id,
    }


@router.post("/{recipe_id}/ai-apply-materials/", response={201: list[RecipeMaterialOut]})
def ai_apply_materials(request, recipe_id: int, payload: list[AiMaterialApplyIn]):
    """Apply matched AI-suggested materials as recipe material links."""
    _require_auth(request)

    with transaction.atomic():
        recipe = _get_visible_recipe_or_404(request, recipe_id)
        recipe = Recipe.objects.select_for_update().get(pk=recipe.pk)
        _require_edit_permission(request, recipe)

        from recipe.services.ai_materials_service import RecipeAiMaterialsService

        service = RecipeAiMaterialsService()
        created = service.apply_materials(recipe, payload)

    return Status(201, created)


@router.patch("/{recipe_id}/materials/{item_id}/", response=RecipeMaterialOut)
def update_recipe_material(request, recipe_id: int, item_id: int, payload: RecipeMaterialUpdateIn):
    """Update quantity or sort order of a recipe material link."""
    recipe = _get_visible_recipe_or_404(request, recipe_id)
    _require_edit_permission(request, recipe)

    ct = _recipe_content_type()
    item = get_object_or_404(ContentMaterialItem, id=item_id, content_type=ct, object_id=recipe.pk)

    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    if data:
        item.save(update_fields=list(data.keys()))

    return ContentMaterialItem.objects.select_related("material").get(id=item.id)


@router.delete("/{recipe_id}/materials/{item_id}/", response={204: None})
def delete_recipe_material(request, recipe_id: int, item_id: int):
    """Remove a material link from a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id)
    _require_edit_permission(request, recipe)

    ct = _recipe_content_type()
    item = get_object_or_404(ContentMaterialItem, id=item_id, content_type=ct, object_id=recipe.pk)
    item.delete()
    return Status(204, None)
