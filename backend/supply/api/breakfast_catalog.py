"""Breakfast catalog endpoint for the wizard.

Returns base ingredients (Basis-Zutaten) and topping ingredients (Belag-Zutaten)
with their portions, weights, and pricing information.
"""

from typing import Any

from django.db.models import Q
from ninja import Router, Schema

from supply.models import Ingredient, NutritionalTag, Portion

breakfast_catalog_router = Router(tags=["breakfast"])


# ============================================================================
# Schemas
# ============================================================================


class PortionOut(Schema):
    """A portion of an ingredient."""

    id: int
    name: str
    measuring_unit_id: int
    quantity: float
    weight_g: float | None = None
    is_default: bool = False
    priority: int = 0


class BaseIngredientOut(Schema):
    """Base bread ingredient for breakfast wizard."""

    id: int
    name: str
    slug: str
    is_standalone_food: bool = True
    standard_recipe_weight_g: float | None = None
    energy_kcal: float | None = None
    portions: list[PortionOut] = []


class ToppingIngredientOut(Schema):
    """Topping/spread ingredient for breakfast wizard."""

    id: int
    name: str
    slug: str
    is_standalone_food: bool = True
    energy_kcal: float | None = None
    price_per_kg: float | None = None
    portions: list[PortionOut] = []


class BreakfastCatalogOut(Schema):
    """Complete breakfast catalog response."""

    base_ingredients: list[BaseIngredientOut] = []
    topping_ingredients: list[ToppingIngredientOut] = []


# ============================================================================
# Endpoints
# ============================================================================


@breakfast_catalog_router.get("/breakfast-catalog/", response=BreakfastCatalogOut)
def get_breakfast_catalog(request) -> dict[str, Any]:
    """Get breakfast ingredients catalog (base + toppings with portions).

    Base ingredients include bread types with standard_recipe_weight_g (slice weight).
    Topping ingredients include spreads/condiments with three intensity portions
    (knapp, normal, üppig) plus packaging portion.

    Returns: {
        base_ingredients: [...],
        topping_ingredients: [...]
    }
    """
    # Get tags
    base_tag = NutritionalTag.objects.filter(name="frühstücks-basis").first()
    topping_tag = NutritionalTag.objects.filter(name="frühstücks-belag").first()

    base_ingredients = []
    topping_ingredients = []

    # Load base ingredients (bread types)
    if base_tag:
        bases = (
            base_tag.ingredients.filter(is_standalone_food=True)
            .order_by("name")
            .prefetch_related("portions")
        )

        for ing in bases:
            portions = [
                {
                    "id": p.id,
                    "name": p.name,
                    "measuring_unit_id": p.measuring_unit_id,
                    "quantity": float(p.quantity) if p.quantity else None,
                    "weight_g": float(p.weight_g) if p.weight_g else None,
                    "is_default": p.is_default,
                    "priority": p.priority,
                }
                for p in ing.portions.all()
            ]

            base_ingredients.append({
                "id": ing.id,
                "name": ing.name,
                "slug": ing.slug,
                "is_standalone_food": ing.is_standalone_food,
                "standard_recipe_weight_g": ing.standard_recipe_weight_g,
                "energy_kcal": ing.energy_kcal,
                "portions": portions,
            })

    # Load topping ingredients (spreads, condiments)
    if topping_tag:
        toppings = (
            topping_tag.ingredients.filter(is_standalone_food=True)
            .order_by("name")
            .prefetch_related("portions")
        )

        for ing in toppings:
            portions = [
                {
                    "id": p.id,
                    "name": p.name,
                    "measuring_unit_id": p.measuring_unit_id,
                    "quantity": float(p.quantity) if p.quantity else None,
                    "weight_g": float(p.weight_g) if p.weight_g else None,
                    "is_default": p.is_default,
                    "priority": p.priority,
                }
                for p in ing.portions.all()
            ]

            topping_ingredients.append({
                "id": ing.id,
                "name": ing.name,
                "slug": ing.slug,
                "is_standalone_food": ing.is_standalone_food,
                "energy_kcal": ing.energy_kcal,
                "price_per_kg": ing.price_per_kg,
                "portions": portions,
            })

    return {
        "base_ingredients": base_ingredients,
        "topping_ingredients": topping_ingredients,
    }
