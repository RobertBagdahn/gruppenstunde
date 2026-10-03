"""Merge duplicate ingredients and find duplicate candidates.

``merge_ingredient`` moves aliases, portions, tags, recipe items and meal items
from the source to the target, takes over the source's nutrition values when
the target has none, soft-deletes the source and records the merge as a
``ContentLink`` so the pair is never proposed again.
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.db import models as db_models
from django.db import transaction

from content.choices import LinkType

NUTRITION_FIELDS = (
    "energy_kcal",
    "protein_g",
    "fat_g",
    "fat_sat_g",
    "carbohydrate_g",
    "sugar_g",
    "fibre_g",
    "salt_g",
    "nutri_score",
    "nutri_class",
)

_QUALIFIER_WORDS = {"bio", "frisch", "frische", "natur", "klassisch", "classic", "original"}


class IngredientMergeError(ValueError):
    """Raised when two ingredients cannot be merged."""


@dataclass
class MergeResult:
    affected_recipe_items: int
    portions_moved: int
    aliases_added: int


def preview_ingredient_merge(source: Any, target: Any) -> dict[str, Any]:
    """Return the references and nutrition affected by a merge without writing."""
    from planner.models import MealItem
    from recipe.models import RecipeItem
    from supply.models import Portion, UnitConversion

    return {
        "source_id": source.id,
        "source_name": source.name,
        "target_id": target.id,
        "target_name": target.name,
        "affected_recipe_items": RecipeItem.objects.filter(portion__ingredient=source).count(),
        "affected_meal_items": MealItem.objects.filter(ingredient=source).count(),
        "affected_portions": Portion.objects.filter(ingredient=source).count(),
        "affected_unit_conversions": UnitConversion.objects.filter(ingredient=source).count(),
        "source_aliases": list(source.aliases.values_list("name", flat=True)),
        "target_aliases": list(target.aliases.values_list("name", flat=True)),
        "nutrition_comparison": {
            "source": {"energy_kcal": source.energy_kcal, "protein_g": source.protein_g},
            "target": {"energy_kcal": target.energy_kcal, "protein_g": target.protein_g},
        },
    }


def merge_ingredient(source: Any, target: Any, *, user: Any | None = None) -> MergeResult:
    """Merge ``source`` into ``target`` (source is soft-deleted afterwards)."""
    from content.models import ContentLink
    from planner.models import MealItem
    from recipe.models import RecipeItem
    from supply.models import Ingredient, IngredientAlias, UnitConversion
    from supply.services.portion_integrity import rebind_recipe_items_to_portion

    if source.id == target.id:
        raise IngredientMergeError("Quell- und Ziel-Zutat dürfen nicht identisch sein")
    if source.is_deleted:
        raise IngredientMergeError("Quell-Zutat wurde bereits zusammengeführt")

    ct = ContentType.objects.get_for_model(Ingredient)
    if ContentLink.objects.filter(
        source_content_type=ct,
        source_object_id=source.id,
        target_content_type=ct,
        target_object_id=target.id,
        link_type=LinkType.DUPLICATE_MERGED,
    ).exists():
        raise IngredientMergeError("Dieses Zutaten-Paar wurde bereits zusammengeführt")

    created_by = user if user is not None and getattr(user, "is_authenticated", False) else None

    with transaction.atomic():
        affected = RecipeItem.objects.filter(portion__ingredient=source).count()
        target_max_alias_rank = (
            IngredientAlias.objects.filter(ingredient=target).aggregate(m=db_models.Max("rank"))["m"] or 0
        )
        aliases_added = 0
        alias_names = [source.name, *source.aliases.values_list("name", flat=True)]
        existing_alias_names = {name.lower() for name in target.aliases.values_list("name", flat=True)}
        for offset, alias_name in enumerate(alias_names, start=1):
            if alias_name.lower() == target.name.lower() or alias_name.lower() in existing_alias_names:
                continue
            IngredientAlias.objects.create(
                ingredient=target,
                name=alias_name,
                rank=target_max_alias_rank + offset,
                is_generic=True,
                created_by=created_by,
            )
            existing_alias_names.add(alias_name.lower())
            aliases_added += 1

        portions_moved = 0
        target_portions = {p.name.lower(): p for p in target.portions.active()}
        max_target_rank = target.portions.aggregate(m=db_models.Max("rank"))["m"] or 1
        for source_portion in list(source.portions.active()):
            existing = target_portions.get(source_portion.name.lower())
            if existing is not None:
                if RecipeItem.objects.filter(portion=source_portion).exists():
                    rebind_recipe_items_to_portion(source_portion, existing)
                source_portion.delete()
                continue
            if source_portion.rank == 1:
                max_target_rank += 1
                source_portion.rank = max_target_rank
            source_portion.ingredient = target
            source_portion.save(update_fields=["ingredient", "rank"])
            target_portions[source_portion.name.lower()] = source_portion
            portions_moved += 1

        # A meal may contain both ingredients; keep the target's entry there.
        meals_with_target = MealItem.objects.filter(ingredient=target).values("meal_id")
        # .only(): this runs from a migration (0018_unique_system_ingredient_name)
        # that may execute before later migrations add newer MealItem columns
        # (e.g. buffet_role); a full-row SELECT would then fail on the missing
        # column. Include recipe_id explicitly — the post_delete signal that
        # updates Recipe.usage_count reads it, and a lazy re-fetch of a
        # deferred field could pull in the same not-yet-existing columns.
        MealItem.objects.filter(ingredient=source, meal_id__in=meals_with_target).only("pk", "recipe_id").delete()
        MealItem.objects.filter(ingredient=source).update(ingredient=target)
        target.tags.add(*source.tags.all())
        if not target.energy_kcal and source.energy_kcal:
            # e.g. "Brötchen" with 0 kcal absorbing "Brötchen (ganzes)" with 265 kcal
            for field in NUTRITION_FIELDS:
                setattr(target, field, getattr(source, field))
            target.save(update_fields=list(NUTRITION_FIELDS))
        UnitConversion.objects.filter(ingredient=source).delete()
        if affected:
            Ingredient.objects.filter(id=target.id).update(
                usage_count=db_models.F("usage_count") + (source.usage_count or 0)
            )

        source.soft_delete()
        ContentLink.objects.create(
            source_content_type=ct,
            source_object_id=source.id,
            target_content_type=ct,
            target_object_id=target.id,
            link_type=LinkType.DUPLICATE_MERGED,
            created_by=created_by,
        )

    return MergeResult(affected_recipe_items=affected, portions_moved=portions_moved, aliases_added=aliases_added)


def _exact_key(name: str) -> str:
    return " ".join((name or "").lower().split())


def _merge_target_rank(ingredient: Any) -> tuple[int, int, int, int]:
    """Prefer verified, then most used, then most complete, then oldest."""
    return (
        0 if ingredient.status == "verified" else 1,
        -(ingredient.usage_count or 0),
        -(ingredient.quality_score or 0),
        ingredient.id,
    )


def exact_duplicate_groups() -> list[list[Any]]:
    """Groups of non-deleted ingredients with the same name (case/whitespace-insensitive)."""
    from supply.models import Ingredient

    groups: dict[str, list[Any]] = defaultdict(list)
    for ingredient in Ingredient.objects.only("id", "name", "status", "usage_count", "quality_score"):
        groups[_exact_key(ingredient.name)].append(ingredient)
    return [sorted(group, key=_merge_target_rank) for group in groups.values() if len(group) > 1]


def merge_exact_duplicates(*, apply: bool, user: Any | None = None) -> tuple[int, list[str]]:
    """Merge every exact-name duplicate into the best ingredient of its group."""
    from supply.models import Ingredient

    merged = 0
    messages: list[str] = []
    for group in exact_duplicate_groups():
        target = Ingredient.objects.get(id=group[0].id)
        messages.append(f"„{target.name}“: {len(group) - 1} Duplikat(e) → #{target.id}")
        for duplicate in group[1:]:
            merged += 1
            if apply:
                merge_ingredient(Ingredient.objects.get(id=duplicate.id), target, user=user)
    return merged, messages


def similarity_key(name: str) -> str:
    """Normalized key for near-duplicates: drops qualifiers ("Bio", "frisch") and plural endings.

    Bracketed details stay part of the key: "Zwiebel (rot)" or "Mais (Dose)" are
    real variants, not duplicates.
    """
    text = re.sub(r"[^a-zäöüß0-9 ]+", " ", (name or "").lower())
    words = []
    for word in text.split():
        if word in _QUALIFIER_WORDS:
            continue
        for suffix in ("en", "n", "e", "s"):
            if len(word) > 5 and word.endswith(suffix):
                word = word[: -len(suffix)]
                break
        words.append(word)
    return " ".join(sorted(words))


def near_duplicate_groups(*, min_size: int = 2) -> list[list[Any]]:
    """Groups that share a similarity key but not the exact name (manual review)."""
    from supply.models import Ingredient

    groups: dict[str, list[Any]] = defaultdict(list)
    for ingredient in Ingredient.objects.only("id", "name", "slug", "status", "usage_count", "quality_score"):
        key = similarity_key(ingredient.name)
        if key:
            groups[key].append(ingredient)
    result = []
    for group in groups.values():
        if len(group) < min_size or len({_exact_key(i.name) for i in group}) < 2:
            continue
        result.append(sorted(group, key=_merge_target_rank))
    result.sort(key=lambda group: -sum(i.usage_count or 0 for i in group))
    return result
