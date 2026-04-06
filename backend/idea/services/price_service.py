"""Price cascade service.

When a Price is created or updated, the cascade propagates:
1. Calculate price_per_kg from the price
2. Update Ingredient.price_per_kg with the cheapest price
3. Update all Portion.price_eur for the ingredient
4. (Future) Update RecipeItem prices and recipe totals
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from idea.models import Ingredient, Price


def calculate_price_per_kg(price: "Price") -> Decimal | None:
    """Calculate price per kg from a Price record.

    Formula: price_eur / (weight_g * quantity) * 1000
    """
    portion = price.portion
    weight_g = portion.weight_g or 0
    if weight_g <= 0 or price.quantity <= 0:
        return None

    total_weight_g = weight_g * price.quantity
    return Decimal(str(float(price.price_eur) / total_weight_g * 1000)).quantize(Decimal("0.01"))


def run_price_cascade(price: "Price") -> None:
    """Run the full price cascade from a Price change.

    Steps:
    1. Find cheapest price_per_kg across all prices of the ingredient
    2. Update Ingredient.price_per_kg
    3. Recalculate all Portion price_eur values
    """
    from idea.models import Price as PriceModel

    portion = price.portion
    ingredient = portion.ingredient

    # Step 1: Find cheapest price_per_kg across all prices of this ingredient
    all_prices = PriceModel.objects.filter(portion__ingredient=ingredient).select_related("portion")

    cheapest_per_kg = None
    for p in all_prices:
        pkg = calculate_price_per_kg(p)
        if pkg is not None and (cheapest_per_kg is None or pkg < cheapest_per_kg):
            cheapest_per_kg = pkg

    # Step 2: Update ingredient
    ingredient.price_per_kg = cheapest_per_kg
    ingredient.save(update_fields=["price_per_kg"])

    # Step 3: Recalculate portion prices (not stored on model, calculated on the fly)
    # The spec mentions Portion.price_eur but our model doesn't have that field.
    # It's calculated on-the-fly: price_per_kg * weight_g / 1000


def get_portion_price(ingredient: "Ingredient", weight_g: float) -> Decimal | None:
    """Calculate price for a given weight based on ingredient's price_per_kg."""
    if ingredient.price_per_kg is None or weight_g is None or weight_g <= 0:
        return None
    return (ingredient.price_per_kg * Decimal(str(weight_g)) / Decimal("1000")).quantize(Decimal("0.01"))
