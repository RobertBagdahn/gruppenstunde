"""“Liste erstellen”: freeze the demand allocated to a planned trip as list entries."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError

from shopping.models import ShoppingList, ShoppingListItem, SourceType
from shopping.services.item_creation import SourceSpec, add_ingredient_items, write_sources
from shopping.services.material_items import PIECE_UNIT

from .allocation import Part
from .plan import compute_state, rows_for_parts, scale_part

ALREADY_CREATED_MESSAGE = "Diese Liste wurde schon erstellt."


def material_groups(parts: list[Part]) -> list[list[Part]]:
    """Scaled parts of the consumables, one group per material in name order."""
    by_material: dict[int, list[Part]] = {}
    for part in (scale_part(p) for p in parts):
        if part.unit.kind == "material" and part.unit.requirement is not None:
            by_material.setdefault(part.unit.subject_id, []).append(part)
    return sorted(by_material.values(), key=lambda ps: ps[0].unit.name.lower())


def material_specs(group: list[Part], scale: float = 1.0) -> list[SourceSpec]:
    return [
        SourceSpec(
            quantity_g=ref.amount * scale,
            recipe_id=ref.id,
            meal_id=part.unit.meal_id,
            recipe_name=ref.title,
            recipe_slug=ref.slug,
            meal_label=part.unit.meal_label,
        )
        for part in group
        for ref in part.unit.requirement.recipes
    ]


def add_material_entry(
    shopping_list: ShoppingList, group: list[Part], sort_order: int, scale: float = 1.0
) -> ShoppingListItem:
    """One entry per consumable; its sources name recipe and meal so the entry stays tied to its demand."""
    material = group[0].unit.requirement.material
    entry = ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        material=material,
        name=material.name,
        quantity_g=sum(p.unit.requirement.amount for p in group) * scale,
        unit=PIECE_UNIT,
        retail_section=material.retail_section,
        sort_order=sort_order,
    )
    write_sources(entry, material_specs(group, scale))
    return entry


def materialize(trip_id: int) -> ShoppingList:
    """Store the currently allocated demand of a planned trip; a second call is a conflict."""
    with transaction.atomic():
        trip = ShoppingList.objects.select_for_update(of=("self",)).select_related("event", "store").get(id=trip_id)
        if trip.event_id is None:
            raise HttpError(422, "Nur Einkäufe eines Events können aus dem Plan erstellt werden.")
        if trip.materialized_at is not None:
            raise HttpError(409, ALREADY_CREATED_MESSAGE)

        # Always computed fresh: the cached preview may be up to a plan change behind
        state = compute_state(trip.event)
        parts = state.allocation.by_trip[trip.id]
        ingredient_rows = [row.ingredient for row in rows_for_parts(parts) if row.ingredient is not None]

        # Manual entries stay where they are; generated ones are appended after them
        last = trip.items.order_by("-sort_order").values_list("sort_order", flat=True).first()
        start = 0 if last is None else last + 1
        added = add_ingredient_items(trip, ingredient_rows, start)
        for offset, group in enumerate(material_groups(parts)):
            add_material_entry(trip, group, start + added + offset)

        now = timezone.now()
        trip.materialized_at = now
        trip.plan_synced_at = now
        trip.source_type = SourceType.EVENT_TRIP
        trip.save(update_fields=["materialized_at", "plan_synced_at", "source_type", "updated_at"])
    return trip
