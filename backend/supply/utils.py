"""Shared formatting utilities for the supply and food domain."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supply.models.ingredient import Ingredient, Package, Portion


def _round_half_up(value: float, step: float = 1) -> float:
    """Commercial rounding (0.5 rounds up), unlike Python's banker's round()."""
    return math.floor(value / step + 0.5) * step


def format_weight(grams: float) -> str:
    """Format a *computed* weight value (in grams) for German-locale display.

    Rounds — never use this for a portion's own defined weight (see
    ``format_exact_weight``). Tiers, all with a space before the unit:
        < 1g    → mg  (e.g. "300 mg")
        1–49g   → 1g steps (e.g. "12 g")
        50–99g  → 5g steps (e.g. "55 g")
        100–999g → 10g steps (e.g. "150 g")
        ≥ 1000g → kg with 1 decimal, comma separator (e.g. "1,5 kg")
    """
    if grams <= 0:
        return "0 g"
    if grams < 1:
        mg = _round_half_up(grams * 1000)
        return f"{int(mg)} mg"
    if grams >= 1000:
        kg = grams / 1000
        # Always 1 decimal, German locale: dot → comma
        return f"{kg:.1f} kg".replace(".", ",")
    if grams >= 100:
        rounded = _round_half_up(grams, 10)
        return f"{int(rounded)} g"
    if grams >= 50:
        rounded = _round_half_up(grams, 5)
        return f"{int(rounded)} g"
    return f"{int(_round_half_up(grams))} g"


def format_exact_weight(grams: float) -> str:
    """Format a portion's *defined* weight (e.g. "à 125 g") without rounding.

    Only the display representation is rounded (at most one decimal, German
    comma); the underlying value is never altered. Use this wherever a
    weight is a fact about the portion, not a computed total.
    """
    if grams <= 0:
        return "0 g"
    if grams < 1:
        return f"{grams * 1000:.0f} mg"
    if grams >= 1000:
        kg = grams / 1000
        return f"{kg:.1f} kg".replace(".", ",") if kg != int(kg) else f"{int(kg)} kg"
    if grams == int(grams):
        return f"{int(grams)} g"
    return f"{grams:.1f} g".replace(".", ",")


def _format_quantity(quantity: float) -> str:
    """Format a portion quantity for German-locale display.

    Whole numbers are shown without decimals; fractions use a comma,
    rounded to 1 decimal place.
    """
    rounded = round(quantity, 1)
    if rounded == int(rounded):
        return str(int(rounded))
    return f"{rounded:.1f}".replace(".", ",")


def build_portion_display(
    quantity: float,
    portion: Portion,
    ingredient: Ingredient | None = None,
) -> tuple[str, bool]:
    """Build the combined portion display string and missing-weight flag.

    Returns:
        (display_str, has_missing_weight)

    Format: "{quantity} {unit_name} {ingredient_name} ({weight})"
    Special cases:
        - piece-like portion names (e.g. "Stück", "kleines Brötchen") omit the
          measuring-unit name — the portion name carries the semantics
        - measuring_unit.name == "Stück" → unit_name omitted
        - weight_g is None or not trusted → no weight clause,
          has_missing_weight=True
        - ingredient.name missing → fall back to slug or portion.name
        - portion.quantity != 1 (composite/pre-scaled portion, e.g. "1 Portion
          Nudeln" = 125g): the portion's own name is used as the entire label
          instead of "{measuring_unit} {ingredient_name}". Using the underlying
          measuring_unit name (often "Gramm") here would be misleading, since
          `quantity` is a count of that portion, not a gram amount — same bug
          class as recipe #434. Pre-weighed gram portions ("100g Reis",
          quantity=1, unit=Gramm, weight_g=100) are treated the same way.
    """
    from supply.services.portion_resolution import (
        is_piece_like_name,
        is_pre_weighed_metric_portion,
        resolve_trusted_weight,
    )

    # Pre-weighed gram portions ("100g Reis") are counts, labeled by their own name.
    is_composite = bool(portion and portion.quantity and portion.quantity != 1) or is_pre_weighed_metric_portion(
        portion
    )
    is_piece = bool(portion and is_piece_like_name(portion.name))

    # Compute total weight (trusted weights only — unconfirmed piece weights
    # must never be shown as a precise gram amount)
    weight_g: float | None = None
    has_missing_weight = False
    if portion:
        trusted = resolve_trusted_weight(portion)
        if trusted is not None:
            weight_g = quantity * trusted
        else:
            has_missing_weight = True

    # Build quantity string
    qty_str = _format_quantity(quantity)

    if is_composite or is_piece:
        parts = [qty_str]
        portion_name = getattr(portion, "name", "") or ""
        if portion_name:
            parts.append(portion_name)
    else:
        # Resolve ingredient name (with slug fallback)
        ingredient_name = ""
        if ingredient:
            ingredient_name = ingredient.name or ingredient.slug or ""
        if not ingredient_name and portion:
            ingredient_name = getattr(portion, "name", "") or ""

        # Resolve unit name – suppress "Stück"
        unit_name = ""
        if portion and portion.measuring_unit:
            mu_name = portion.measuring_unit.name or ""
            if mu_name.lower() != "stück":
                unit_name = mu_name

        parts = [qty_str]
        if unit_name:
            parts.append(unit_name)
        if ingredient_name:
            parts.append(ingredient_name)

    base = " ".join(parts)

    if weight_g is not None:
        return f"{base} ({format_weight(weight_g)})", has_missing_weight
    return base, has_missing_weight


def get_shopping_portion(ingredient: Ingredient) -> Package | None:
    """Get the default package for shopping list display.

    Returns the rank=1 (default) package for this ingredient.
    """
    try:
        return ingredient.packages.filter(deleted_at__isnull=True, rank=1).first()
    except Exception:
        return None


# A package count may be rounded *down* when the remainder is at most this
# share of a package — the shopping reserve factor covers the small gap.
PACKAGE_ROUND_DOWN_TOLERANCE = 0.05


def compute_package_need(quantity_g: float, package_weight_g: float | None) -> tuple[int, float] | None:
    """How many packages of ``package_weight_g`` cover ``quantity_g``.

    ``quantity_g`` already includes the plan's reserve factor, so no further
    surcharge is applied. If the fractional part is at most 5 % of a package,
    round down (the shortfall is within the reserve), otherwise round up;
    always at least one package.

    Returns ``(count, surplus_g)`` where ``surplus_g`` is ``count × weight −
    quantity`` (negative when rounded down), or ``None`` without valid inputs.
    """
    if not quantity_g or quantity_g <= 0 or not package_weight_g or package_weight_g <= 0:
        return None
    exact = quantity_g / package_weight_g
    whole = math.floor(exact)
    count = whole if exact - whole <= PACKAGE_ROUND_DOWN_TOLERANCE + 1e-9 else whole + 1
    count = max(1, count)
    surplus_g = round(count * package_weight_g - quantity_g, 1)
    return count, surplus_g


def shopping_quantity(quantity_g: float, ingredient: Ingredient | None) -> tuple[float, str]:
    """Shopping quantity in its display unit.

    Beverages and liquids are converted to millilitres via ``physical_density``
    (g/ml); everything else stays in grams.
    """
    from supply.choices import LIQUID_VISCOSITIES

    if ingredient is not None and ingredient.physical_viscosity in LIQUID_VISCOSITIES:
        density = ingredient.physical_density or 0
        if density > 0:
            return float(round(quantity_g / density)), "ml"
    return quantity_g, "g"
