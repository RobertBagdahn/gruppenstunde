"""Ingredient group endpoints (simple CRUD for search grouping)."""

from ninja import Router
from ninja.errors import HttpError

from supply.models import IngredientGroup
from supply.schemas.reference import IngredientGroupOut

ingredient_group_router = Router(tags=["ingredient-groups"])


@ingredient_group_router.get("/", response=list[IngredientGroupOut])
def list_groups(request):
    """List all ingredient groups."""
    return IngredientGroup.objects.all()


@ingredient_group_router.post("/", response={201: IngredientGroupOut})
def create_group(request, payload: IngredientGroupOut):
    """Create a new ingredient group (staff-only)."""
    _require_staff(request)
    group = IngredientGroup.objects.create(name=payload.name, slug=payload.slug)
    return 201, group


@ingredient_group_router.patch("/{group_id}/", response=IngredientGroupOut)
def update_group(request, group_id: int, payload: IngredientGroupOut):
    """Update an ingredient group (staff-only)."""
    _require_staff(request)
    try:
        group = IngredientGroup.objects.get(id=group_id)
    except IngredientGroup.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")
    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(group, field, value)
    group.save()
    return group


@ingredient_group_router.delete("/{group_id}/", response={204: None})
def delete_group(request, group_id: int):
    """Delete an ingredient group (staff-only)."""
    _require_staff(request)
    try:
        group = IngredientGroup.objects.get(id=group_id)
    except IngredientGroup.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")
    group.delete()
    return 204, None


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")
