"""Units for buffet role amounts ("2 Stück pro Person" instead of "140 g").

A role amount can be entered in a unit shared by all ingredients of the role: a portion name such as
"Stück" or a standard measure such as "EL". Each ingredient converts the unit with its own weight
(60 g and 80 g rolls), so grams per item are `count × share × weight_of_unit(item)`.
Unit keys are `grams`, `milliliters`, `standard:<key>` and `portion:<normalized portion name>`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from supply.data.standard_measures import STANDARD_MEASURES
from supply.services.portion_resolution import (
    is_direct_metric_portion,
    normalize_portion_name,
    resolve_trusted_weight,
)
from supply.services.quantity_units import STANDARD_MEASURE_LABELS, portion_label, standard_measure_grams

METRIC_KEYS = ("grams", "milliliters")


@dataclass(frozen=True)
class RoleUnitOption:
    key: str
    kind: str  # "portion" | "standard"
    label: str


def is_metric_key(key: str | None) -> bool:
    return not key or key in METRIC_KEYS


def _active_portions(ingredient: Any) -> list[Any]:
    return list(ingredient.portions.active().select_related("measuring_unit").order_by("rank", "name"))


def unit_weight_g(ingredient: Any, key: str) -> float | None:
    """Grams of one `key` unit for this ingredient, or None when it does not have that unit."""
    if key.startswith("standard:"):
        grams, _approx = standard_measure_grams(ingredient, key.split(":", 1)[1])
        return float(grams) if grams > 0 else None
    if key.startswith("portion:"):
        wanted = key.split(":", 1)[1]
        for portion in _active_portions(ingredient):
            if is_direct_metric_portion(portion) or normalize_portion_name(portion.name) != wanted:
                continue
            weight = resolve_trusted_weight(portion)
            if weight is not None:
                return float(weight)
    return None


def unit_portion(ingredient: Any, key: str) -> Any | None:
    """The ingredient's portion behind a `portion:` key (for saving the item in that unit)."""
    if not key.startswith("portion:"):
        return None
    wanted = key.split(":", 1)[1]
    for portion in _active_portions(ingredient):
        if (
            not is_direct_metric_portion(portion)
            and normalize_portion_name(portion.name) == wanted
            and resolve_trusted_weight(portion) is not None
        ):
            return portion
    return None


def ingredient_unit_options(ingredient: Any) -> dict[str, RoleUnitOption]:
    """Natural units of one ingredient keyed by unit key (portions with trusted weight, standard measures)."""
    options: dict[str, RoleUnitOption] = {}
    for portion in _active_portions(ingredient):
        if is_direct_metric_portion(portion) or resolve_trusted_weight(portion) is None:
            continue
        key = f"portion:{normalize_portion_name(portion.name)}"
        options.setdefault(key, RoleUnitOption(key, "portion", portion_label(portion)))
    for measure in STANDARD_MEASURES:
        grams, _approx = standard_measure_grams(ingredient, measure.key)
        if grams > 0:
            key = f"standard:{measure.key}"
            options[key] = RoleUnitOption(key, "standard", STANDARD_MEASURE_LABELS[measure.key])
    return options


def common_unit_options(ingredients: list[Any]) -> list[RoleUnitOption]:
    """Units every ingredient of the role has (empty for an empty role)."""
    if not ingredients:
        return []
    per_ingredient = [ingredient_unit_options(ingredient) for ingredient in ingredients]
    common_keys = set(per_ingredient[0])
    for options in per_ingredient[1:]:
        common_keys &= set(options)
    first = per_ingredient[0]
    ordered = [first[key] for key in first if key in common_keys]
    return sorted(ordered, key=lambda option: 0 if option.kind == "portion" else 1)
