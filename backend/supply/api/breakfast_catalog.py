"""Breakfast catalog endpoint for the wizard.

Returns base ingredients (Basis-Zutaten) and topping ingredients (Belag-Zutaten)
with their portions, weights, and pricing information.

Also provides the breakfast-leftovers calculation endpoint.
"""

import math
from typing import Any

from django.http import JsonResponse
from ninja import Router, Schema

from content.models import Tag
from recipe.models import Recipe
from supply.models import Ingredient, Portion

breakfast_catalog_router = Router(tags=["breakfast"])


@breakfast_catalog_router.get("/breakfast-catalog/debug/", auth=None)
def debug_breakfast_catalog(request):
    base_tag = Tag.objects.filter(slug="breakfast-base").first()
    result = {
        "tag_exists": base_tag is not None,
        "tag_id": base_tag.id if base_tag else None,
        "base_count": 0,
        "total_ingredients": Ingredient.objects.count(),
        "sample_ingredients": [],
    }
    if base_tag:
        qs = Ingredient.objects.filter(tags=base_tag, is_standalone_food=True)
        result["base_count"] = qs.count()
        result["sample_ingredients"] = [
            {"id": i.id, "name": i.name, "standalone": i.is_standalone_food} for i in qs[:5]
        ]
    return JsonResponse(result)


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
    priority: int = 0  # Alias for rank (lower = primary)


class BaseIngredientOut(Schema):
    """Base bread ingredient for breakfast wizard."""

    id: int
    name: str
    slug: str
    is_standalone_food: bool = True
    standard_recipe_weight_g: float | None = None
    energy_kcal: float | None = None
    price_per_kg: float | None = None
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


class FatIngredientOut(Schema):
    """Fat/spread ingredient for the Streichfett wizard step."""

    id: int
    name: str
    slug: str
    is_standalone_food: bool = True
    energy_kcal: float | None = None
    price_per_kg: float | None = None
    portions: list[PortionOut] = []


class DrinkRecipeOut(Schema):
    """A drink recipe for the breakfast wizard (needs preparation)."""

    id: int
    title: str
    recipe_type: str
    cached_energy_total_kcal: float | None = None
    cached_weight_g: float | None = None


class DrinkIngredientOut(Schema):
    """A drink ingredient for the breakfast wizard (just pour)."""

    id: int
    name: str
    slug: str
    is_standalone_food: bool = True
    energy_kcal: float | None = None
    price_per_kg: float | None = None
    portions: list[PortionOut] = []


class WarmMealRecipeOut(Schema):
    """A warm breakfast recipe (e.g. scrambled eggs, pancakes)."""

    id: int
    title: str
    recipe_type: str
    cached_energy_total_kcal: float | None = None
    cached_weight_g: float | None = None


class BreakfastCatalogOut(Schema):
    """Complete breakfast catalog response."""

    base_ingredients: list[BaseIngredientOut] = []
    topping_ingredients: list[ToppingIngredientOut] = []
    fat_ingredients: list[FatIngredientOut] = []
    extra_ingredients: list[ToppingIngredientOut] = []  # Extras (Marmelade, Honig, etc.)
    drink_ingredients: list[DrinkIngredientOut] = []
    drink_recipes: list[DrinkRecipeOut] = []
    warm_meal_recipes: list[WarmMealRecipeOut] = []
    gram_measuring_unit_id: int | None = None
    ml_measuring_unit_id: int | None = None
    scheibe_measuring_unit_id: int | None = None
    portion_measuring_unit_id: int | None = None
    tasse_measuring_unit_id: int | None = None
    schuss_measuring_unit_id: int | None = None


# ============================================================================
# Helpers
# ============================================================================


