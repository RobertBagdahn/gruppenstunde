"""Portable export/import of data offensive results (no AI costs in the target environment).

The package is keyed by slugs, so it applies to any environment that was
seeded from the same food fixtures (local, staging, production). Applying is
idempotent and respects manual retail section assignments in the target.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone

from content.choices import ContentStatus, LinkType
from supply.choices import RetailSectionSourceChoices
from supply.services.nutrition_plausibility import NUTRITION_FIELDS

PACKAGE_VERSION = 1
INGREDIENT_FIELDS: tuple[str, ...] = (
    *NUTRITION_FIELDS,
    "name",
    "description",
    "physical_viscosity",
    "nutri_score",
    "nutri_class",
    "quality_score",
    "retail_section_source",
    "ai_review_verdict",
    "ai_review_notes",
)
BATCH_SIZE = 500


def _json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dt.datetime):
        return value.isoformat()
    return value


def build_package(*, since: dt.datetime) -> dict[str, Any]:
    """Collect ingredient corrections, merges, deletions and recipe changes."""
    from content.models import ContentLink
    from recipe.models import Recipe
    from supply.models import Ingredient

    ingredients = []
    for ingredient in Ingredient.objects.select_related("retail_section").order_by("slug"):
        if ingredient.ai_reviewed_at is None and not ingredient.retail_section_source:
            continue
        entry = {name: _json_value(getattr(ingredient, name)) for name in INGREDIENT_FIELDS}
        entry["slug"] = ingredient.slug
        entry["status"] = ingredient.status
        entry["price_per_kg"] = _json_value(ingredient.price_per_kg)
        entry["retail_section"] = ingredient.retail_section.name if ingredient.retail_section else None
        entry["ai_reviewed_at"] = _json_value(ingredient.ai_reviewed_at)
        ingredients.append(entry)

    ct = ContentType.objects.get_for_model(Ingredient)
    slugs = dict(Ingredient.all_objects.values_list("id", "slug"))
    merges = [
        {"source": slugs[source_id], "target": slugs[target_id]}
        for source_id, target_id in ContentLink.objects.filter(
            source_content_type=ct, link_type=LinkType.DUPLICATE_MERGED, created_at__gte=since
        ).values_list("source_object_id", "target_object_id")
        if source_id in slugs and target_id in slugs
    ]
    merged_sources = {merge["source"] for merge in merges}
    deleted = sorted(
        slug
        for slug in Ingredient.all_objects.filter(deleted_at__gte=since).values_list("slug", flat=True)
        if slug not in merged_sources
    )

    recipes = Recipe.objects.all()
    return {
        "version": PACKAGE_VERSION,
        "generated_at": timezone.now().isoformat(),
        "since": since.isoformat(),
        "ingredients": ingredients,
        "merges": merges,
        "deleted_ingredients": deleted,
        "archived_recipes": sorted(
            recipes.filter(status=ContentStatus.ARCHIVED, updated_at__gte=since).values_list("slug", flat=True)
        ),
        "recipe_types": dict(recipes.exclude(status=ContentStatus.ARCHIVED).values_list("slug", "recipe_type")),
    }


@dataclass
class ApplyReport:
    ingredients_updated: int = 0
    ingredients_missing: int = 0
    merged: int = 0
    deleted: int = 0
    recipes_archived: int = 0
    recipe_types_changed: int = 0
    messages: list[str] = field(default_factory=list)


def apply_package(package: dict[str, Any], *, apply: bool) -> ApplyReport:
    """Apply an exported package. Dry-run unless ``apply`` is True."""
    from recipe.models import Recipe
    from supply.models import Ingredient, RetailSection
    from supply.services.data_offensive import soft_delete_ingredients
    from supply.services.ingredient_merge import IngredientMergeError, merge_ingredient

    if package.get("version") != PACKAGE_VERSION:
        raise ValueError(f"Unbekannte Paketversion: {package.get('version')}")

    report = ApplyReport()
    sections = {section.name: section for section in RetailSection.objects.all()}
    missing_sections = {entry["retail_section"] for entry in package["ingredients"]} - set(sections) - {None}
    if missing_sections:
        raise ValueError(f"Warengruppen fehlen (Migration 0017 ausführen): {sorted(missing_sections)}")

    with transaction.atomic():
        for merge in package["merges"]:
            source = Ingredient.objects.filter(slug=merge["source"]).first()
            target = Ingredient.objects.filter(slug=merge["target"]).first()
            if source is None or target is None:
                continue
            report.merged += 1
            if apply:
                try:
                    merge_ingredient(source, target)
                except IngredientMergeError as exc:
                    report.messages.append(f"Merge {merge['source']} → {merge['target']}: {exc}")

        delete_ids = list(
            Ingredient.objects.filter(slug__in=package["deleted_ingredients"]).values_list("id", flat=True)
        )
        if delete_ids:
            if apply:
                result = soft_delete_ingredients(ids=delete_ids)
                report.deleted = result.changed
                report.messages.extend(result.messages)
            else:
                report.deleted = len(delete_ids)

        by_slug = {entry["slug"]: entry for entry in package["ingredients"]}
        pending: list[Any] = []
        for ingredient in Ingredient.objects.filter(slug__in=by_slug):
            entry = by_slug[ingredient.slug]
            for name in INGREDIENT_FIELDS:
                if name == "retail_section_source":
                    continue
                setattr(ingredient, name, entry[name])
            price = entry["price_per_kg"]
            ingredient.price_per_kg = Decimal(str(price)) if price is not None else None
            ingredient.ai_reviewed_at = (
                dt.datetime.fromisoformat(entry["ai_reviewed_at"]) if entry["ai_reviewed_at"] else None
            )
            if ingredient.retail_section_source != RetailSectionSourceChoices.MANUAL:
                ingredient.retail_section = sections.get(entry["retail_section"]) if entry["retail_section"] else None
                ingredient.retail_section_source = entry["retail_section_source"]
            pending.append(ingredient)
        report.ingredients_updated = len(pending)
        report.ingredients_missing = len(by_slug) - len(pending)
        if apply:
            fields = [
                *[name for name in INGREDIENT_FIELDS],
                "price_per_kg",
                "ai_reviewed_at",
                "retail_section",
            ]
            for start in range(0, len(pending), BATCH_SIZE):
                Ingredient.objects.bulk_update(pending[start : start + BATCH_SIZE], fields)

        # Publish only system drafts that were published in the source environment.
        from supply.choices import IngredientStatusChoices
        from supply.services.ingredient_status import SYSTEM, set_ingredient_status

        for ingredient in pending:
            if (
                by_slug[ingredient.slug].get("status") == IngredientStatusChoices.VERIFIED
                and ingredient.status == IngredientStatusChoices.DRAFT
                and ingredient.owner_id is None
                and apply
            ):
                set_ingredient_status(ingredient, IngredientStatusChoices.VERIFIED, actor=SYSTEM)

        archived = Recipe.objects.filter(slug__in=package["archived_recipes"]).exclude(status=ContentStatus.ARCHIVED)
        report.recipes_archived = archived.count()
        if apply:
            archived.update(status=ContentStatus.ARCHIVED, updated_at=timezone.now())

        for recipe in Recipe.objects.filter(slug__in=package["recipe_types"]):
            recipe_type = package["recipe_types"][recipe.slug]
            if recipe.recipe_type != recipe_type:
                report.recipe_types_changed += 1
                if apply:
                    Recipe.objects.filter(slug=recipe.slug).update(recipe_type=recipe_type)

        if not apply:
            transaction.set_rollback(True)
    return report
