"""Unit conversion API endpoints."""

from django.db.models import Q
from ninja import Query, Router
from ninja.errors import HttpError

from supply.models import MeasuringUnit, UnitConversion
from supply.schemas.unit_conversion import (
    AvailableConversionBatchItemOut,
    AvailableConversionBatchOut,
    AvailableConversionBatchRequestItem,
    AvailableConversionItemOut,
    AvailableConversionsOut,
    UnitConversionCreateIn,
    UnitConversionOut,
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
    qs = UnitConversion.objects.select_related("from_unit", "to_unit", "ingredient")

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
    conversion = UnitConversion.objects.select_related("from_unit", "to_unit", "ingredient").get(pk=conversion.pk)

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


def _get_available_conversions(
    ingredient_id: int | None,
    from_unit_id: int,
    quantity: float,
) -> tuple[str, list[AvailableConversionItemOut]]:
    """Compute all available unit conversions for an ingredient+unit pair."""
    from_unit = MeasuringUnit.objects.filter(id=from_unit_id).first()
    if not from_unit:
        return "", []

    # Only convert mass/volume units (g/ml)
    convertible_types = {"g", "ml"}
    if from_unit.unit not in convertible_types:
        return from_unit.name, []

    # Get all conversions FROM this unit
    conversions_qs = UnitConversion.objects.filter(from_unit_id=from_unit_id).select_related("to_unit")

    if ingredient_id:
        conversions_qs = conversions_qs.filter(Q(ingredient_id=ingredient_id) | Q(ingredient__isnull=True))
    else:
        conversions_qs = conversions_qs.filter(ingredient__isnull=True)

    # Also get conversions TO this unit (reverse: if 1 Ta = 250g, then g→Ta = 1/250)
    reverse_qs = UnitConversion.objects.filter(to_unit_id=from_unit_id).select_related("from_unit")

    if ingredient_id:
        reverse_qs = reverse_qs.filter(Q(ingredient_id=ingredient_id) | Q(ingredient__isnull=True))
    else:
        reverse_qs = reverse_qs.filter(ingredient__isnull=True)

    # Build results, preferring ingredient-specific over generic
    results: dict[int, AvailableConversionItemOut] = {}

    # Forward conversions
    for conv in conversions_qs:
        to_id = conv.to_unit_id
        is_specific = conv.ingredient_id is not None
        if to_id not in results or (is_specific and not results[to_id].is_ingredient_specific):
            results[to_id] = AvailableConversionItemOut(
                to_unit_id=to_id,
                to_unit_name=conv.to_unit.name,
                quantity=round(quantity * float(conv.factor), 2),
                is_ingredient_specific=is_specific,
            )

    # Reverse conversions (invert factor)
    for conv in reverse_qs:
        to_id = conv.from_unit_id
        is_specific = conv.ingredient_id is not None
        if to_id not in results or (is_specific and not results[to_id].is_ingredient_specific):
            factor = 1.0 / float(conv.factor) if float(conv.factor) != 0 else 0
            results[to_id] = AvailableConversionItemOut(
                to_unit_id=to_id,
                to_unit_name=conv.from_unit.name,
                quantity=round(quantity * factor, 2),
                is_ingredient_specific=is_specific,
            )

    return from_unit.name, list(results.values())


@unit_conversion_router.get("/available/", response=AvailableConversionsOut)
def available_conversions(
    request,
    from_unit_id: int = Query(...),
    quantity: float = Query(...),
    ingredient_id: int | None = Query(None),
) -> AvailableConversionsOut:
    """Get all available unit conversions for an ingredient+unit pair."""
    from_unit_name, conversions = _get_available_conversions(ingredient_id, from_unit_id, quantity)
    return AvailableConversionsOut(
        from_unit_id=from_unit_id,
        from_unit_name=from_unit_name,
        original_quantity=quantity,
        conversions=conversions,
    )


@unit_conversion_router.post("/available/batch/", response=AvailableConversionBatchOut)
def available_conversions_batch(
    request,
    items: list[AvailableConversionBatchRequestItem],
) -> AvailableConversionBatchOut:
    """Get available conversions for multiple ingredient+unit pairs at once."""
    result_items: list[AvailableConversionBatchItemOut] = []

    for item in items:
        from_unit_name, conversions = _get_available_conversions(item.ingredient_id, item.from_unit_id, item.quantity)
        result_items.append(
            AvailableConversionBatchItemOut(
                ingredient_id=item.ingredient_id,
                from_unit_id=item.from_unit_id,
                from_unit_name=from_unit_name,
                original_quantity=item.quantity,
                conversions=conversions,
            )
        )

    return AvailableConversionBatchOut(items=result_items)


@unit_conversion_router.delete("/{conversion_id}/")
def delete_unit_conversion(request, conversion_id: int) -> dict:
    """Delete a unit conversion."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")

    deleted, _ = UnitConversion.objects.filter(id=conversion_id).delete()
    if not deleted:
        raise HttpError(404, "Umrechnung nicht gefunden")
    return {"success": True}
