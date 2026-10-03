"""Buffet catalog and bounded, visibility-aware item search."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Any, Literal

from django.db.models import Prefetch, Q, QuerySet

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
    "buffet-cheese",
    "buffet-salty-snack",
    "buffet-sweet-snack",
    "buffet-nuts",
    "buffet-dip",
    "buffet-salad",
    "buffet-carb",
    "buffet-main",
    "buffet-soup",
    "buffet-topping",
)

MEAL_TYPE_RECIPE_PRIORITIES: dict[str, tuple[str, ...]] = {
    "breakfast": ("breakfast", "cold_meal"),
    "snack": ("snack", "dessert", "cold_meal"),
    "lunch": ("cold_meal", "warm_meal"),
    "dinner": ("warm_meal", "cold_meal"),
    "drinks": ("drink",),
}


@dataclass
class BuffetCatalogItem:
    kind: Literal["ingredient", "recipe"]
    id: int
    name: str
    energy_kcal_per_100g: float | None
    price_per_kg: float | None
    weight_per_serving_g: float | None
    obj: Any
    recipe_type: str | None = None
    is_favorite: bool = False
    role_slugs: tuple[str, ...] = ()


def recipe_weight_per_serving_g(recipe: Any) -> float | None:
    """Weight of one serving; ``cached_weight_g`` is the whole recipe."""
    if not recipe.cached_weight_g:
        return None
    return float(recipe.cached_weight_g) / max(recipe.portions or 1, 1)


def recipe_price_per_kg(recipe: Any) -> float | None:
    if recipe.cached_price_total is None or not recipe.cached_weight_g:
        return None
    return float(recipe.cached_price_total) / float(recipe.cached_weight_g) * 1000


def is_alcoholic_item(item: Any, kind: Literal["ingredient", "recipe"]) -> bool:
    """Recognize alcohol by the established name rule and retail classification."""
    from supply.services.nutrition_plausibility import is_alcoholic

    name = item.name if kind == "ingredient" else item.title
    if is_alcoholic(name):
        return True

    if kind == "ingredient":
        return bool(item.retail_section and item.retail_section.name == "Alkoholische Getränke")

    for recipe_item in item.recipe_items.all():
        portion = recipe_item.portion
        ingredient = portion.ingredient if portion is not None else None
        if ingredient is None:
            continue
        if is_alcoholic(ingredient.name):
            return True
        if ingredient.retail_section and ingredient.retail_section.name == "Alkoholische Getränke":
            return True
    return False


def ingredients_for_role(user: Any, role_slug: str) -> QuerySet:
    """Visible ingredients tagged with a role, including active portions."""
    from content.services.food_access import visible_ingredient_queryset
    from supply.models import Portion

    return (
        visible_ingredient_queryset(user)
        .filter(tags__slug=role_slug)
        .prefetch_related(
            Prefetch("portions", queryset=Portion.objects.active().order_by("rank", "id")),
            "tags",
        )
        .order_by("name")
        .distinct()
    )


def recipes_for_role(user: Any, role_slug: str) -> QuerySet:
    """Visible recipes tagged with a role, with their ingredients prefetched."""
    from content.services.food_access import visible_recipe_queryset

    return (
        visible_recipe_queryset(user)
        .filter(tags__slug=role_slug)
        .prefetch_related("recipe_items__portion__ingredient__retail_section", "tags")
        .order_by("title")
        .distinct()
    )


def _role_slugs(obj: Any) -> tuple[str, ...]:
    role_order = {slug: index for index, slug in enumerate(BUFFET_ROLE_SLUGS)}
    return tuple(
        sorted(
            (tag.slug for tag in obj.tags.all() if tag.group == "buffet"),
            key=lambda slug: role_order.get(slug, len(role_order)),
        )
    )


def _catalog_item(kind: Literal["ingredient", "recipe"], obj: Any) -> BuffetCatalogItem:
    from supply.services.price_service import price_or_none

    if kind == "ingredient":
        price = price_or_none(obj.price_per_kg)
        return BuffetCatalogItem(
            kind="ingredient",
            id=obj.id,
            name=obj.name,
            energy_kcal_per_100g=obj.energy_kcal,
            price_per_kg=float(price) if price is not None else None,
            weight_per_serving_g=None,
            obj=obj,
            role_slugs=_role_slugs(obj),
        )

    return BuffetCatalogItem(
        kind="recipe",
        id=obj.id,
        name=obj.title,
        energy_kcal_per_100g=obj.cached_energy_kcal,
        price_per_kg=recipe_price_per_kg(obj),
        weight_per_serving_g=recipe_weight_per_serving_g(obj),
        obj=obj,
        recipe_type=obj.recipe_type,
        role_slugs=_role_slugs(obj),
    )


def items_for_role(user: Any, role_slug: str) -> list[BuffetCatalogItem]:
    """Return the visible, non-alcoholic favorites for one role."""
    items: list[BuffetCatalogItem] = []
    for ingredient in ingredients_for_role(user, role_slug):
        if is_alcoholic_item(ingredient, "ingredient"):
            continue
        item = _catalog_item("ingredient", ingredient)
        item.is_favorite = True
        items.append(item)

    for recipe in recipes_for_role(user, role_slug):
        if is_alcoholic_item(recipe, "recipe"):
            continue
        item = _catalog_item("recipe", recipe)
        item.is_favorite = True
        items.append(item)
    return sorted(items, key=lambda item: (item.name.casefold(), item.kind, item.id))


def _fold_umlauts(value: str) -> str:
    folded = unicodedata.normalize("NFKC", value).casefold()
    return folded.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")


def _query_variants(query: str) -> tuple[str, ...]:
    """Expand common German umlaut transliterations for database lookups."""
    seed = unicodedata.normalize("NFKC", query).strip().casefold()
    variants = {seed}
    for value in tuple(variants):
        variants.add(value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss"))
        variants.add(value.replace("ae", "ä").replace("oe", "ö").replace("ue", "ü").replace("ss", "ß"))
    return tuple(
        sorted(variants, key=lambda value: (value.casefold() != seed.casefold(), len(value), value.casefold()))
    )


def _name_query(query: str, *, name_field: str, aliases: bool) -> Q:
    condition = Q()
    for variant in _query_variants(query):
        condition |= Q(**{f"{name_field}__icontains": variant})
        if aliases:
            condition |= Q(aliases__name__icontains=variant)
    return condition


def _starts_with_query(name: str, aliases: list[str], query: str) -> bool:
    folded_query = _fold_umlauts(query)
    return any(_fold_umlauts(value).startswith(folded_query) for value in [name, *aliases])


def search_buffet_items(
    user: Any,
    *,
    query: str,
    role_slug: str,
    meal_type: str,
    kind: Literal["all", "ingredient", "recipe"] = "all",
    recipe_type: str | None = None,
    include_non_standalone: bool = False,
    exclude_alcohol: bool = False,
    limit: int = 30,
) -> list[BuffetCatalogItem]:
    """Search visible catalog items and rank role favorites and relevant types first."""
    from content.services.food_access import visible_ingredient_queryset, visible_recipe_queryset

    normalized_query = unicodedata.normalize("NFKC", query).strip()
    if len(normalized_query) < 2:
        return []

    matching_recipe_types = MEAL_TYPE_RECIPE_PRIORITIES[meal_type]
    results: list[tuple[tuple[int, int, str, str, int], BuffetCatalogItem]] = []

    if kind in ("all", "ingredient"):
        ingredients = (
            visible_ingredient_queryset(user)
            .filter(_name_query(normalized_query, name_field="name", aliases=True))
            .prefetch_related("aliases", "tags")
            .select_related("retail_section")
            .distinct()
        )
        for ingredient in ingredients:
            item = _catalog_item("ingredient", ingredient)
            alcoholic = is_alcoholic_item(ingredient, "ingredient")
            item.is_favorite = role_slug in item.role_slugs and not alcoholic
            if exclude_alcohol and alcoholic:
                continue
            if not include_non_standalone and not ingredient.is_standalone_food and not item.is_favorite:
                continue
            aliases = [alias.name for alias in ingredient.aliases.all()]
            relevance_group = 0 if item.is_favorite else 1 if ingredient.is_standalone_food else 3
            prefix_rank = 0 if _starts_with_query(ingredient.name, aliases, normalized_query) else 1
            results.append(((relevance_group, prefix_rank, item.name.casefold(), item.kind, item.id), item))

    if kind in ("all", "recipe"):
        recipes = (
            visible_recipe_queryset(user)
            .filter(_name_query(normalized_query, name_field="title", aliases=False))
            .prefetch_related("tags", "recipe_items__portion__ingredient__retail_section")
            .distinct()
        )
        if recipe_type:
            recipes = recipes.filter(recipe_type=recipe_type)
        for recipe in recipes:
            item = _catalog_item("recipe", recipe)
            alcoholic = is_alcoholic_item(recipe, "recipe")
            item.is_favorite = role_slug in item.role_slugs and not alcoholic
            if exclude_alcohol and alcoholic:
                continue
            if item.is_favorite:
                relevance_group = 0
            elif recipe.recipe_type in matching_recipe_types:
                relevance_group = 2
            else:
                relevance_group = 3
            prefix_rank = 0 if _starts_with_query(recipe.title, [], normalized_query) else 1
            results.append(((relevance_group, prefix_rank, item.name.casefold(), item.kind, item.id), item))

    results.sort(key=lambda result: result[0])
    capped_limit = max(1, min(limit, 50))
    return [item for _, item in results[:capped_limit]]
