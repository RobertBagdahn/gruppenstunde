"""Targeted food data fixes found by the data quality audit (idempotent, dry-run capable).

Steps (see ``fix_food_data_quality``):

- ``water``: leftover/cooking water is free and carries no price.
- ``duplicates``: curated duplicate groups (dried basil) are merged into one ingredient.
- ``prices``: curated prices for ingredients that have none (e.g. dried mountain lentils).
- ``nutrition``: curated reference values plus the deterministic repair rules.
- ``publish``: system drafts used in recipes are verified when they pass the publish gate.

All lookups go by name so the same command works on any database copy.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from django.db.models.functions import Lower

from supply.choices import IngredientStatusChoices
from supply.models import Ingredient
from supply.services.nutrition_plausibility import (
    detect_nutrition_issues,
    ingredient_nutrition_values,
    net_carbs_if_total,
    propose_deterministic_repair,
)
from supply.services.price_service import FREE_INGREDIENT_NAMES


@dataclass(frozen=True)
class DuplicateGroup:
    """One curated group: ``sources`` are merged into ``target`` (all matched by name)."""

    target: str
    sources: tuple[str, ...]


DUPLICATE_GROUPS: tuple[DuplicateGroup, ...] = (
    DuplicateGroup(
        target="Basilikum, getrocknet",
        sources=("Basilikum, trocken", "Getrockneter Basilikum", "Basilikum getrocknet", "Basilikum trocken"),
    ),
)

# €/kg, only applied when the ingredient has no price yet.
MISSING_PRICES: dict[str, str] = {
    "berglinsen (getrocknet)": "4.00",  # same range as the other dried lentils (rote/gelbe Linsen: 4.00 €/kg)
    "berglinsen": "4.00",
}

# Reference values per 100 g (BLS/USDA). Applied by name; only listed fields are touched.
NUTRITION_REFERENCE: dict[str, dict[str, float]] = {
    "basilikum, getrocknet": {
        "energy_kcal": 233.0,
        "protein_g": 23.0,
        "fat_g": 4.1,
        "fat_sat_g": 2.1,
        "carbohydrate_g": 10.0,
        "sugar_g": 1.7,
        "fibre_g": 37.7,
        "salt_g": 0.2,
        "sodium_mg": 76.0,
    },
    "gemahlene vanille": {
        "energy_kcal": 288.0,
        "protein_g": 0.1,
        "fat_g": 0.1,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 12.7,
        "sugar_g": 12.7,
        "fibre_g": 0.0,
        "salt_g": 0.0,
        "sodium_mg": 9.0,
    },
}


# Only energy/macro inconsistencies are repaired here; the broad repair is ``repair_ingredient_nutrition``.
REPAIRABLE_ENERGY_ISSUES: frozenset[str] = frozenset({"energy_mismatch", "energy_kj_as_kcal", "macro_sum_gt_100"})


ENERGY_MACRO_FIELDS: frozenset[str] = frozenset({"energy_kcal", "carbohydrate_g"})


@dataclass
class StepResult:
    """Outcome of a single step: how many rows changed plus human-readable lines."""

    changed: int = 0
    messages: list[str] = field(default_factory=list)


def fix_free_water_prices(*, apply: bool) -> StepResult:
    """Clear the price of cooking/pickle water ingredients."""
    result = StepResult()
    queryset = Ingredient.objects.annotate(_lname=Lower("name")).filter(
        _lname__in=FREE_INGREDIENT_NAMES, price_per_kg__isnull=False
    )
    for ingredient in queryset:
        result.changed += 1
        result.messages.append(f"#{ingredient.id} {ingredient.name}: {ingredient.price_per_kg} €/kg → kein Preis")
        if apply:
            Ingredient.objects.filter(id=ingredient.id).update(price_per_kg=None)
    return result


def merge_duplicate_groups(*, apply: bool) -> StepResult:
    """Merge curated duplicate groups into their target (created later if only a source exists)."""
    from supply.services.ingredient_merge import merge_ingredient

    result = StepResult()
    for group in DUPLICATE_GROUPS:
        candidates = list(
            Ingredient.objects.annotate(_lname=Lower("name"))
            .filter(_lname__in=[group.target.lower(), *(s.lower() for s in group.sources)], deleted_at__isnull=True)
            .order_by("id")
        )
        if len(candidates) < 2:
            continue
        target = next((c for c in candidates if c.name.lower() == group.target.lower()), None)
        if target is None:
            target = min(
                candidates,
                key=lambda c: (c.status != IngredientStatusChoices.VERIFIED, -(c.usage_count or 0), c.id),
            )
            if apply:
                Ingredient.objects.filter(id=target.id).update(name=group.target)
                target.name = group.target
        for source in candidates:
            if source.id == target.id:
                continue
            result.changed += 1
            result.messages.append(f"#{source.id} „{source.name}“ → #{target.id} „{group.target}“")
            if apply:
                merge_ingredient(source, target)
    return result


def fill_missing_prices(*, apply: bool) -> StepResult:
    """Set curated prices on ingredients that have none."""
    result = StepResult()
    queryset = Ingredient.objects.annotate(_lname=Lower("name")).filter(
        _lname__in=MISSING_PRICES.keys(), price_per_kg__isnull=True, deleted_at__isnull=True
    )
    for ingredient in queryset:
        price = Decimal(MISSING_PRICES[ingredient.name.lower()])
        result.changed += 1
        result.messages.append(f"#{ingredient.id} {ingredient.name}: kein Preis → {price} €/kg")
        if apply:
            Ingredient.objects.filter(id=ingredient.id).update(price_per_kg=price)
    return result


def fix_nutrition(*, apply: bool) -> StepResult:
    """Apply curated reference values, then the deterministic repair rules, to the affected rows."""
    from django.utils import timezone

    from supply.services.nutri_service import calculate_nutri_score
    from supply.services.quality_score import calculate_ingredient_quality_score

    result = StepResult()
    now = timezone.now()
    reference_names = set(NUTRITION_REFERENCE)
    candidates = Ingredient.objects.annotate(_lname=Lower("name")).filter(deleted_at__isnull=True)
    for ingredient in candidates.select_related("retail_section").iterator(chunk_size=500):
        values = ingredient_nutrition_values(ingredient)
        changes: dict[str, float | None] = {}
        lname = ingredient.name.lower()
        if lname in reference_names:
            changes.update(
                {f: v for f, v in NUTRITION_REFERENCE[lname].items() if values.get(f) != v},
            )
        else:
            net_carbs = net_carbs_if_total(values, ingredient.name)
            codes = {issue.code for issue in detect_nutrition_issues(values, name=ingredient.name)}
            if net_carbs is not None:
                changes["carbohydrate_g"] = net_carbs
            elif codes & REPAIRABLE_ENERGY_ISSUES and "broken_import" not in codes:
                repaired = propose_deterministic_repair(values, name=ingredient.name)
                for field_name, value in repaired.items():
                    # Never invent an energy value from macros that were just flagged as unreliable.
                    if field_name in ENERGY_MACRO_FIELDS and value is not None and values.get(field_name) is not None:
                        changes[field_name] = value
        if not changes:
            continue
        result.changed += 1
        diff = ", ".join(f"{f}: {values.get(f)} → {v}" for f, v in changes.items())
        result.messages.append(f"#{ingredient.id} {ingredient.name}: {diff}")
        if apply:
            for name, value in changes.items():
                setattr(ingredient, name, value)
            ingredient.nutri_score, ingredient.nutri_class = calculate_nutri_score(ingredient)
            ingredient.quality_score = calculate_ingredient_quality_score(ingredient)
            ingredient.quality_score_updated_at = now
            ingredient.save(
                update_fields=[*changes, "nutri_score", "nutri_class", "quality_score", "quality_score_updated_at"]
            )
    return result


def publish_recipe_drafts(*, apply: bool) -> StepResult:
    """Verify system drafts used in recipes when they pass the publish gate; list the rest."""
    from supply.services.data_offensive import build_snapshot, publish_ingredients

    result = StepResult()
    used = list(
        Ingredient.objects.filter(
            status=IngredientStatusChoices.DRAFT,
            owner__isnull=True,
            deleted_at__isnull=True,
            portions__recipe_items__recipe__isnull=False,
            portions__recipe_items__recipe__deleted_at__isnull=True,
        )
        .distinct()
        .values_list("id", flat=True)
    )
    rows = build_snapshot(Ingredient.objects.filter(id__in=used))
    blocked = [row for row in rows if not row.publishable]
    for row in blocked:
        result.messages.append(f"#{row.id} {row.name}: bleibt Entwurf ({', '.join(row.issues)})")
    outcome = publish_ingredients(ids=used, apply=apply) if used else None
    result.changed = outcome.changed if outcome else 0
    result.messages.insert(0, f"In Rezepten genutzte System-Entwürfe: {len(used)}, freigabefähig: {result.changed}")
    return result


__all__ = [
    "StepResult",
    "fill_missing_prices",
    "fix_free_water_prices",
    "fix_nutrition",
    "merge_duplicate_groups",
    "publish_recipe_drafts",
]
