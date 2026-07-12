"""Equipment CRUD endpoints (staff-only for CUD)."""

from ninja import Router
from ninja.errors import HttpError

from supply.models import Equipment
from supply.schemas import EquipmentIn, EquipmentOut

equipment_router = Router(tags=["equipment"])


def _require_staff(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Nur Admins")
    if request.user.is_staff:
        return
    try:
        if request.user.profile.role in ("staff", "admin"):
            return
    except AttributeError:
        pass
    raise HttpError(403, "Nur Admins")


@equipment_router.get("/", response=list[EquipmentOut])
def list_equipment(request):
    """List all equipment."""
    return Equipment.objects.all()


@equipment_router.post("/", response={201: EquipmentOut})
def create_equipment(request, payload: EquipmentIn):
    """Create new equipment (staff-only)."""
    _require_staff(request)
    equipment = Equipment.objects.create(**payload.dict())
    return 201, equipment


@equipment_router.patch("/{equipment_id}/", response=EquipmentOut)
def update_equipment(request, equipment_id: int, payload: EquipmentIn):
    """Update equipment (staff-only)."""
    _require_staff(request)
    try:
        equipment = Equipment.objects.get(id=equipment_id)
    except Equipment.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(equipment, field, value)
    equipment.save()
    return equipment


@equipment_router.delete("/{equipment_id}/", response={204: None})
def delete_equipment(request, equipment_id: int):
    """Delete equipment (staff-only)."""
    _require_staff(request)
    try:
        equipment = Equipment.objects.get(id=equipment_id)
    except Equipment.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")
    try:
        equipment.delete()
    except Exception:
        raise HttpError(409, "Kann nicht gelöscht werden, da noch Rezepte zugeordnet sind")
    return 204, None
