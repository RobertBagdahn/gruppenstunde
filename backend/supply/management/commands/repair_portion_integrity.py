"""Repair Portion/RecipeItem integrity across all recipes.

Runs, in strict order:
  1. Dedupe rank=1 portions (ingredients with >1 active rank=1 portion).
  2. Rebind RecipeItems referencing a soft-deleted portion onto the
     ingredient's current active rank=1 portion (gram amount preserved).
  3. AI-based plausibility check + automatic repair of unrealistic recipe
     quantities (fully automated, no manual approval — see design.md).
  4. Full cache recalculation for every recipe touched in steps 2/3.

See openspec change `fix-portion-integrity-and-ai-estimate`.
"""

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Repair Portion/RecipeItem integrity: dedupe rank=1, rebind dead portion refs, AI-repair implausible quantities."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing to the database.",
        )
        parser.add_argument(
            "--skip-ai-check",
            action="store_true",
            help="Skip step 3 (AI plausibility check) — useful for quick local dedupe/rebind-only runs.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        skip_ai_check = options["skip_ai_check"]

        # --- Step 1: Dedupe rank=1 portions ---------------------------------
        from supply.services.portion_integrity import dedupe_rank1_portions

        self.stdout.write("Step 1/4: Deduping rank=1 portions...")
        dedupe_changes = dedupe_rank1_portions(dry_run=dry_run)
        self.stdout.write(self.style.SUCCESS(f"  {len(dedupe_changes)} portion(s) demoted"))
        for change in dedupe_changes:
            self.stdout.write(
                f"    {change['ingredient_name']}: portion {change['demoted_portion_id']} "
                f"demoted to rank {change['demoted_to_rank']} (winner: {change['winner_portion_id']})"
            )

        # --- Step 2: Rebind dead portion references -------------------------
        from supply.services.portion_integrity import rebind_dead_portion_references

        self.stdout.write("Step 2/4: Rebinding RecipeItems on soft-deleted portions...")
        rebind_changes = rebind_dead_portion_references(dry_run=dry_run)
        self.stdout.write(self.style.SUCCESS(f"  {len(rebind_changes)} RecipeItem(s) rebound"))
        for change in rebind_changes:
            self.stdout.write(
                f"    RecipeItem {change['recipe_item_id']} (recipe {change['recipe_id']}): "
                f"portion {change['old_portion_id']} → {change['new_portion_id']}, "
                f"quantity {change['old_quantity']} → {change['new_quantity']}"
            )

        affected_recipe_ids = {c["recipe_id"] for c in rebind_changes}

        # --- Step 3: AI plausibility check + repair --------------------------
        if not skip_ai_check:
            from recipe.models import Recipe
            from recipe.services.ai_ingredients_service import RecipeQuantityEstimationService

            self.stdout.write("Step 3/4: AI plausibility check for all recipes...")
            service = RecipeQuantityEstimationService()
            checked = 0
            repaired = 0
            for recipe in Recipe.objects.filter(deleted_at__isnull=True).iterator():
                checked += 1
                if not service.is_implausible(recipe):
                    continue
                if dry_run:
                    self.stdout.write(
                        f"    [dry-run] Recipe '{recipe.title}' (id={recipe.id}) is implausible "
                        f"({service.compute_weight_per_portion_g(recipe):.0f}g/portion) — would repair",
                    )
                    repaired += 1
                    continue
                if service.check_and_repair_recipe(recipe, bypass_limits=True):
                    repaired += 1
                    affected_recipe_ids.add(recipe.id)
                    self.stdout.write(f"    Repaired recipe '{recipe.title}' (id={recipe.id})")
            self.stdout.write(self.style.SUCCESS(f"  Checked {checked} recipes, repaired {repaired}"))
        else:
            self.stdout.write("Step 3/4: skipped (--skip-ai-check)")

        # --- Step 4: Cache rebuild -------------------------------------------
        self.stdout.write(f"Step 4/4: Recalculating cache for {len(affected_recipe_ids)} affected recipe(s)...")
        if not dry_run:
            from recipe.models import Recipe
            from recipe.services.recipe_checks import recalculate_recipe_cache

            for recipe in Recipe.objects.filter(id__in=affected_recipe_ids):
                recalculate_recipe_cache(recipe)
        self.stdout.write(self.style.SUCCESS("Done."))
