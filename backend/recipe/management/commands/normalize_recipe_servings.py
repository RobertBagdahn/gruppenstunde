"""Management command: normalize legacy recipes to portions=1.

Recipes store quantities for exactly one person (``portions=1``). Legacy rows
with ``portions > 1`` are ambiguous: some already hold per-person quantities,
others hold totals for ``portions`` people. The command classifies each recipe
by comparing its total weight with a plausible per-person weight range for its
recipe type:

  - ``per_person``: the stored weight fits one person → only set portions=1.
  - ``total``: the weight divided by portions fits one person → divide every
    RecipeItem quantity (including optional items and exchange alternatives)
    by portions, store the old portions as ``source_servings`` (if unset) and
    set portions=1.
  - ``review``: both or neither interpretation fit → left unchanged until the
    recipe is passed via ``--treat-as-total`` or ``--treat-as-per-person``.

RecipeStepIngredient.quantity_modifier is a relative factor of the item
quantity and therefore stays unchanged.

The command only reports by default; ``--apply`` writes the changes.
``--dry-run`` is accepted as an explicit spelling of the default.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from recipe.models import Recipe
from recipe.services.recipe_checks import recalculate_recipe_cache
from recipe.services.recipe_item_helpers import get_recipe_item_weight_g

PER_PERSON = "per_person"
TOTAL = "total"
REVIEW = "review"

# Plausible weight (g, drinks ~ml) of one person's serving per recipe type.
PER_PERSON_WEIGHT_RANGES_G: dict[str, tuple[float, float]] = {
    "warm_meal": (300.0, 800.0),
    "cold_meal": (250.0, 700.0),
    "breakfast": (150.0, 400.0),
    "dessert": (80.0, 300.0),
    "snack": (80.0, 300.0),
    "drink": (200.0, 400.0),
    "recipe_part": (50.0, 300.0),
}
UNKNOWN_TYPE_WEIGHT_RANGE_G = (150.0, 800.0)
SAUCE_WEIGHT_RANGE_G = (30.0, 120.0)
SAUCE_TITLE_PATTERN = re.compile(r"so(ß|ss)e|sauce|\bdip\b|dressing|aioli|creme|butter|aufstrich|pesto", re.IGNORECASE)
SAUCE_RECIPE_TYPES = {"recipe_part", ""}
# One interpretation must be at least 25 % closer to its range than the other.
DECISION_MARGIN = math.log(1.25)


@dataclass(frozen=True)
class ServingsClassification:
    category: str
    total_weight_g: float
    weight_if_total_g: float
    range_g: tuple[float, float]


def per_person_weight_range_g(recipe: Recipe) -> tuple[float, float]:
    """Plausible per-person weight for the recipe type; sauces and dips get a small range."""
    if recipe.recipe_type in SAUCE_RECIPE_TYPES and SAUCE_TITLE_PATTERN.search(recipe.title):
        return SAUCE_WEIGHT_RANGE_G
    return PER_PERSON_WEIGHT_RANGES_G.get(recipe.recipe_type, UNKNOWN_TYPE_WEIGHT_RANGE_G)


def recipe_base_weight_g(recipe: Recipe) -> float:
    """Weight of the default recipe; exchange alternatives and deleted portions are skipped like the cache does."""
    total = 0.0
    for item in recipe.recipe_items.all():
        if item.portion is not None and item.portion.deleted_at is not None:
            continue
        if item.exchange_group_id is not None and (item.exchange_position or 0) > 0:
            continue
        total += get_recipe_item_weight_g(item)
    return total


def _range_distance(weight_g: float, range_g: tuple[float, float]) -> float:
    low, high = range_g
    if weight_g <= 0:
        return math.inf
    if weight_g < low:
        return math.log(low / weight_g)
    if weight_g > high:
        return math.log(weight_g / high)
    return 0.0


def classify_recipe_servings(recipe: Recipe) -> ServingsClassification:
    """Classify whether a recipe with portions>1 stores per-person or total quantities."""
    portions = max(recipe.portions or 1, 1)
    total_weight_g = recipe_base_weight_g(recipe)
    range_g = per_person_weight_range_g(recipe)
    weight_if_total_g = total_weight_g / portions

    if total_weight_g <= 0:
        category = PER_PERSON
    else:
        distance_per_person = _range_distance(total_weight_g, range_g)
        distance_total = _range_distance(weight_if_total_g, range_g)
        if distance_per_person == 0 and distance_total == 0:
            category = REVIEW
        elif distance_total - distance_per_person >= DECISION_MARGIN:
            category = PER_PERSON
        elif distance_per_person - distance_total >= DECISION_MARGIN:
            category = TOTAL
        else:
            category = REVIEW

    return ServingsClassification(
        category=category,
        total_weight_g=total_weight_g,
        weight_if_total_g=weight_if_total_g,
        range_g=range_g,
    )


def normalize_recipe_to_one_portion(recipe: Recipe, *, quantities_are_total: bool) -> None:
    """Set portions=1; divide all item quantities first when they are totals for ``portions`` people."""
    portions = max(recipe.portions or 1, 1)
    update_fields = ["portions"]
    if quantities_are_total and portions > 1:
        for item in recipe.recipe_items.all():
            item.quantity = item.quantity / portions
            item.save(update_fields=["quantity"])
        if recipe.source_servings is None:
            recipe.source_servings = portions
            update_fields.append("source_servings")
    recipe.portions = 1
    recipe.save(update_fields=update_fields)
    recalculate_recipe_cache(recipe)


def _parse_ids(value: str | None, option: str) -> set[int]:
    if not value:
        return set()
    try:
        return {int(part) for part in value.split(",") if part.strip()}
    except ValueError as exc:
        raise CommandError(f"{option} expects comma-separated recipe ids, got {value!r}") from exc


class Command(BaseCommand):
    help = (
        "Normalize recipes with portions>1 to portions=1 using a recipe-type-aware weight check. "
        "Reports only unless --apply is given."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument("--apply", action="store_true", help="Write the changes to the database.")
        mode.add_argument("--dry-run", action="store_true", help="Only report planned changes (default).")
        parser.add_argument("--ids", default=None, help="Only process these recipe ids (comma-separated).")
        parser.add_argument(
            "--treat-as-total",
            default=None,
            help="Recipe ids whose quantities are totals for `portions` people (comma-separated).",
        )
        parser.add_argument(
            "--treat-as-per-person",
            default=None,
            help="Recipe ids whose quantities are already per person (comma-separated).",
        )

    def handle(self, *args, **options) -> None:
        apply: bool = options["apply"]
        only_ids = _parse_ids(options["ids"], "--ids")
        treat_as_total = _parse_ids(options["treat_as_total"], "--treat-as-total")
        treat_as_per_person = _parse_ids(options["treat_as_per_person"], "--treat-as-per-person")
        conflicting = treat_as_total & treat_as_per_person
        if conflicting:
            raise CommandError(f"Ids in both --treat-as-total and --treat-as-per-person: {sorted(conflicting)}")

        # all_objects: soft-deleted recipes must be normalized too before the portions=1 constraint.
        recipes = Recipe.all_objects.filter(portions__gt=1).prefetch_related(
            "recipe_items__portion__measuring_unit",
            "recipe_items__portion__ingredient",
            "recipe_items__ingredient",
        )
        if only_ids:
            recipes = recipes.filter(id__in=only_ids)
        recipes = recipes.order_by("id")
        found_ids = set(recipes.values_list("id", flat=True))

        unknown_override_ids = (treat_as_total | treat_as_per_person) - found_ids
        if unknown_override_ids:
            self.stdout.write(
                self.style.WARNING(f"Overrides ignored, no recipe with portions > 1: {sorted(unknown_override_ids)}")
            )

        prefix = "" if apply else "[DRY-RUN] "
        self.stdout.write(f"{prefix}Found {len(found_ids)} recipes with portions > 1")

        stats = {PER_PERSON: 0, TOTAL: 0, REVIEW: 0}
        for recipe in recipes:
            classification = classify_recipe_servings(recipe)
            category = classification.category
            source = "heuristic"
            if recipe.id in treat_as_total:
                category, source = TOTAL, "override"
            elif recipe.id in treat_as_per_person:
                category, source = PER_PERSON, "override"
            stats[category] += 1

            low, high = classification.range_g
            self.stdout.write(
                f"{prefix}{recipe.title} (id={recipe.id}, portions={recipe.portions}, type={recipe.recipe_type or '-'}) "
                f"→ {category} [{source}] "
                f"weight {classification.total_weight_g:.0f} g vs. "
                f"{classification.weight_if_total_g:.0f} g/person, range {low:.0f}–{high:.0f} g"
            )

            if category == REVIEW:
                self.stdout.write(
                    self.style.WARNING("  → left unchanged, decide via --treat-as-total/--treat-as-per-person")
                )
                continue
            if not apply:
                continue
            with transaction.atomic():
                normalize_recipe_to_one_portion(recipe, quantities_are_total=category == TOTAL)

        self.stdout.write(
            f"{prefix}Summary: {stats[PER_PERSON]} per person (portions=1 only), "
            f"{stats[TOTAL]} totals (quantities divided), {stats[REVIEW]} need review (unchanged)"
        )
        if not apply:
            self.stdout.write(self.style.WARNING("Dry run — no changes made. Use --apply to write."))
        else:
            self.stdout.write(self.style.SUCCESS("Done."))
