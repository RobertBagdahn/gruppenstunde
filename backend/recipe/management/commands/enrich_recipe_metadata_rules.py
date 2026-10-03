"""
Enrich recipes with rule-based metadata estimation (no AI required).

Estimates execution_time and difficulty from ingredient count, step count,
and Cooklang metadata. Also triggers cache recalculation for prices.

Usage:
    uv run python manage.py enrich_recipe_metadata_rules
    uv run python manage.py enrich_recipe_metadata_rules --dry-run
    uv run python manage.py enrich_recipe_metadata_rules --all
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Enrich recipes with rule-based metadata (difficulty, execution_time) and recalculate caches."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show changes without saving.")
        parser.add_argument("--all", action="store_true", help="Process all recipes (not just Cooklang imports).")
        parser.add_argument(
            "--only-defaults",
            action="store_true",
            help='Only touch recipes still on the import default ("Einfach", "< 30 Min"); keeps curated values.',
        )
        parser.add_argument("--recalculate", action="store_true", help="Also recalculate price/nutrition caches.")

    def handle(self, **options):
        from content.choices import DifficultyChoices, ExecutionTimeChoices
        from recipe.models import Recipe

        dry_run = options["dry_run"]

        if options["all"]:
            qs = Recipe.objects.all()
        else:
            qs = Recipe.objects.filter(summary__startswith="Importiert aus Cooklang")

        if options["only_defaults"]:
            qs = qs.filter(difficulty=DifficultyChoices.EASY, execution_time=ExecutionTimeChoices.LESS_30)

        recipes = list(qs.prefetch_related("recipe_items__portion__ingredient"))
        self.stdout.write(f"Found {len(recipes)} recipes to process.")

        updated = 0
        for recipe in recipes:
            num_ingredients = recipe.recipe_items.count()
            description = recipe.description or ""
            step_count = len([line for line in description.split("\n") if line.strip()])

            # Ingredient count alone underrates long recipes; steps add effort too.
            effort = num_ingredients + step_count
            if effort <= 12:
                execution_time = ExecutionTimeChoices.LESS_30
            elif effort <= 20:
                execution_time = ExecutionTimeChoices.BETWEEN_30_60
            elif effort <= 30:
                execution_time = ExecutionTimeChoices.BETWEEN_60_90
            else:
                execution_time = ExecutionTimeChoices.MORE_90

            if effort <= 14:
                difficulty = DifficultyChoices.EASY
            elif effort >= 30:
                difficulty = DifficultyChoices.HARD
            else:
                difficulty = DifficultyChoices.MEDIUM

            changed = False
            if recipe.execution_time != execution_time:
                recipe.execution_time = execution_time
                changed = True
            if recipe.difficulty != difficulty:
                recipe.difficulty = difficulty
                changed = True

            if changed:
                if not dry_run:
                    recipe.save(update_fields=["execution_time", "difficulty"])
                updated += 1
                self.stdout.write(
                    f"  {'[DRY] ' if dry_run else ''}{recipe.title}: "
                    f"ingredients={num_ingredients}, steps={step_count} → "
                    f"time={execution_time}, diff={difficulty}"
                )

        self.stdout.write(self.style.SUCCESS(f"\n{updated} recipes {'would be ' if dry_run else ''}updated."))

        # Recalculate caches
        if options["recalculate"] and not dry_run:
            from recipe.services.recipe_checks import recalculate_recipe_cache

            self.stdout.write("Recalculating recipe caches...")
            for recipe in recipes:
                recalculate_recipe_cache(recipe)
            self.stdout.write(self.style.SUCCESS("  Done."))