def _ingredient_to_dict(ing: Ingredient) -> dict:
    portions = [
        {
            "id": p.id,
            "name": p.name,
            "measuring_unit_id": p.measuring_unit_id,
            "quantity": float(p.quantity) if p.quantity is not None else None,
            "weight_g": float(p.weight_g) if p.weight_g is not None else None,
            "is_default": p.rank == 1,
            "priority": p.rank,  # Map rank to priority for frontend
        }
        # Sort by rank ascending (lower rank = primary portion)
        for p in sorted(ing.portions.all(), key=lambda x: x.rank)
    ]
    return {
        "id": ing.id,
        "name": ing.name,
        "slug": ing.slug,
        "is_standalone_food": ing.is_standalone_food,
        "standard_recipe_weight_g": ing.standard_recipe_weight_g,
        "energy_kcal": ing.energy_kcal,
        "price_per_kg": ing.price_per_kg,
        "portions": portions,
    }


# ============================================================================
# Endpoints
# ============================================================================


@breakfast_catalog_router.get("/breakfast-catalog/", response=BreakfastCatalogOut)
def get_breakfast_catalog(request, tag_ids: str | None = None, group_id: int | None = None) -> dict[str, Any]:
    """Get breakfast catalog with permission-aware filtering.
    
    Query parameters:
    - tag_ids: Comma-separated list of tag IDs for filtering
    - group_id: Optional group ID to filter by (for group context)
    
    Returns ingredients and recipes filtered by user permissions:
    - Unauthenticated: only system items (owner=null, status=approved)
    - Authenticated: system items + own items + items shared with user's groups
    """
    from supply.models import MeasuringUnit
    from profiles.models import UserGroup
    from django.db.models import Q

    def _get_visible_ingredients(tag_filters: Q | None = None) -> list[dict]:
        """Get ingredients visible to user."""
        base_qs = Ingredient.objects.select_related("owner").prefetch_related("portions")
        
        if tag_filters:
            base_qs = base_qs.filter(tag_filters)
        
        base_qs = base_qs.filter(is_standalone_food=True).order_by("name")
        
        # Permission filtering
        if not request.user.is_authenticated:
            # Unauthenticated: only system items
            base_qs = base_qs.filter(owner__isnull=True, status="approved")
        else:
            # Authenticated: system + own + shared items
            user_groups = UserGroup.objects.filter(memberships__user=request.user)
            system_q = Q(owner__isnull=True, status="approved")
            own_q = Q(owner=request.user)
            shared_q = Q(visibility="shared", shared_groups__in=user_groups)
            base_qs = base_qs.filter(system_q | own_q | shared_q).distinct()
        
        result = []
        for ing in base_qs.prefetch_related("portions"):
            ing_dict = _ingredient_to_dict(ing)
            result.append(ing_dict)
        return result

    base_tag = Tag.objects.filter(slug="breakfast-base").first()
    topping_tag = Tag.objects.filter(slug="breakfast-topping").first()
    fat_tag = Tag.objects.filter(slug="breakfast-fat").first()
    extra_tag = Tag.objects.filter(slug="breakfast-extra").first()

    base_ingredients = _get_visible_ingredients(Q(tags=base_tag)) if base_tag else []
    topping_ingredients = _get_visible_ingredients(Q(tags=topping_tag)) if topping_tag else []
    fat_ingredients = _get_visible_ingredients(Q(tags=fat_tag)) if fat_tag else []
    extra_ingredients = _get_visible_ingredients(Q(tags=extra_tag)) if extra_tag else []

    drink_tag = Tag.objects.filter(slug="breakfast-drink").first()
    drink_recipes = []
    drink_ingredients = []
    if drink_tag:
        # Parse optional tag_ids filter for breakfast day tags
        parsed_tag_ids: list[int] = []
        if tag_ids:
            try:
                parsed_tag_ids = [int(t) for t in tag_ids.split(",") if t.strip()]
            except (ValueError, TypeError):
                pass

        # Drink recipes (Kaffee, Kakao, Tee) - use existing permission logic
        drinks = Recipe.objects.filter(tags=drink_tag, recipe_type="drink", status="approved")
        # Filter by breakfast day tags if provided
        if parsed_tag_ids:
            for tid in parsed_tag_ids:
                drinks = drinks.filter(tags=tid)

        drinks = drinks.values("id", "title", "recipe_type", "cached_energy_total_kcal", "cached_weight_g")
        drink_recipes = [
            {
                "id": d["id"],
                "title": d["title"],
                "recipe_type": d["recipe_type"],
                "cached_energy_total_kcal": d["cached_energy_total_kcal"],
                "cached_weight_g": d["cached_weight_g"],
            }
            for d in drinks
        ]
        # Drink ingredients (Milch, Säfte, Hafermilch)
        drink_ingredients = _get_visible_ingredients(Q(tags=drink_tag))

    warm_tag = Tag.objects.filter(slug="breakfast-warm-meal").first()
    warm_meal_recipes = []
    if warm_tag:
        warm = Recipe.objects.filter(tags=warm_tag, recipe_type="breakfast", status="approved").values(
            "id", "title", "recipe_type", "cached_energy_total_kcal", "cached_weight_g"
        )
        warm_meal_recipes = [
            {
                "id": d["id"],
                "title": d["title"],
                "recipe_type": d["recipe_type"],
                "cached_energy_total_kcal": d["cached_energy_total_kcal"],
                "cached_weight_g": d["cached_weight_g"],
            }
            for d in warm
        ]

    gram_unit = MeasuringUnit.objects.filter(name="g").first()
    ml_unit = MeasuringUnit.objects.filter(name="ml").first()
    scheibe_unit = MeasuringUnit.objects.filter(name="Scheibe").first()
    portion_unit = MeasuringUnit.objects.filter(name="Portion").first()
    tasse_unit = MeasuringUnit.objects.filter(name="Tasse (200ml)").first()
    schuss_unit = MeasuringUnit.objects.filter(name="Schuss (30ml)").first()

    return {
        "base_ingredients": base_ingredients,
        "topping_ingredients": topping_ingredients,
        "fat_ingredients": fat_ingredients,
        "extra_ingredients": extra_ingredients,
        "drink_ingredients": drink_ingredients,
        "drink_recipes": drink_recipes,
        "warm_meal_recipes": warm_meal_recipes,
        "gram_measuring_unit_id": gram_unit.id if gram_unit else None,
        "ml_measuring_unit_id": ml_unit.id if ml_unit else None,
        "scheibe_measuring_unit_id": scheibe_unit.id if scheibe_unit else None,
        "portion_measuring_unit_id": portion_unit.id if portion_unit else None,
        "tasse_measuring_unit_id": tasse_unit.id if tasse_unit else None,
        "schuss_measuring_unit_id": schuss_unit.id if schuss_unit else None,
    }


