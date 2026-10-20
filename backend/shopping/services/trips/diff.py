"""Difference between a created trip and the plan, and applying it (“Änderungen übernehmen”)."""

from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError

from shopping.models import ShoppingList, ShoppingListItem
from shopping.services.item_creation import add_ingredient_items, specs_of, write_sources

from .materialize import add_material_entry, material_groups, material_specs
from .plan import TripRow, compute_state, rows_for_parts

TOLERANCE = 0.5  # grams / pieces; below this the stored two-decimal values and the plan agree

KIND_NEW = "new"
KIND_CHANGED = "changed"
KIND_REMOVED = "removed"


@dataclass
class DiffRow:
    kind: str
    subject_kind: str
    subject_id: int
    name: str
    unit: str
    snapshot_open: float
    snapshot_checked: float
    current: float


def _require_created_trip(trip: ShoppingList) -> None:
    if trip.event_id is None or trip.materialized_at is None:
        raise HttpError(422, "Nur erstellte Einkäufe eines Events haben eine Differenz zum Plan.")


def _current_quantity(row: TripRow) -> float:
    if row.ingredient is not None:
        return row.ingredient.total_quantity_g
    return row.material.amount if row.material else 0.0


def _generated_items(trip: ShoppingList) -> dict[tuple[str, int], list[ShoppingListItem]]:
    grouped: dict[tuple[str, int], list[ShoppingListItem]] = {}
    items = trip.items.filter(sources__isnull=False).distinct().order_by("id")
    for item in items:
        if item.ingredient_id is not None:
            grouped.setdefault(("ingredient", item.ingredient_id), []).append(item)
        elif item.material_id is not None:
            grouped.setdefault(("material", item.material_id), []).append(item)
    return grouped


def _diff(trip: ShoppingList, rows: list[TripRow]) -> list[DiffRow]:
    current = {(row.kind, row.subject_id): row for row in rows}
    generated = _generated_items(trip)
    result: list[DiffRow] = []
    for key in sorted(set(current) | set(generated), key=lambda k: (k[0], k[1])):
        items = generated.get(key, [])
        open_qty = sum(i.quantity_g for i in items if not i.is_checked)
        checked_qty = sum(i.quantity_g for i in items if i.is_checked)
        row = current.get(key)
        wanted = _current_quantity(row) if row else 0.0
        if abs(wanted - (open_qty + checked_qty)) <= TOLERANCE:
            continue
        if not items:
            kind = KIND_NEW
        elif wanted <= TOLERANCE:
            kind = KIND_REMOVED
        else:
            kind = KIND_CHANGED
        name = row.name if row else items[0].name
        result.append(
            DiffRow(
                kind,
                key[0],
                key[1],
                name,
                "Stück" if key[0] == "material" else "g",
                round(open_qty, 2),
                round(checked_qty, 2),
                round(wanted, 2),
            )
        )
    return result


def plan_diff(trip: ShoppingList) -> list[DiffRow]:
    _require_created_trip(trip)
    state = compute_state(trip.event)
    return _diff(trip, rows_for_parts(state.allocation.by_trip[trip.id]))


def apply_plan_diff(trip_id: int) -> ShoppingList:
    """Adjust only open generated entries; checked and manual entries are never touched."""
    with transaction.atomic():
        trip = ShoppingList.objects.select_for_update(of=("self",)).select_related("event").get(id=trip_id)
        _require_created_trip(trip)
        state = compute_state(trip.event)
        parts = state.allocation.by_trip[trip.id]
        rows = {(r.kind, r.subject_id): r for r in rows_for_parts(parts)}
        groups = {("material", g[0].unit.subject_id): g for g in material_groups(parts)}
        generated = _generated_items(trip)
        last = trip.items.order_by("-sort_order").values_list("sort_order", flat=True).first()
        next_sort = 0 if last is None else last + 1

        for diff in _diff(trip, list(rows.values())):
            key = (diff.subject_kind, diff.subject_id)
            items = generated.get(key, [])
            open_items = [i for i in items if not i.is_checked]
            missing = max(diff.current - diff.snapshot_checked, 0.0)
            if missing <= TOLERANCE:
                for item in open_items:
                    item.delete()
                continue
            scale = missing / diff.current
            if open_items:
                keep, *surplus = open_items
                for item in surplus:
                    item.delete()
                keep.quantity_g = missing
                keep.save(update_fields=["quantity_g", "updated_at"])
                keep.sources.all().delete()
                row = rows[key]
                specs = specs_of(row.ingredient, scale) if row.ingredient else material_specs(groups[key], scale)
                write_sources(keep, specs)
            elif key[0] == "ingredient":
                add_ingredient_items(trip, [rows[key].ingredient], next_sort, {key[1]: scale})
                next_sort += 1
            else:
                add_material_entry(trip, groups[key], next_sort, scale)
                next_sort += 1

        trip.plan_synced_at = timezone.now()
        trip.save(update_fields=["plan_synced_at", "updated_at"])
    return trip
