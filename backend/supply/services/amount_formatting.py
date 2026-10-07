"""Server-side amount formatting for printed exports (meal plan / cooking PDFs).

A ``RecipeItem`` or ``MealItem`` quantity is a *multiplier of its portion*, not
a plain gram amount: "0,3 × 100g Gurke" is 30 g. Printing ``quantity`` next to
the measuring-unit name ("Gramm") understates such amounts by the portion
weight. These helpers always derive the real amount from the trusted portion
weight and mirror the shopping-list display of ``frontend-food``
(``shoppingItemDisplay.ts``): "1,3 kg · 3 × 500-g-Packung".
"""

from __future__ import annotations

import math
import re
from typing import TYPE_CHECKING

from supply.services.portion_resolution import (
    METRIC_UNIT_GRAMS,
    is_direct_metric_portion,
    is_piece_like_name,
    is_piece_like_unit_name,
    resolve_trusted_weight,
)
from supply.utils import format_exact_weight, format_weight

if TYPE_CHECKING:
    from supply.models import Portion
    from supply.services.shopping_service import ShoppingListItem

_VOLUME_UNIT_NAMES = frozenset({"ml", "milliliter", "l", "liter"})
_NAMED_COUNT_RE = re.compile(r"^(\d+(?:[.,]\d+)?)\s+(\D.*)$")
_WEIGHT_NAME_RE = re.compile(r"^\d+(?:[.,]\d+)?\s?(?:g|kg|ml|l)\b", re.IGNORECASE)
_TRAILING_PAREN_RE = re.compile(r"\s*\([^)]*\)\s*$")


def _decimal(value: float, max_decimals: int) -> str:
    """German decimal string without trailing zeros ("1,5", "12")."""
    text = f"{value:.{max_decimals}f}"
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text.replace(".", ",") or "0"


def format_cooking_weight(grams: float) -> str:
    """Format a cooking amount in grams, switching to kg from 1.000 g.

    Unlike ``format_weight`` (purchase rounding) this keeps the amount
    readable for the kitchen: "4,44 kg", "820 g", "5,3 g".
    """
    if grams <= 0:
        return "0 g"
    if grams >= 1000:
        return f"{_decimal(grams / 1000, 2)} kg"
    if grams >= 10:
        return f"{round(grams):d} g"
    return f"{_decimal(grams, 1)} g"


def format_cooking_volume(milliliters: float) -> str:
    """Format a cooking amount in millilitres, switching to l from 1.000 ml."""
    if milliliters <= 0:
        return "0 ml"
    if milliliters >= 1000:
        return f"{_decimal(milliliters / 1000, 2)} l"
    if milliliters >= 10:
        return f"{round(milliliters):d} ml"
    return f"{_decimal(milliliters, 1)} ml"


def _count_text(count: float) -> str:
    """Piece counts: one decimal below 10, whole numbers from 10."""
    return _decimal(count, 1 if count < 10 else 0)


def _unit_name(portion: Portion) -> str:
    unit = getattr(portion, "measuring_unit", None)
    return ((getattr(unit, "name", "") or "").strip().lower()) if unit else ""


def _piece_label(portion_name: str) -> tuple[float, str]:
    """Split a piece portion name into (pieces per portion, label).

    "1 Zwiebel" -> (1, "Zwiebel"), "Stück (400g)" -> (1, "Stück"),
    "6 Eier" -> (6, "Eier").
    """
    name = _TRAILING_PAREN_RE.sub("", portion_name.strip())
    named = _NAMED_COUNT_RE.match(name)
    if named:
        return float(named.group(1).replace(",", ".")), named.group(2).strip()
    return 1.0, name


