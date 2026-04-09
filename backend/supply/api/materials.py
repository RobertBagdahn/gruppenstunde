"""Material CRUD and search endpoints."""

import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from supply.models import Material
from supply.schemas import (
    MaterialCreateIn,
    MaterialListOut,
    MaterialOut,
    MaterialUpdateIn,
    MeasuringUnitOut,
    NutritionalTagOut,
    PaginatedMaterialOut,
)

from .helpers import require_auth

router = Router(tags=["supplies"])


class MaterialFilterIn(Schema):
    q: str = ""
    material_category: str | None = None
    page: int = 1
    page_size: int = 20


@router.get("/materials/", response=PaginatedMaterialOut)
def list_materials(request, filters: Query[MaterialFilterIn]):
    """List materials with search and category filter."""
    qs = Material.objects.all()

    if filters.q:
        qs = qs.filter(Q(name__icontains=filters.q) | Q(description__icontains=filters.q))
    if filters.material_category:
        qs = qs.filter(material_category=filters.material_category)

    total = qs.count()
    total_pages = max(1, math.ceil(total / filters.page_size))
    offset = (filters.page - 1) * filters.page_size
    items = qs[offset : offset + filters.page_size]

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


@router.get("/materials/search/", response=list[MaterialListOut])
def search_materials(request, q: str = ""):
    """Fast search for materials (used in content creation stepper)."""
    if not q or len(q) < 1:
        return list(Material.objects.all()[:20])
    return list(Material.objects.filter(Q(name__icontains=q) | Q(description__icontains=q))[:20])


@router.get("/materials/by-slug/{slug}/", response=MaterialOut)
def get_material_by_slug(request, slug: str):
    """Get a material by slug."""
    return get_object_or_404(Material, slug=slug)


@router.get("/materials/{material_id}/", response=MaterialOut)
def get_material(request, material_id: int):
    """Get a material by ID."""
    return get_object_or_404(Material, id=material_id)


@router.post("/materials/", response={201: MaterialOut})
def create_material(request, payload: MaterialCreateIn):
    """Create a new material."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich.")

    material = Material.objects.create(
        name=payload.name,
        description=payload.description,
        material_category=payload.material_category,
        is_consumable=payload.is_consumable,
        created_by=request.user,
    )
    return 201, material


@router.patch("/materials/{material_id}/", response=MaterialOut)
def update_material(request, material_id: int, payload: MaterialUpdateIn):
    """Update a material."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich.")

    material = get_object_or_404(Material, id=material_id)

    update_fields = []
    for field in ["name", "description", "material_category", "is_consumable"]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(material, field, value)
            update_fields.append(field)

    material.updated_by = request.user
    update_fields.append("updated_by")

    if update_fields:
        material.save(update_fields=update_fields)

    return material


@router.delete("/materials/{material_id}/", response={204: None})
def delete_material(request, material_id: int):
    """Soft-delete a material (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins dürfen Materialien löschen.")

    material = get_object_or_404(Material, id=material_id)
    material.soft_delete()
    return 204, None


# ===========================================================================
# Measuring Units & Nutritional Tags (on the supply router)
# ===========================================================================


@router.get("/measuring-units/", response=list[MeasuringUnitOut])
def list_measuring_units(request):
    """List all measuring units."""
    from supply.models import MeasuringUnit

    return MeasuringUnit.objects.all()


@router.get("/nutritional-tags/", response=list[NutritionalTagOut])
def list_nutritional_tags(request):
    """List all nutritional tags."""
    from supply.models import NutritionalTag

    return NutritionalTag.objects.all()
