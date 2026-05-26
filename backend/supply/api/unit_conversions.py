"""Unit conversion API endpoints."""

from django.db.models import Q
from ninja import Query, Router
from ninja.errors import HttpError

from supply.models import UnitConversion
from supply.schemas.unit_conversion import (
    UnitConversionCreateIn,
    UnitConversionOut,
    UnitConversionUpdateIn,
)

unit_conversion_router = Router(tags=["Unit Conversions"])


@unit_conversion_router.get("/", response=list[UnitConversionOut])
def list_unit_conversions(
    request,
    from_unit: int | None = Query(None),
    to_unit: int | None = Query(None),
    ingredient: int | None = Query(None),
) -> list[UnitConversionOut]:
    """List unit conversions with optional filters."""
    qs = UnitConversion.objects.select_related(
        "from_unit", "to_unit", "ingredient"
    )

    if from_unit:
        qs = qs.filter(from_unit_id=from_unit)
    if to_unit:
        qs = qs.filter(to_unit_id=to_unit)
    if ingredient is not None:
        # Return ingredient-specific + generic (null) conversions
        qs = qs.filter(Q(ingredient_id=ingredient) | Q(ingredient__isnull=True))

    return [
        UnitConversionOut(
            id=c.id,
            from_unit_id=c.from_unit_id,
            from_unit_name=c.from_unit.name,
            to_unit_id=c.to_unit_id,
            to_unit_name=c.to_unit.name,
            factor=float(c.factor),
            ingredient_id=c.ingredient_id,
            ingredient_name=c.ingredient.name if c.ingredient else None,
        )
        for c in qs
    ]


@unit_conversion_router.get("/convert/", response=dict)
def convert_unit(
    request,
    from_unit: int = Query(...),
    to_unit: int = Query(...),
    quantity: float = Query(...),
    ingredient: int | None = Query(None),
) -> dict:
    """Convert a quantity between units. Prefers ingredient-specific conversion."""
    # Try ingredient-specific first
    conversion = None
    if ingredient:
        conversion = UnitConversion.objects.filter(
            from_unit_id=from_unit, to_unit_id=to_unit, ingredient_id=ingredient
        ).first()

    # Fallback to generic
    if not conversion:
        conversion = UnitConversion.objects.filter(
            from_unit_id=from_unit, to_unit_id=to_unit, ingredient__isnull=True
        ).first()

    if not conversion:
        raise HttpError(404, "Keine Umrechnung gefunden")

    return {
        "result": quantity * float(conversion.factor),
        "factor": float(conversion.factor),
        "is_ingredient_specific": conversion.ingredient_id is not None,
    }


@unit_conversion_router.post("/", response=UnitConversionOut)
def create_unit_conversion(request, payload: UnitConversionCreateIn) -> UnitConversionOut:
    """Create a new unit conversion."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")

    conversion = UnitConversion.objects.create(
        from_unit_id=payload.from_unit_id,
        to_unit_id=payload.to_unit_id,
        factor=payload.factor,
        ingredient_id=payload.ingredient_id,
    )
    conversion = UnitConversion.objects.select_related(
        "from_unit", "to_unit", "ingredient"
    ).get(pk=conversion.pk)

    return UnitConversionOut(
        id=conversion.id,
        from_unit_id=conversion.from_unit_id,
        from_unit_name=conversion.from_unit.name,
        to_unit_id=conversion.to_unit_id,
        to_unit_name=conversion.to_unit.name,
        factor=float(conversion.factor),
        ingredient_id=conversion.ingredient_id,
        ingredient_name=conversion.ingredient.name if conversion.ingredient else None,
    )


@unit_conversion_router.delete("/{conversion_id}/")
def delete_unit_conversion(request, conversion_id: int) -> dict:
    """Delete a unit conversion."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")

    deleted, _ = UnitConversion.objects.filter(id=conversion_id).delete()
    if not deleted:
        raise HttpError(404, "Umrechnung nicht gefunden")
    return {"success": True}