def format_portion_amount(quantity: float, portion: Portion | None) -> str:
    """Format ``quantity`` × ``portion`` as a real amount.

    - no portion / plain metric portion ("Gramm", "ml", "kg", "l"): grams or ml
    - piece-like portion ("Stück", "1 Zwiebel"): pieces plus total weight
    - pre-weighed or canonical-unit portion ("100g Gurke", "EL"): total weight,
      or the portion count when its weight is not trusted
    """
    if quantity <= 0:
        return ""
    if portion is None:
        return format_cooking_weight(quantity)

    unit_name = _unit_name(portion)
    is_volume = unit_name in _VOLUME_UNIT_NAMES
    name = (portion.name or "").strip()

    if is_direct_metric_portion(portion):
        amount = quantity * METRIC_UNIT_GRAMS.get(unit_name, 1.0)
        return format_cooking_volume(amount) if is_volume else format_cooking_weight(amount)

    trusted = resolve_trusted_weight(portion)
    stored = getattr(portion, "weight_g", None)
    # Stückzahl und Gewicht erscheinen immer gemeinsam: ein gespeichertes, noch nicht
    # bestätigtes Stückgewicht wird nur als "≈"-Richtwert gezeigt, nie als exakter Wert. 1 g je Stück ist die bekannte Altlast und gilt als unbekannt.
    effective = trusted if trusted is not None else (stored if stored and stored > 1.0 else None)
    total_g = quantity * effective if effective is not None else None

    if is_piece_like_name(name) or (not name and is_piece_like_unit_name(unit_name)):
        per_portion, label = _piece_label(name or portion.measuring_unit.name)
        pieces = quantity * per_portion
        text = f"{_count_text(pieces)} {label}".strip()
        if total_g:
            text += f" (≈ {format_cooking_weight(total_g)})"
        return text

    if total_g is not None:
        return format_cooking_volume(total_g) if is_volume else format_cooking_weight(total_g)

    # Weight unknown: fall back to the portion count with its own name.
    label = name or (portion.measuring_unit.name if portion.measuring_unit else "")
    return f"{_decimal(quantity, 1)} × {label}".strip()


# ---------------------------------------------------------------------------
# Shopping list (mirror of frontend-food/src/lib/shoppingItemDisplay.ts)
# ---------------------------------------------------------------------------


def format_shopping_amount(quantity: float, unit: str) -> str:
    """Amount in the shopping display unit: "1,3 kg", "320 g", "9,1 l", "250 ml"."""
    if quantity <= 0:
        return ""
    if unit == "g":
        return format_weight(quantity)
    if unit == "ml":
        if quantity < 1000:
            return f"{round(quantity):d} ml"
        return f"{_decimal(math.floor(quantity / 100 + 0.5) / 10, 1)} l"
    return f"{_decimal(quantity, 1)} {unit}"


def _format_piece_equivalent(count: float, portion_name: str) -> str:
    """ "≈ 2,5 Scheiben" — a portion that names its own count is resolved."""
    name = portion_name.strip()
    if _WEIGHT_NAME_RE.match(name):
        return f"≈ {_count_text(count)} × {name}"
    per_portion, label = _piece_label(name)
    # Shoppers buy whole pieces, so the printed list rounds up.
    return f"≈ {math.ceil(round(count * per_portion, 6))} {label}"


def _format_package_label(package_name: str, weight_g: float, volume_ml: float | None) -> str:
    name = package_name.strip()
    if volume_ml is not None and volume_ml > 0:
        bare = re.sub(r"^\d+(?:[.,]\d+)?[-\s]?(?:kg|g|ml|l)\b[-\s]?", "", name, flags=re.IGNORECASE).strip()
        size = f"{_decimal(volume_ml / 1000, 2)} l" if volume_ml >= 1000 else f"{round(volume_ml):d} ml"
        return f"{size.replace(' ', '-')}-{bare or 'Packung'}"
    if re.search(r"\d", name):
        return name
    return f"{format_exact_weight(weight_g).replace(' ', '-')}-{name or 'Packung'}"


def format_shopping_item(item: ShoppingListItem) -> str:
    """ "8,8 kg · 18 × 500-g-Packung · ≈ 23 Stück" — weight first, then package need and piece count.

    Weight and pieces are always shown together when both are known.
    """
    amount = format_shopping_amount(item.quantity or item.total_quantity_g, item.unit)
    parts = [amount] if amount else []
    if item.package_options:
        option = item.package_options[0]
        label = _format_package_label(option["package_name"], option["weight_g"], option.get("volume_ml"))
        parts.append(f"{option['count']} × {label}")
    if item.piece_equivalent:
        parts.append(_format_piece_equivalent(item.piece_equivalent["count"], item.piece_equivalent["portion_name"]))
    return " · ".join(parts) if parts else "0 g"
