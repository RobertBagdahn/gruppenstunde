"""Shared helpers for MealItem energy/cost calculations."""


def resolve_ingredient_energy_kcal(item, effective_portions: float = 1.0) -> float | None:
    """Compute total energy kcal for an ingredient-based MealItem.

    The formula:
        weight_g = quantity × portion.weight_g  (or direct grams if unit is "g")
        energy = (ingredient.energy_kcal / 100) × weight_g × factor × effective_portions

    This returns the TOTAL energy contribution for ALL people,
    consistent with recipe items (which also multiply by effective_portions).
    """
    if not item.ingredient or item.ingredient.energy_kcal is None:
        return None
    weight_g = _resolve_ingredient_weight_g(item)
    if weight_g <= 0:
        return None
    return (float(item.ingredient.energy_kcal) / 100.0) * weight_g * item.factor * effective_portions


def resolve_ingredient_cost_eur(item, effective_portions: float = 1.0) -> float | None:
    """Compute total cost for an ingredient-based MealItem.

    Consistent with energy: multiplies by effective_portions for total cost.
    """
    if not item.ingredient or item.ingredient.price_per_kg is None:
        return None
    weight_g = _resolve_ingredient_weight_g(item)
    if weight_g <= 0:
        return None
    return (float(item.ingredient.price_per_kg) / 1000.0) * weight_g * item.factor * effective_portions


def _resolve_ingredient_weight_g(item) -> float:
    """Resolve the total weight in grams for an ingredient-based MealItem.

    Supports three paths:
    1. If measuring_unit matches a portion → portion.weight_g × quantity
    2. If measuring_unit name is "g" → quantity directly (grams)
    3. If measuring_unit name is "ml" → quantity × density
    """
    if not item.quantity or not item.measuring_unit:
        return 0.0

    name_lower = item.measuring_unit.name.lower()
    if name_lower == "g":
        return float(item.quantity)
    if name_lower == "ml":
        if item.ingredient.density is not None:
            return float(item.quantity) * item.ingredient.density
        return float(item.quantity)

    portion = item.ingredient.portions.filter(
        measuring_unit=item.measuring_unit
    ).first()
    if portion and portion.weight_g:
        return portion.weight_g * float(item.quantity)

    # Fallback: use default portion weight_g if available
    default_portions = item.ingredient.portions.filter(
        is_default=True, weight_g__isnull=False
    )
    if default_portions.exists():
        return float(default_portions.first().weight_g) * float(item.quantity)

    # Fallback: use standard_recipe_weight_g as per-portion estimate
    if item.ingredient.standard_recipe_weight_g:
        return float(item.ingredient.standard_recipe_weight_g) * float(item.quantity)

    return 0.0
