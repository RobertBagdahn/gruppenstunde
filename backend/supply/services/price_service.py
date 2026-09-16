"""Price calculation service.

Simplified: Only provides price calculation from Ingredient.price_per_kg.
The Price model has been removed — price_per_kg on Ingredient is the sole price field.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supply.models import Ingredient


def is_missing_price(price) -> bool:
    """Return whether a price counts as missing.

    Centralized semantics: ``None`` and ``0`` (and any non-positive or
    non-numeric value) mean missing; positive values are priced.
    """
    if price is None:
        return True
    try:
        return Decimal(str(price)) <= 0
    except (TypeError, ValueError, InvalidOperation):
        return True


def price_or_none(price) -> Decimal | None:
    """Return the price as Decimal if it is a positive value, else None."""
    if is_missing_price(price):
        return None
    return Decimal(str(price))


def get_portion_price(ingredient: Ingredient, weight_g: float) -> Decimal | None:
    """Calculate price for a given weight based on ingredient's price_per_kg."""
    price = price_or_none(getattr(ingredient, "price_per_kg", None))
    if price is None or weight_g is None or weight_g <= 0:
        return None
    return (price * Decimal(str(weight_g)) / Decimal("1000")).quantize(Decimal("0.01"))
