"""Breakfast catalog endpoint for the wizard.

Returns base ingredients (Basis-Zutaten) and topping ingredients (Belag-Zutaten)
with their portions, weights, and pricing information.

Also provides the breakfast-leftovers calculation endpoint.
"""

import math
from typing import Any

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
        bases = base_tag.ingredients.filter(is_standalone_food=True).order_by("name").prefetch_related("portions")

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

            base_ingredients.append(
                {
                    "id": ing.id,
                    "name": ing.name,
                    "slug": ing.slug,
                    "is_standalone_food": ing.is_standalone_food,
                    "standard_recipe_weight_g": ing.standard_recipe_weight_g,
                    "energy_kcal": ing.energy_kcal,
                    "portions": portions,
                }
            )

    # Load topping ingredients (spreads, condiments)
    if topping_tag:
        toppings = topping_tag.ingredients.filter(is_standalone_food=True).order_by("name").prefetch_related("portions")

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

            topping_ingredients.append(
                {
                    "id": ing.id,
                    "name": ing.name,
                    "slug": ing.slug,
                    "is_standalone_food": ing.is_standalone_food,
                    "energy_kcal": ing.energy_kcal,
                    "price_per_kg": ing.price_per_kg,
                    "portions": portions,
                }
            )

    return {
        "base_ingredients": base_ingredients,
        "topping_ingredients": topping_ingredients,
    }


# ============================================================================
# Breakfast Leftovers — Schemas + Endpoint
# ============================================================================


class ToppingPortionIn(Schema):
    """A topping with quantity per person (in grams)."""

    ingredient_id: int
    grams_per_person: float


class BreakfastLeftoversIn(Schema):
    """Input for the breakfast leftovers calculation."""

    toppings: list[ToppingPortionIn]
    norm_portions: int
    days: int = 1


class ToppingLeftoverOut(Schema):
    """Leftover calculation result for a single topping."""

    ingredient_id: int
    ingredient_name: str
    total_needed_g: float
    package_size_g: float | None = None
    packages_needed: int | None = None
    leftover_g: float | None = None
    leftover_eur: float | None = None
    price_per_kg: float | None = None


class BreakfastLeftoversOut(Schema):
    """Response for the breakfast leftovers calculation."""

    toppings: list[ToppingLeftoverOut]


@breakfast_catalog_router.post(
    "/breakfast-leftovers/",
    response=BreakfastLeftoversOut,
    auth=None,  # accessible to logged-in users; caller checks meal plan access separately
)
def calculate_breakfast_leftovers(request, data: BreakfastLeftoversIn) -> dict[str, Any]:
    """Calculate leftover amounts and costs for breakfast toppings.

    For each topping:
      total_needed_g = grams_per_person × norm_portions × days
      packages_needed = ceil(total_needed_g / package_size_g)
      leftover_g = packages_needed × package_size_g − total_needed_g
      leftover_eur = leftover_g / 1000 × price_per_kg

    Returns per topping: Bedarf (g), Packungen (Stück), Rest (g), Restwert (€).
    """
    ing_ids = [t.ingredient_id for t in data.toppings]
    ingredients = {ing.id: ing for ing in Ingredient.objects.filter(id__in=ing_ids)}

    # Batch-load "Packung" portions
    package_portions: dict[int, Portion] = {}
    for p in Portion.objects.filter(ingredient_id__in=ing_ids, name__startswith="Packung"):
        # Keep the first/only Packung per ingredient
        if p.ingredient_id not in package_portions:
            package_portions[p.ingredient_id] = p

    results = []
    for t in data.toppings:
        ing = ingredients.get(t.ingredient_id)
        if not ing:
            continue

        total_needed_g = t.grams_per_person * data.norm_portions * data.days

        pkg = package_portions.get(t.ingredient_id)
        pkg_size = float(pkg.weight_g) if pkg and pkg.weight_g else None
        price_per_kg = float(ing.price_per_kg) if ing.price_per_kg else None

        packages_needed: int | None = None
        leftover_g: float | None = None
        leftover_eur: float | None = None

        if pkg_size and pkg_size > 0:
            packages_needed = math.ceil(total_needed_g / pkg_size)
            leftover_g = round(packages_needed * pkg_size - total_needed_g, 1)
            if price_per_kg is not None:
                leftover_eur = round(leftover_g / 1000.0 * price_per_kg, 2)

        results.append(
            {
                "ingredient_id": ing.id,
                "ingredient_name": ing.name,
                "total_needed_g": round(total_needed_g, 1),
                "package_size_g": pkg_size,
                "packages_needed": packages_needed,
                "leftover_g": leftover_g,
                "leftover_eur": leftover_eur,
                "price_per_kg": price_per_kg,
            }
        )

    return {"toppings": results}
