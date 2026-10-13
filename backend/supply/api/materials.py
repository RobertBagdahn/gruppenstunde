"""Material CRUD, search and merge endpoints."""

import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema, Status
from ninja.errors import HttpError

from core.permissions import require_login
from supply.models import Material, RetailSection
from supply.schemas import (
    MaterialCreateIn,
    MaterialListOut,
    MaterialMergeIn,
    MaterialOut,
    MaterialUpdateIn,
    MeasuringUnitOut,
    PaginatedMaterialOut,
)
from supply.services.materials import (
    can_delete_material,
    can_edit_material,
    find_existing_material,
    merge_materials,
    normalize_material_name,
)

router = Router(tags=["supplies"])


def _annotate_permissions(request, material: Material) -> Material:
    material.can_edit = can_edit_material(request.user, material)
    material.can_delete = can_delete_material(request.user)
    return material


def _resolve_retail_section(section_id: int | None) -> RetailSection | None:
    if section_id is None:
        return None
    section = RetailSection.objects.filter(pk=section_id).first()
    if section is None:
        raise HttpError(422, "Unbekannte Supermarkt-Abteilung.")
    return section


class MaterialFilterIn(Schema):
    q: str = ""
    material_category: str | None = None
    is_consumable: bool | None = None
    page: int = 1
    page_size: int = 20


@router.get("/materials/", response=PaginatedMaterialOut)
def list_materials(request, filters: Query[MaterialFilterIn]):
    """List materials with search, category and consumable filter."""
    qs = Material.objects.select_related("retail_section")

    if filters.q:
        qs = qs.filter(Q(name__icontains=filters.q) | Q(description__icontains=filters.q))
    if filters.material_category:
        qs = qs.filter(material_category=filters.material_category)
    if filters.is_consumable is not None:
        qs = qs.filter(is_consumable=filters.is_consumable)

    total = qs.count()
    total_pages = max(1, math.ceil(total / filters.page_size))
    offset = (filters.page - 1) * filters.page_size
    items = [_annotate_permissions(request, item) for item in qs[offset : offset + filters.page_size]]

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


@router.get("/materials/search/", response=list[MaterialListOut])
def search_materials(request, q: str = ""):
    """Fast search for materials (used in the recipe material editor)."""
    qs = Material.objects.all()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
    return [_annotate_permissions(request, item) for item in qs[:20]]


@router.get("/materials/by-slug/{slug}/", response=MaterialOut)
def get_material_by_slug(request, slug: str):
    """Get a material by slug."""
    material = get_object_or_404(Material.objects.select_related("retail_section"), slug=slug)
    return _annotate_permissions(request, material)


@router.get("/materials/{material_id}/", response=MaterialOut)
def get_material(request, material_id: int):
    """Get a material by ID."""
    material = get_object_or_404(Material.objects.select_related("retail_section"), id=material_id)
    return _annotate_permissions(request, material)


@router.post("/materials/", response={200: MaterialOut, 201: MaterialOut})
def create_material(request, payload: MaterialCreateIn):
    """Create a material; returns the existing one (200) when the name is already taken."""
    user = require_login(request, "um Material anzulegen")
    name = normalize_material_name(payload.name)
    if not name:
        raise HttpError(422, "Der Name darf nicht leer sein.")

    existing = find_existing_material(name)
    if existing is not None:
        return Status(200, _annotate_permissions(request, existing))

    material = Material.objects.create(
        name=name,
        description=payload.description,
        material_category=payload.material_category,
        is_consumable=payload.is_consumable,
        package_size=payload.package_size,
        package_unit=payload.package_unit,
        price_per_package=payload.price_per_package,
        retail_section=_resolve_retail_section(payload.retail_section_id),
        created_by=user,
    )
    return Status(201, _annotate_permissions(request, material))


@router.patch("/materials/{material_id}/", response=MaterialOut)
def update_material(request, material_id: int, payload: MaterialUpdateIn):
    """Update a material (own materials; admins any)."""
    user = require_login(request, "um Material zu bearbeiten")
    material = get_object_or_404(Material, id=material_id)
    if not can_edit_material(user, material):
        raise HttpError(403, "Keine Berechtigung, dieses Material zu bearbeiten.")

    data = payload.dict(exclude_unset=True)
    if "name" in data:
        data["name"] = normalize_material_name(data["name"] or "")
        if not data["name"]:
            raise HttpError(422, "Der Name darf nicht leer sein.")
        other = find_existing_material(data["name"])
        if other is not None and other.pk != material.pk:
            raise HttpError(409, "Ein Material mit diesem Namen existiert bereits.")
    if "retail_section_id" in data:
        _resolve_retail_section(data["retail_section_id"])

    update_fields = []
    for field, value in data.items():
        if value is None and field in {"name", "material_category", "is_consumable", "package_unit", "description"}:
            continue
        setattr(material, field, value)
        update_fields.append(field)

    material.updated_by = user
    update_fields.append("updated_by")
    material.save(update_fields=update_fields)

    material.refresh_from_db()
    return _annotate_permissions(request, material)


@router.post("/materials/{material_id}/merge/", response=MaterialOut)
def merge_material(request, material_id: int, payload: MaterialMergeIn):
    """Merge this material into another one (admin only)."""
    user = require_login(request, "um Material zusammenzuführen")
    if not can_delete_material(user):
        raise HttpError(403, "Nur Admins dürfen Material zusammenführen.")
    source = get_object_or_404(Material, id=material_id)
    target = get_object_or_404(Material, id=payload.target_id)
    if source.pk == target.pk:
        raise HttpError(422, "Quelle und Ziel sind identisch.")
    merged = merge_materials(source, target)
    return _annotate_permissions(request, merged)


@router.delete("/materials/{material_id}/", response={204: None})
def delete_material(request, material_id: int):
    """Soft-delete a material (admin only)."""
    user = require_login(request, "um Material zu löschen")
    if not can_delete_material(user):
        raise HttpError(403, "Nur Admins dürfen Materialien löschen.")

    material = get_object_or_404(Material, id=material_id)
    material.soft_delete()
    return Status(204, None)


# ===========================================================================
# Measuring Units (on the supply router)
# ===========================================================================


@router.get("/measuring-units/", response=list[MeasuringUnitOut])
def list_measuring_units(request):
    """List all measuring units, sorted by kitchen relevance."""
    from django.db.models import Case, IntegerField, Value, When

    from supply.models import MeasuringUnit

    return MeasuringUnit.objects.annotate(
        sort_order=Case(
            When(name="Gramm", then=Value(1)),
            When(name="Kilogramm", then=Value(2)),
            When(name="Milliliter", then=Value(3)),
            When(name="Liter", then=Value(4)),
            When(name="Esslöffel", then=Value(5)),
            When(name="Teelöffel", then=Value(6)),
            When(name="Prise", then=Value(7)),
            When(name="Messerspitze", then=Value(8)),
            When(name="Tasse", then=Value(9)),
            When(name="Schuss", then=Value(10)),
            default=Value(99),
            output_field=IntegerField(),
        )
    ).order_by("sort_order")
