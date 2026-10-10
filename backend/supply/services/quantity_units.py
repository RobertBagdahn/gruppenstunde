"""Single source of truth for ingredient quantity units.

An ingredient entry stores what the user meant: a count times one unit
(grams, milliliters, a portion of the ingredient or a standard kitchen
measure). Grams are always derived from that with the functions below, so
nutrition, cost, shopping and display agree everywhere (see openspec change
`switchable-quantity-units`).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from supply.data.standard_measures import STANDARD_MEASURES, StandardMeasure
from supply.services.portion_resolution import is_direct_metric_portion, resolve_trusted_weight

if TYPE_CHECKING:
    from supply.models import Ingredient, MeasuringUnit, Portion

UnitKind = Literal["grams", "milliliters", "portion", "standard"]

GRAM_UNIT_NAMES = ("g", "gramm")
MILLILITER_UNIT_NAMES = ("ml", "milliliter")

STANDARD_MEASURE_LABELS: dict[str, str] = {
    "el": "EL",
    "tl": "TL",
    "tasse": "Tasse",
    "prise": "Prise",
    "msp": "Msp",
}
STANDARD_MEASURES_BY_KEY: dict[str, StandardMeasure] = {measure.key: measure for measure in STANDARD_MEASURES}


@dataclass(frozen=True)
class GramResult:
    """Resolved weight of an ingredient entry."""

    grams: float
    is_approx: bool
    missing: bool


@dataclass(frozen=True)
class UnitInfo:
    """Kind and label of the unit an entry is stored in."""

    kind: UnitKind | None
    label: str


@dataclass(frozen=True)
class UnitOption:
    """One unit a user may view or enter an ingredient amount in."""

    key: str
    kind: UnitKind
    label: str
    grams_per_unit: float | None
    is_approx: bool
    has_weight: bool
    portion_id: int | None = None
    measuring_unit_id: int | None = None
    standard_measure_key: str | None = None


def is_valid_standard_measure_key(key: str | None) -> bool:
    return bool(key) and key in STANDARD_MEASURES_BY_KEY


def _density(ingredient: Ingredient | None) -> tuple[float, bool]:
    """Return (density, is_explicit). 1.0 counts as "not explicitly set"."""
    density = float(getattr(ingredient, "physical_density", None) or 0)
    if density > 0 and density != 1.0:
        return density, True
    return 1.0, False


def standard_measure_grams(ingredient: Ingredient | None, key: str) -> tuple[float, bool]:
    """Grams of one standard measure for an ingredient and whether it is approximate."""
    measure = STANDARD_MEASURES_BY_KEY[key]
    if measure.volume_ml is not None:
        density, explicit = _density(ingredient)
        return round(measure.volume_ml * density, 4), not explicit
    return float(measure.grams or 0.0), True


def unit_kind_of_measuring_unit(measuring_unit: MeasuringUnit | None) -> UnitKind | None:
    if measuring_unit is None:
        return None
    name = (measuring_unit.name or "").strip().lower()
    if name in GRAM_UNIT_NAMES:
        return "grams"
    if name in MILLILITER_UNIT_NAMES:
        return "milliliters"
    return None


def portion_label(portion: Portion) -> str:
    return portion.name or (portion.measuring_unit.name if portion.measuring_unit else "") or "Portion"


def resolve_unit(
    *,
    portion: Portion | None,
    standard_measure_key: str | None,
    measuring_unit: MeasuringUnit | None,
) -> UnitInfo:
    """Return the stored unit of an entry (no DB access beyond loaded relations)."""
    if portion is not None:
        return UnitInfo("portion", portion_label(portion))
    if standard_measure_key:
        return UnitInfo("standard", STANDARD_MEASURE_LABELS.get(standard_measure_key, standard_measure_key))
    kind = unit_kind_of_measuring_unit(measuring_unit)
    if kind == "grams":
        return UnitInfo("grams", "g")
    if kind == "milliliters":
        return UnitInfo("milliliters", "ml")
    if measuring_unit is not None:
        # Legacy rows with another measuring unit; normalized by `normalize_meal_item_units`.
        return UnitInfo(None, measuring_unit.name)
    return UnitInfo(None, "")


def resolve_grams(
    *,
    ingredient: Ingredient | None,
    quantity: float | None,
    portion: Portion | None,
    standard_measure_key: str | None,
    measuring_unit: MeasuringUnit | None,
) -> GramResult | None:
    """Resolve grams for portion, standard-measure, gram and milliliter entries.

    Returns None for legacy entries whose unit is neither of those, so callers
    can keep their own fallback until the data is normalized.
    """
    if not quantity:
        return GramResult(0.0, False, False)
    count = float(quantity)

    if portion is not None:
        if getattr(portion, "deleted_at", None) is not None:
            return GramResult(0.0, False, True)
        weight = resolve_trusted_weight(portion)
        if weight is None:
            return GramResult(0.0, False, True)
        return GramResult(weight * count, False, False)

    if standard_measure_key:
        if not is_valid_standard_measure_key(standard_measure_key):
            return GramResult(0.0, False, True)
        grams, approx = standard_measure_grams(ingredient, standard_measure_key)
        return GramResult(grams * count, approx, False)

    kind = unit_kind_of_measuring_unit(measuring_unit)
    if kind == "grams":
        return GramResult(count, False, False)
    if kind == "milliliters":
        density, explicit = _density(ingredient)
        return GramResult(count * density, not explicit, False)
    return None


def unit_options(ingredient: Ingredient, portions: list[Portion] | None = None) -> list[UnitOption]:
    """All units an ingredient amount can be shown or entered in.

    Order: ingredient portions (by rank), standard measures, grams (and
    milliliters). Direct metric portions ("g") are covered by the gram option.
    """
    if portions is None:
        portions = list(ingredient.portions.active().select_related("measuring_unit"))
    options: list[UnitOption] = []
    for portion in sorted(portions, key=lambda p: (p.rank, p.name or "")):
        if getattr(portion, "deleted_at", None) is not None or getattr(portion, "superseded_by_id", None):
            continue
        if is_direct_metric_portion(portion):
            continue
        weight = resolve_trusted_weight(portion)
        options.append(
            UnitOption(
                key=f"portion:{portion.pk}",
                kind="portion",
                label=portion_label(portion),
                grams_per_unit=weight,
                is_approx=False,
                has_weight=weight is not None,
                portion_id=portion.pk,
            )
        )
    for measure in STANDARD_MEASURES:
        grams, approx = standard_measure_grams(ingredient, measure.key)
        options.append(
            UnitOption(
                key=f"standard:{measure.key}",
                kind="standard",
                label=STANDARD_MEASURE_LABELS[measure.key],
                grams_per_unit=grams,
                is_approx=approx,
                has_weight=grams > 0,
                standard_measure_key=measure.key,
            )
        )
    from supply.models import MeasuringUnit

    metric_units = {
        (unit.name or "").strip().lower(): unit.id
        for unit in MeasuringUnit.objects.filter(
            name__in=["g", "G", "gramm", "Gramm", "ml", "ML", "milliliter", "Milliliter"]
        )
    }
    gram_unit_id = metric_units.get("g") or metric_units.get("gramm")
    milliliter_unit_id = metric_units.get("ml") or metric_units.get("milliliter")
    options.append(UnitOption("grams", "grams", "g", 1.0, False, True, measuring_unit_id=gram_unit_id))
    density, explicit = _density(ingredient)
    options.append(
        UnitOption(
            "milliliters", "milliliters", "ml", density, not explicit, True, measuring_unit_id=milliliter_unit_id
        )
    )
    return options


def start_portion(ingredient: Ingredient | None, portions: list[Portion] | None = None) -> Portion | None:
    """Default portion when adding an ingredient: lowest rank with a trusted weight, not "g"."""
    if portions is None:
        if ingredient is None:
            return None
        portions = list(ingredient.portions.active().select_related("measuring_unit"))
    for portion in sorted(portions, key=lambda p: (p.rank, p.name or "")):
        if getattr(portion, "deleted_at", None) is not None or getattr(portion, "superseded_by_id", None):
            continue
        if is_direct_metric_portion(portion):
            continue
        if resolve_trusted_weight(portion) is not None:
            return portion
    return None


def _format_count(value: float) -> str:
    rounded = round(value, 2)
    if abs(rounded - round(rounded)) < 1e-9:
        return str(round(rounded))
    return f"{rounded:.2f}".rstrip("0").rstrip(".").replace(".", ",")


def format_grams(grams: float) -> str:
    """German gram label with g/kg steps (mg below 1 g), commercial rounding."""
    from supply.utils import format_weight

    return format_weight(grams)


def format_amount(*, quantity: float, unit: UnitInfo, result: GramResult | None) -> str:
    """Display string: unit first, grams always visible.

    "0,5 Portion (15 g)", "1 TL (≈ 5 g)", "80 g", "250 ml (≈ 250 g)",
    "2 Stück (Gewicht fehlt)".
    """
    if unit.kind == "grams":
        return format_grams(quantity)
    count = _format_count(quantity)
    label = f"{count} {unit.label}".strip()
    if result is None or result.missing:
        return f"{label} (Gewicht fehlt)"
    approx = "≈ " if result.is_approx else ""
    return f"{label} ({approx}{format_grams(result.grams)})"
