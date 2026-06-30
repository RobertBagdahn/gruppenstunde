from django.core.management.base import BaseCommand, CommandParser

from recipe.models import Recipe, RecipeItem


class Command(BaseCommand):
    help = "Validate recipe data for unrealistic quantities and fix them"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Apply fixes (default is dry-run)",
        )
        parser.add_argument(
            "--threshold",
            type=float,
            default=5000.0,
            help="Max realistic weight per person in grams (default: 5000)",
        )

    def handle(self, *args, **options) -> None:
        fix = options["fix"]
        threshold = options["threshold"]
        mode = "FIX" if fix else "DRY-RUN"

        self.stdout.write(f"\n{'=' * 60}")
        self.stdout.write(f"  Recipe Data Validation ({mode})")
        self.stdout.write(f"  Threshold: {threshold}g per person")
        self.stdout.write(f"{'=' * 60}\n")

        flagged_recipes = self._find_problematic_recipes(threshold)

        if not flagged_recipes:
            self.stdout.write(self.style.SUCCESS("No problematic recipes found."))
            return

        self.stdout.write(f"Found {len(flagged_recipes)} problematic recipe(s):\n")

        for recipe, total_weight, items in flagged_recipes:
            self._report_recipe(recipe, total_weight, items)

            if fix:
                self._fix_recipe(recipe, total_weight)

        self.stdout.write(f"\n{'=' * 60}")
        if fix:
            self.stdout.write(self.style.SUCCESS(f"Fixed {len(flagged_recipes)} recipe(s)."))
        else:
            self.stdout.write(
                self.style.WARNING(f"{len(flagged_recipes)} recipe(s) need attention. Run with --fix to correct.")
            )

    def _find_problematic_recipes(self, threshold: float) -> list[tuple[Recipe, float, list[tuple[str, float]]]]:
        results = []

        recipes = Recipe.objects.all()
        for recipe in recipes:
            items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")
            if not items.exists():
                continue

            problematic_items: list[tuple[str, float]] = []
            total_weight = 0.0

            for item in items:
                weight = float(item.quantity) * float(item.portion.weight_g)
                per_person = weight / max(recipe.portions, 1)
                total_weight += weight

                if per_person > threshold:
                    problematic_items.append((item.portion.ingredient.name, per_person))

            per_person_total = total_weight / max(recipe.portions, 1)
            if problematic_items or per_person_total > threshold:
                results.append((recipe, total_weight, problematic_items))

        return results

    def _report_recipe(self, recipe: Recipe, total_weight: float, items: list[tuple[str, float]]) -> None:
        per_person = total_weight / max(recipe.portions, 1)
        self.stdout.write(f"\n  Recipe: {recipe.title} (ID={recipe.id})")
        self.stdout.write(f"  Portions: {recipe.portions}")
        self.stdout.write(f"  Total weight: {total_weight:.0f}g")
        self.stdout.write(f"  Per person: {per_person:.0f}g")

        if items:
            self.stdout.write("  Problematic ingredients:")
            for name, weight_pp in items:
                self.stdout.write(f"    - {name}: {weight_pp:.0f}g per person")

    def _fix_recipe(self, recipe: Recipe, total_weight: float) -> None:
        # Estimate portions: assume 500-800g per person, use 650g as midpoint
        estimated_portions = max(1, round(total_weight / 650.0))
        old_portions = recipe.portions

        if estimated_portions != old_portions:
            recipe.portions = estimated_portions
            recipe.save(update_fields=["portions"])
            self.stdout.write(
                self.style.SUCCESS(
                    f"  FIXED: portions {old_portions} → {estimated_portions} "
                    f"(~{total_weight / estimated_portions:.0f}g per person)"
                )
            )
        else:
            self.stdout.write("  No fix needed (portions already reasonable)")
