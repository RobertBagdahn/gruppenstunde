"""Data-quality reports for ingredient quantities, portions and aliases.

Shared by the staff data-quality endpoints and ``check_recipe_quantities``.
Reports only; nothing is changed.
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass

from recipe.services.quantity_outliers import OutlierKind, OutlierSeverity, QuantityOutlier, load_stats, recipe_outliers

IMPORT_DEFAULT_PIECE_WEIGHT_G = 150.0
_IMPORT_PIECE_NAME = re.compile(r"^1 st(ü|ue)ck \(\d+([.,]\d+)?\s*g\)$", re.IGNORECASE)


@dataclass(frozen=True)
class RecipeQuantityOutlierRow:
    recipe_id: int
    recipe_title: str
    recipe_slug: str
    recipe_item_id: int
    ingredient_id: int | None
    ingredient_name: str
    quantity: float
    unit_label: str
    outlier: QuantityOutlier


@dataclass(frozen=True)
class SuspiciousPortionRow:
    portion_id: int
    portion_name: str
    weight_g: float
    weight_status: str | None
    ingredient_id: int
    ingredient_name: str
    ingredient_slug: str
    recipe_count: int
    meal_item_count: int


@dataclass(frozen=True)
class AliasConflictRow:
    kind: str
    alias: str
    ingredient_id: int
    ingredient_name: str
    ingredient_slug: str
    ingredient_usage: int
    conflicting_ingredient_id: int
    conflicting_ingredient_name: str
    conflicting_ingredient_slug: str
    conflicting_ingredient_usage: int


def recipe_quantity_outliers(
    kind: OutlierKind | None = None,
    severity: OutlierSeverity | None = None,
) -> list[RecipeQuantityOutlierRow]:
    """Unusual lines of all non-deleted recipes, strongest findings first."""
    from recipe.models import Recipe
    from recipe.services.recipe_item_helpers import get_recipe_item_ingredient, recipe_item_unit_label

    recipes = list(
        Recipe.objects.filter(deleted_at__isnull=True).prefetch_related(
            "recipe_items__portion__ingredient", "recipe_items__portion__measuring_unit", "recipe_items__ingredient"
        )
    )
    ingredient_ids = {
        ingredient.id
        for recipe in recipes
        for item in recipe.recipe_items.all()
        if (ingredient := get_recipe_item_ingredient(item)) is not None
    }
    stats = load_stats(ingredient_ids)

    rows: list[RecipeQuantityOutlierRow] = []
    for recipe in recipes:
        items = list(recipe.recipe_items.all())
        by_id = {item.id: item for item in items}
        for item_id, outlier in recipe_outliers(recipe, items=items, stats=stats).items():
            if kind and outlier.kind != kind:
                continue
            if severity and outlier.severity != severity:
                continue
            item = by_id[item_id]
            ingredient = get_recipe_item_ingredient(item)
            rows.append(
                RecipeQuantityOutlierRow(
                    recipe_id=recipe.id,
                    recipe_title=recipe.title,
                    recipe_slug=recipe.slug,
                    recipe_item_id=item.id,
                    ingredient_id=ingredient.id if ingredient else None,
                    ingredient_name=ingredient.name if ingredient else (item.note or "Zutat"),
                    quantity=float(item.quantity or 0),
                    unit_label=recipe_item_unit_label(item),
                    outlier=outlier,
                )
            )

    def strength(row: RecipeQuantityOutlierRow) -> tuple[int, float]:
        outlier = row.outlier
        ratio = outlier.grams_per_person / outlier.median_g if outlier.median_g else outlier.grams_per_person
        return (0 if outlier.severity == "danger" else 1, -ratio)

    rows.sort(key=strength)
    return rows


def is_import_default_piece(name: str | None) -> bool:
    from supply.services.portion_resolution import is_piece_like_name

    return bool(name) and (is_piece_like_name(name) or bool(_IMPORT_PIECE_NAME.match((name or "").strip())))


def suspicious_portions() -> list[SuspiciousPortionRow]:
    """Unconfirmed piece portions still carrying the import default weight and in use."""
    from django.db.models import Count, Q

    from supply.models import Portion

    candidates = (
        Portion.objects.active()
        .filter(ingredient__deleted_at__isnull=True, weight_g=IMPORT_DEFAULT_PIECE_WEIGHT_G)
        .exclude(weight_status="confirmed")
        .select_related("ingredient")
        .annotate(
            recipe_count=Count("recipe_items", distinct=True),
            meal_item_count=Count("meal_items", filter=Q(meal_items__meal__is_reference=False), distinct=True),
        )
    )
    rows = [
        SuspiciousPortionRow(
            portion_id=portion.id,
            portion_name=portion.name,
            weight_g=float(portion.weight_g or 0),
            weight_status=portion.weight_status,
            ingredient_id=portion.ingredient_id,
            ingredient_name=portion.ingredient.name,
            ingredient_slug=portion.ingredient.slug,
            recipe_count=portion.recipe_count,
            meal_item_count=portion.meal_item_count,
        )
        for portion in candidates
        if (portion.recipe_count or portion.meal_item_count) and is_import_default_piece(portion.name)
    ]
    rows.sort(key=lambda row: (-(row.recipe_count + row.meal_item_count), row.ingredient_name))
    return rows


def alias_conflicts() -> list[AliasConflictRow]:
    """Ingredient names that are another ingredient's alias, and aliases on two ingredients."""
    from django.contrib.contenttypes.models import ContentType

    from content.choices import LinkType
    from content.models import ContentLink, DuplicateDismissal
    from supply.models import Ingredient, IngredientAlias

    ingredients = {ingredient.id: ingredient for ingredient in Ingredient.objects.filter(deleted_at__isnull=True)}
    ct = ContentType.objects.get_for_model(Ingredient)
    dismissed = set(
        DuplicateDismissal.objects.filter(source_content_type=ct).values_list("source_object_id", "target_object_id")
    )
    merged = {
        tuple(sorted(pair))
        for pair in ContentLink.objects.filter(source_content_type=ct, link_type=LinkType.DUPLICATE_MERGED).values_list(
            "source_object_id", "target_object_id"
        )
    }

    by_name: dict[str, list[int]] = defaultdict(list)
    for ingredient in ingredients.values():
        by_name[ingredient.name.strip().lower()].append(ingredient.id)
    alias_owners: dict[str, set[int]] = defaultdict(set)
    alias_display: dict[str, str] = {}
    for alias_name, ingredient_id in IngredientAlias.objects.filter(ingredient__deleted_at__isnull=True).values_list(
        "name", "ingredient_id"
    ):
        if ingredient_id not in ingredients:
            continue
        key = alias_name.strip().lower()
        alias_owners[key].add(ingredient_id)
        alias_display.setdefault(key, alias_name.strip())

    pairs: dict[tuple[int, int], tuple[str, str]] = {}
    for key, owners in alias_owners.items():
        for named_id in by_name.get(key, []):
            for owner_id in owners - {named_id}:
                low, high = sorted((named_id, owner_id))
                pairs.setdefault((low, high), ("name_is_alias", alias_display[key]))
        ordered = sorted(owners)
        for index, first in enumerate(ordered):
            for second in ordered[index + 1 :]:
                pairs.setdefault((first, second), ("shared_alias", alias_display[key]))

    rows: list[AliasConflictRow] = []
    for (first_id, second_id), (kind, alias) in pairs.items():
        if (first_id, second_id) in dismissed or (first_id, second_id) in merged:
            continue
        first, second = ingredients[first_id], ingredients[second_id]
        # The more used ingredient comes second: it is the natural merge target.
        if (first.usage_count or 0) > (second.usage_count or 0):
            first, second = second, first
        rows.append(
            AliasConflictRow(
                kind=kind,
                alias=alias,
                ingredient_id=first.id,
                ingredient_name=first.name,
                ingredient_slug=first.slug,
                ingredient_usage=first.usage_count or 0,
                conflicting_ingredient_id=second.id,
                conflicting_ingredient_name=second.name,
                conflicting_ingredient_slug=second.slug,
                conflicting_ingredient_usage=second.usage_count or 0,
            )
        )
    rows.sort(key=lambda row: (-(row.ingredient_usage + row.conflicting_ingredient_usage), row.alias.lower()))
    return rows
