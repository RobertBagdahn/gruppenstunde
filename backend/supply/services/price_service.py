"""Price calculation service.

Simplified: Only provides price calculation from Ingredient.price_per_kg.
The Price model has been removed — price_per_kg on Ingredient is the sole price field.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supply.models import Ingredient


def get_portion_price(ingredient: "Ingredient", weight_g: float) -> Decimal | None:
    """Calculate price for a given weight based on ingredient's price_per_kg."""
    if ingredient.price_per_kg is None or weight_g is None or weight_g <= 0:
        return None
    return (ingredient.price_per_kg * Decimal(str(weight_g)) / Decimal("1000")).quantize(Decimal("0.01"))
