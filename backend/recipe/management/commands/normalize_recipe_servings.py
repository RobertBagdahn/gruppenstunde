"""Management command: normalize all recipes to portions=1.

Classifies recipes with portions>1 into three categories using a weight
heuristic and normalizes them accordingly:
  - already_normalized: quantities look per-1-person → only set portions=1
  - total_quantities: quantities are totals → divide by portions, set portions=1
  - broken_data: per-person weights > 500g → flag for manual review
"""

from __future__ import annotations

import logging

from django.core.management.base import BaseCommand
from django.db import transaction

from recipe.models import Recipe
from recipe.services.recipe_checks import recalculate_recipe_cache

logger = logging.getLogger(__name__)


def _classify_recipe(recipe: Recipe) -> str:
    """Classify a recipe as already_normalized, total_quantities, or broken_data."""
    items = recipe.recipe_items.select_related("portion").all()
    if not items:
        return "already_normalized"

    weights_total: list[float] = []
    weights_per_person: list[float] = []

    for item in items:
        pw = item.portion.weight_g if item.portion else 0
        total_g = item.quantity * (pw or 1)
        weights_total.append(total_g)
        weights_per_person.append(total_g / recipe.portions)

    max_total = max(weights_total)
    avg_pp = sum(weights_per_person) / len(weights_per_person)
    max_pp = max(weights_per_person)

    if max_total < 200 and avg_pp < 30:
        return "already_normalized"
    if 10 <= max_pp <= 500:
        return "total_quantities"
    return "broken_data"


class Command(BaseCommand):
    help = "Normalize all recipes to portions=1 using weight-based heuristic."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show changes without modifying the database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]

        recipes = Recipe.objects.filter(portions__gt=1).prefetch_related(
            "recipe_items__portion"
        )
        total = recipes.count()
        self.stdout.write(f"Found {total} recipes with portions > 1\n")

        if total == 0:
            self.stdout.write(self.style.SUCCESS("Nothing to do."))
            return

        stats = {"already_normalized": 0, "total_quantities": 0, "broken_data": 0}

        for recipe in recipes:
            category = _classify_recipe(recipe)
            stats[category] += 1
            portions = recipe.portions

            self.stdout.write(
                f"\n{'[DRY-RUN] ' if dry_run else ''}"
                f"{recipe.title} (id={recipe.id}, portions={portions}) → {category}"
            )

            if category == "already_normalized":
                self.stdout.write(f"  → Set portions=1 (quantities unchanged)")
                if not dry_run:
                    recipe.portions = 1
                    recipe.save(update_fields=["portions"])

            elif category == "total_quantities":
                items = recipe.recipe_items.all()
                for item in items:
                    old_qty = item.quantity
                    new_qty = round(old_qty / portions, 4)
                    self.stdout.write(
                        f"  {item.id}: qty {old_qty:.4f} → {new_qty:.4f}"
                    )
                    if not dry_run:
                        item.quantity = new_qty
                        item.save(update_fields=["quantity"])

                self.stdout.write(f"  → Set portions=1")
                if not dry_run:
                    recipe.portions = 1
                    recipe.save(update_fields=["portions"])
                    recalculate_recipe_cache(recipe)

            elif category == "broken_data":
                self.stdout.write(
                    self.style.WARNING(
                        f"  ⚠ MANUAL REVIEW NEEDED — per-person weights too high"
                    )
                )
                # Still try to divide; better than leaving broken
                items = recipe.recipe_items.all()
                for item in items:
                    old_qty = item.quantity
                    new_qty = round(old_qty / portions, 4)
                    self.stdout.write(
                        f"  {item.id}: qty {old_qty:.4f} → {new_qty:.4f}"
                    )
                    if not dry_run:
                        item.quantity = new_qty
                        item.save(update_fields=["quantity"])

                if not dry_run:
                    recipe.portions = 1
                    recipe.save(update_fields=["portions"])
                    recalculate_recipe_cache(recipe)

        self.stdout.write(
            f"\n{'[DRY-RUN] ' if dry_run else ''}"
            f"Summary: {stats['already_normalized']} already normalized, "
            f"{stats['total_quantities']} divided, "
            f"{stats['broken_data']} broken (divided anyway)"
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry run — no changes made."))
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("\nDone."))
