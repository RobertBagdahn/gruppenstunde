"""NutritionalTag CRUD endpoints (staff-only for CUD)."""

from ninja import Router
from ninja.errors import HttpError

from supply.models import NutritionalTag
from supply.schemas import NutritionalTagIn, NutritionalTagOut, NutritionalTagUpdateIn

nutritional_tag_router = Router(tags=["nutritional-tags"])


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")


@nutritional_tag_router.get("/", response=list[NutritionalTagOut])
def list_nutritional_tags(request):
    """List all nutritional tags."""
    return NutritionalTag.objects.all()


@nutritional_tag_router.post("/", response={201: NutritionalTagOut})
def create_nutritional_tag(request, payload: NutritionalTagIn):
    """Create a new nutritional tag (staff-only)."""
    _require_staff(request)
    tag = NutritionalTag.objects.create(**payload.dict())
    return 201, tag


@nutritional_tag_router.patch("/{tag_id}/", response=NutritionalTagOut)
def update_nutritional_tag(request, tag_id: int, payload: NutritionalTagUpdateIn):
    """Update a nutritional tag (staff-only)."""
    _require_staff(request)
    try:
        tag = NutritionalTag.objects.get(id=tag_id)
    except NutritionalTag.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(tag, field, value)
    tag.save()
    return tag


@nutritional_tag_router.delete("/{tag_id}/", response={204: None})
def delete_nutritional_tag(request, tag_id: int):
    """Delete a nutritional tag (staff-only)."""
    _require_staff(request)
    try:
        tag = NutritionalTag.objects.get(id=tag_id)
    except NutritionalTag.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")
    try:
        tag.delete()
    except Exception:
        raise HttpError(409, "Kann nicht gelöscht werden, da noch Zutaten zugeordnet sind")
    return 204, None
