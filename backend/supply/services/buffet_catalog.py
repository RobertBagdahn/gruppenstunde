"""Buffet catalog: readable ingredients and recipes per buffet role tag.

The role tags are the curation; there is no ``is_standalone_food`` filter.
Visibility always follows ``content.services.food_access``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db.models import Prefetch, QuerySet

BUFFET_ROLE_SLUGS: tuple[str, ...] = (
    "buffet-bread",
    "buffet-fat",
    "buffet-savory",
    "buffet-sweet",
    "buffet-condiment",
    "buffet-fresh",
    "buffet-cereal",
    "buffet-drink",
    "buffet-dish",
)


@dataclass
class BuffetCatalogItem:
    kind: str  # "ingredient" | "recipe"
    id: int
    name: str
    energy_kcal_per_100g: float | None
    price_per_kg: float | None
    weight_per_serving_g: float | None
    obj: Any


def recipe_weight_per_serving_g(recipe: Any) -> float | None:
    """Weight of one serving; ``cached_weight_g`` is the whole recipe."""
    if not recipe.cached_weight_g:
        return None
    return float(recipe.cached_weight_g) / max(recipe.portions or 1, 1)


def _recipe_price_per_kg(recipe: Any) -> float | None:
    if not recipe.cached_price_total or not recipe.cached_weight_g:
        return None
    return float(recipe.cached_price_total) / float(recipe.cached_weight_g) * 1000


def ingredients_for_role(user: Any, role_slug: str) -> QuerySet:
    """Ingredients with the role tag that ``user`` may read, with active portions."""
    from content.services.food_access import visible_ingredient_queryset
    from supply.models import Portion

    return (
        visible_ingredient_queryset(user)
        .filter(tags__slug=role_slug)
        .prefetch_related(Prefetch("portions", queryset=Portion.objects.active().order_by("rank", "id")))
        .order_by("name")
        .distinct()
    )


def recipes_for_role(user: Any, role_slug: str) -> QuerySet:
    """Recipes with the role tag that ``user`` may read."""
    from content.services.food_access import visible_recipe_queryset

    return visible_recipe_queryset(user).filter(tags__slug=role_slug).order_by("title").distinct()


def items_for_role(user: Any, role_slug: str) -> list[BuffetCatalogItem]:
    """All readable ingredients and recipes of a role, alphabetically, not truncated."""
    from supply.services.price_service import price_or_none

    items = [
        BuffetCatalogItem(
            kind="ingredient",
            id=ingredient.id,
            name=ingredient.name,
            energy_kcal_per_100g=ingredient.energy_kcal,
            price_per_kg=float(price) if (price := price_or_none(ingredient.price_per_kg)) is not None else None,
            weight_per_serving_g=None,
            obj=ingredient,
        )
        for ingredient in ingredients_for_role(user, role_slug)
    ]
    items.extend(
        BuffetCatalogItem(
            kind="recipe",
            id=recipe.id,
            name=recipe.title,
            energy_kcal_per_100g=recipe.cached_energy_kcal,
            price_per_kg=_recipe_price_per_kg(recipe),
            weight_per_serving_g=recipe_weight_per_serving_g(recipe),
            obj=recipe,
        )
        for recipe in recipes_for_role(user, role_slug)
    )
    return sorted(items, key=lambda item: item.name.casefold())
