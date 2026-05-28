"""Retail section endpoints."""

from ninja import Router
from ninja.errors import HttpError

from supply.models import RetailSection
from supply.schemas import RetailSectionIn, RetailSectionOut, RetailSectionUpdateIn

retail_section_router = Router(tags=["retail-sections"])


@retail_section_router.get("/", response=list[RetailSectionOut])
def list_retail_sections(request):
    """List all retail sections ordered by rank."""
    return RetailSection.objects.all()


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")


@retail_section_router.post("/", response={201: RetailSectionOut})
def create_retail_section(request, payload: RetailSectionIn):
    """Create a new retail section (staff-only)."""
    _require_staff(request)
    section = RetailSection.objects.create(**payload.dict())
    return 201, section


@retail_section_router.patch("/{section_id}/", response=RetailSectionOut)
def update_retail_section(request, section_id: int, payload: RetailSectionUpdateIn):
    """Update a retail section (staff-only)."""
    _require_staff(request)
    try:
        section = RetailSection.objects.get(id=section_id)
    except RetailSection.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(section, field, value)
    section.save()
    return section


@retail_section_router.delete("/{section_id}/", response={204: None})
def delete_retail_section(request, section_id: int):
    """Delete a retail section (staff-only)."""
    _require_staff(request)
    try:
        section = RetailSection.objects.get(id=section_id)
    except RetailSection.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")
    try:
        section.delete()
    except Exception:
        raise HttpError(409, "Kann nicht gelöscht werden, da noch Zutaten zugeordnet sind")
    return 204, None
