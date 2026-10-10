"""Unit handling for ingredient MealItems (portion, standard measure, g/ml).

Every ingredient entry stores exactly one unit kind. These helpers validate
incoming unit choices, map legacy measuring units and copy units between
items so all write paths (add, wizard, ref meal, copy, sync) agree.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from ninja.errors import HttpError

from supply.services.portion_resolution import is_direct_metric_portion
from supply.services.quantity_units import (
    GRAM_UNIT_NAMES,
    MILLILITER_UNIT_NAMES,
    is_valid_standard_measure_key,
)

if TYPE_CHECKING:
    from planner.models import MealItem
    from supply.models import Ingredient, MeasuringUnit, Portion

# Legacy measuring-unit names that are really standard measures.
STANDARD_MEASURE_UNIT_NAMES: dict[str, str] = {
    "el": "el",
    "esslöffel": "el",
    "essloeffel": "el",
    "tl": "tl",
    "teelöffel": "tl",
    "teeloeffel": "tl",
    "tasse": "tasse",
    "prise": "prise",
    "msp": "msp",
    "messerspitze": "msp",
}


@dataclass(frozen=True)
class UnitFields:
    portion: Portion | None
    standard_measure_key: str
    measuring_unit: MeasuringUnit | None

    def as_kwargs(self) -> dict[str, Any]:
        return {
            "portion": self.portion,
            "standard_measure_key": self.standard_measure_key,
            "measuring_unit": self.measuring_unit,
        }


NO_UNIT = UnitFields(None, "", None)


def _unit_by_name(name: str) -> MeasuringUnit | None:
    from supply.models import MeasuringUnit

    return MeasuringUnit.objects.filter(name__iexact=name).order_by("id").first()


def _portion_of(ingredient: Ingredient, portion_id: int) -> Portion:
    portion = ingredient.portions.active().filter(id=portion_id).select_related("measuring_unit").first()
    if portion is None:
        raise HttpError(422, "Die Portion gehört nicht zu dieser Zutat")
    return portion


def _standard(key: str) -> UnitFields:
    if not is_valid_standard_measure_key(key):
        raise HttpError(422, f"Unbekanntes Standardmaß „{key}“.")
    return UnitFields(None, key, None)


def resolve_unit_fields(
    ingredient: Ingredient | None,
    *,
    portion_id: int | None = None,
    standard_measure_key: str | None = None,
    measuring_unit_id: int | None = None,
    kind: str | None = None,
) -> UnitFields:
    """Validate a unit choice for an ingredient entry and return the fields to store.

    Raises HttpError(422) for contradicting or unknown units. Recipe entries
    (no ingredient) carry no unit.
    """
    if ingredient is None:
        return NO_UNIT
    if portion_id and standard_measure_key:
        raise HttpError(422, "Bitte entweder eine Portion oder ein Standardmaß angeben, nicht beides.")

    if kind == "portion" or (kind is None and portion_id):
        if not portion_id:
            raise HttpError(422, "Für die Einheit „Portion“ fehlt die Portion.")
        portion = _portion_of(ingredient, portion_id)
        if is_direct_metric_portion(portion):
            # The "g"/"ml" base portion is a plain metric amount, not a count.
            return unit_fields_for_measuring_unit(ingredient, portion.measuring_unit)
        return UnitFields(portion, "", None)
    if kind == "standard" or (kind is None and standard_measure_key):
        return _standard(standard_measure_key or "")
    if kind == "grams":
        return UnitFields(None, "", _unit_by_name("Gramm"))
    if kind == "milliliters":
        return UnitFields(None, "", _unit_by_name("Milliliter"))

    if not measuring_unit_id:
        return UnitFields(None, "", _unit_by_name("Gramm"))

    from supply.models import MeasuringUnit

    unit = MeasuringUnit.objects.filter(id=measuring_unit_id).first()
    if unit is None:
        raise HttpError(422, "Einheit nicht gefunden.")
    return unit_fields_for_measuring_unit(ingredient, unit)


def unit_fields_for_measuring_unit(ingredient: Ingredient, unit: MeasuringUnit) -> UnitFields:
    """Map a measuring unit to the stored unit kind (legacy clients and data)."""
    name = (unit.name or "").strip().lower()
    if name in GRAM_UNIT_NAMES or name in MILLILITER_UNIT_NAMES:
        return UnitFields(None, "", unit)
    if name in STANDARD_MEASURE_UNIT_NAMES:
        return UnitFields(None, STANDARD_MEASURE_UNIT_NAMES[name], None)
    portion = ingredient.portions.active().filter(measuring_unit=unit).order_by("rank", "id").first()
    if portion is None:
        raise HttpError(422, f"Einheit {unit.name} ist für {ingredient.name} nicht definiert.")
    return UnitFields(portion, "", None)


def copy_unit_fields(item: MealItem) -> dict[str, Any]:
    """Quantity and unit of an item, for creating a copy with identical meaning."""
    return {
        "quantity": item.quantity,
        "portion": item.portion,
        "standard_measure_key": item.standard_measure_key,
        "measuring_unit": item.measuring_unit,
    }


def unit_label(item: MealItem) -> str:
    """Short unit label of an ingredient entry ("Stück", "EL", "g", "ml")."""
    from supply.services.quantity_units import resolve_unit

    return resolve_unit(
        portion=item.portion,
        standard_measure_key=item.standard_measure_key,
        measuring_unit=item.measuring_unit,
    ).label
