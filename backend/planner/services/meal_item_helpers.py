"""Shared helpers for MealItem energy/cost calculations."""


def resolve_ingredient_energy_kcal(item) -> float | None:
    """Compute total energy kcal for an ingredient-based MealItem.

    The formula:
        weight_g = quantity × portion.weight_g  (or direct grams if unit is "g")
        energy = (ingredient.energy_kcal / 100) × weight_g × item.factor

    This returns the TOTAL energy contribution of this item to the meal
    (not per-person — ingredient quantity is already the total meal quantity).
    """
    if not item.ingredient or item.ingredient.energy_kcal is None:
        return None
    weight_g = _resolve_ingredient_weight_g(item)
    if weight_g <= 0:
        return None
    return (float(item.ingredient.energy_kcal) / 100.0) * weight_g * item.factor


def resolve_ingredient_cost_eur(item) -> float | None:
    """Compute total cost for an ingredient-based MealItem."""
    if not item.ingredient or item.ingredient.price_per_kg is None:
        return None
    weight_g = _resolve_ingredient_weight_g(item)
    if weight_g <= 0:
        return None
    return (float(item.ingredient.price_per_kg) / 1000.0) * weight_g * item.factor


def _resolve_ingredient_weight_g(item) -> float:
    """Resolve the total weight in grams for an ingredient-based MealItem.

    Supports three paths:
    1. If measuring_unit matches a portion → portion.weight_g × quantity
    2. If measuring_unit name is "g" → quantity directly (grams)
    3. If measuring_unit name is "ml" → quantity × density
    """
    if not item.quantity or not item.measuring_unit:
        return 0.0

    portion = item.ingredient.portions.filter(
        measuring_unit=item.measuring_unit
    ).first()
    if portion and portion.weight_g:
        return portion.weight_g * float(item.quantity)
    if item.measuring_unit.name.lower() == "g":
        return float(item.quantity)
    if item.measuring_unit.name.lower() == "ml":
        if item.ingredient.density is not None:
            return float(item.quantity) * item.ingredient.density
    return 0.0