@breakfast_catalog_router.get(
    "/breakfast-catalog/drinks/",
    response=list[DrinkRecipeOut],
    auth=None,
)
def get_drink_recipes(request) -> list[dict]:
    drink_tag = Tag.objects.filter(slug="breakfast-drink").first()

    qs = Recipe.objects.filter(recipe_type="drink", status="approved")
    if drink_tag:
        qs = qs.filter(tags=drink_tag)

    drinks = qs.values("id", "title", "recipe_type", "cached_energy_total_kcal", "cached_weight_g")

    return [
        {
            "id": d["id"],
            "title": d["title"],
            "recipe_type": d["recipe_type"],
            "cached_energy_total_kcal": d["cached_energy_total_kcal"],
            "cached_weight_g": d["cached_weight_g"],
        }
        for d in drinks
    ]


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
    auth=None,
)
def calculate_breakfast_leftovers(request, data: BreakfastLeftoversIn) -> dict[str, Any]:
    ing_ids = [t.ingredient_id for t in data.toppings]
    ingredients = {ing.id: ing for ing in Ingredient.objects.filter(id__in=ing_ids)}

    from supply.models import Package

    package_portions: dict[int, Package] = {}
    for p in Package.objects.filter(ingredient_id__in=ing_ids, deleted_at__isnull=True, rank=1):
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
